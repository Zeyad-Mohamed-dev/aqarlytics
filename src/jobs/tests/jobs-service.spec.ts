import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken, BullModule } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsService } from '../jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let queueMock: jest.Mocked<Queue>;

  beforeEach(async () => {
    const mockQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getQueueToken('scraping'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    queueMock = module.get(getQueueToken('scraping'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // UNIT / INTEGRATION TESTS (WITH MOCKING)
  // ==========================================
  describe('addScrapingJob', () => {
    it('should push a job into the queue containing tracker user objects', async () => {
      // Arrange
      const postUrl = 'https://facebook.com/some-post';
      const mockTrackers = [
        { id: 'usr_1', name: 'Alice' },
        { id: 'usr_2', name: 'Bob' },
      ];
      const mockJobId = 'job_12345';

      queueMock.add.mockResolvedValue({ id: mockJobId } as any);

      // Act
      const result = await service.addScrapingJob(postUrl, mockTrackers);

      // Assert
      expect(result).toBe(mockJobId);
      expect(queueMock.add).toHaveBeenCalledWith(
        'scrape',
        {
          postUrl,
          trackers: mockTrackers,
          platform: 'facebook',
        },
        {
          attempts: 3,
          backoff: 5000,
        }
      );
    });
  });

  // ==========================================
  // E2E TESTS (REAL REDIS / NO MOCKING)
  // ==========================================
  describe('addScrapingJob (E2E / No Mocks)', () => {
    let e2eService: JobsService;
    let realQueue: Queue;
    let e2eModule: TestingModule;

    beforeAll(async () => {
      e2eModule = await Test.createTestingModule({
        imports: [
          BullModule.forRoot({
            connection: {
              host: 'localhost',
              port: 6379,
            },
          }),
          BullModule.registerQueue({
            name: 'scraping',
          }),
        ],
        providers: [JobsService],
      }).compile();

      e2eService = e2eModule.get<JobsService>(JobsService);
      realQueue = e2eModule.get<Queue>(getQueueToken('scraping'));
    });

    afterAll(async () => {
      if (realQueue) {
        await realQueue.drain();
        await realQueue.close();
      }
      await e2eModule.close();
    });

    it('should actually write the job payload to the real Redis queue', async () => {
      // Arrange
      const postUrl = 'https://facebook.com/e2e-test-post';
      const mockTrackers = [{ id: 'usr_999', name: 'Charlie' }];

      // Act
      const jobId = await e2eService.addScrapingJob(postUrl, mockTrackers);

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const physicalJob = await realQueue.getJob(jobId);

      expect(physicalJob).toBeDefined();
      expect(physicalJob?.name).toBe('scrape');
      expect(physicalJob?.data).toEqual({
        postUrl,
        trackers: mockTrackers,
        platform: 'facebook',
      });
      expect(physicalJob?.opts.attempts).toBe(3);
      expect(physicalJob?.opts.backoff).toEqual({
        type: 'fixed',
        delay: 5000,
      });
    });
  });
});