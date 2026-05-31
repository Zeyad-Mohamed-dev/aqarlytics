import { Test, TestingModule } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ScrappingProcessor } from 'src/processor/scrapping.processor';
import { ScrapperService } from 'src/scrapper/scrapper.service';
import { REDIS_CLIENT } from 'src/providers/redis.provider';
import Redis from 'ioredis';

// Real Redis connection — make sure Redis is running on localhost:6379
const redisConnection = { host: 'localhost', port: 6379 };

describe('ScrappingProcessor → NotifyingQueue (e2e)', () => {
  let module: TestingModule;
  let scrapingQueue: Queue;
  let notifyingQueue: Queue;
  let redis: Redis;

  // Spy to capture what gets added to the notifying queue
  let notifyingWorker: Worker;
  const receivedNotificationJobs: Job[] = [];

  beforeAll(async () => {
    redis = new Redis(redisConnection);

    // Flush only our test keys so we start clean
    await redis.del('bull:scraping:*');
    await redis.del('bull:notifying:*');

    module = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: redisConnection }),
        BullModule.registerQueue({ name: 'scraping' }),
        BullModule.registerQueue({ name: 'notifying' }),
      ],
      providers: [
        ScrappingProcessor,
        {
          provide: ScrapperService,
          useValue: {
            scrapeFacebook: jest.fn().mockResolvedValue({
              postContent: 'Test post',
              postUrl: 'https://www.facebook.com/share/p/test/',
              comments: [
                {
                  id: 'comment-1',
                  author: 'Alice',
                  authorUrl: 'https://facebook.com/alice',
                  content: 'Great property!',
                  timestamp: '1w',
                  replies: [],
                },
                {
                  id: 'comment-2',
                  author: 'Bob',
                  authorUrl: 'https://facebook.com/bob',
                  content: 'Is it available?',
                  timestamp: '2d',
                  replies: [],
                },
              ],
            }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
        {
          provide: Logger,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    scrapingQueue = module.get<Queue>(getQueueToken('scraping'));
    notifyingQueue = module.get<Queue>(getQueueToken('notifying'));

    // Spin up a real worker on the notifying queue to consume the jobs
    // This proves the jobs are actually delivered and processable
    notifyingWorker = new Worker(
      'notifying',
      async (job: Job) => {
        receivedNotificationJobs.push(job);
        return { status: 'notifications_sent' };
      },
      { connection: redisConnection },
    );
  }, 30000);

  afterAll(async () => {
    await notifyingWorker.close();
    await scrapingQueue.obliterate({ force: true });
    await notifyingQueue.obliterate({ force: true });
    await redis.quit();
    await module.close();
  });

  // ------------------------------------------------------------------

  it('should add notification jobs to the notifying queue for new comments', async () => {
    // Add a real job to the scraping queue
    const job = await scrapingQueue.add('scrape_post', {
      postUrl: 'https://www.facebook.com/share/p/test/',
      postId: 'post-e2e-test',
      trackers: ['tracker-1'],
    });

    // Process it directly through the processor (bypass worker for speed)
    const result = await module
      .get<ScrappingProcessor>(ScrappingProcessor)
      .process(job as unknown as Job);

    expect(result).toEqual({ status: 'done', newComments: 2 });

    // Wait for the notifying queue to receive the jobs
    await new Promise(resolve => setTimeout(resolve, 1000));

    const waitingJobs = await notifyingQueue.getJobs(['waiting', 'completed', 'active']);
    expect(waitingJobs.length).toBeGreaterThanOrEqual(2);

    const jobNames = waitingJobs.map(j => j.name);
    expect(jobNames).toContain('new_comment');
  }, 15000);

  // ------------------------------------------------------------------

  it('should not re-enqueue notification jobs for already cached comments', async () => {
    // Run the same job a second time — Redis already has comment-1 and comment-2
    const job = await scrapingQueue.add('scrape_post', {
      postUrl: 'https://www.facebook.com/share/p/test/',
      postId: 'post-e2e-test',
      trackers: ['tracker-1'],
    });

    const result = await module
      .get<ScrappingProcessor>(ScrappingProcessor)
      .process(job as unknown as Job);

    // Both comments were already in Redis from the previous run
    expect(result).toEqual({ status: 'done', newComments: 0 });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Queue count should not have grown beyond the 2 from the first run
    const jobs = await notifyingQueue.getJobs(['waiting', 'completed', 'active']);
    expect(jobs.length).toBeLessThanOrEqual(2);
  }, 15000);

  // ------------------------------------------------------------------

  it('should deliver jobs that the notifying worker can actually process', async () => {
    // Wait for the worker to pick up the jobs from the first test
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(receivedNotificationJobs.length).toBeGreaterThanOrEqual(2);

    const firstJob = receivedNotificationJobs[0];
    expect(firstJob.name).toBe('new_comment');
    expect(firstJob.data).toMatchObject({
      postUrl: 'https://www.facebook.com/share/p/test/',
      trackers: ['tracker-1'],
      comment: expect.objectContaining({
        author: expect.any(String),
        content: expect.any(String),
      }),
    });
  }, 15000);
});