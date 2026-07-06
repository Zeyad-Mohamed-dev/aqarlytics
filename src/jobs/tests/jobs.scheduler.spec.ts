import { Test, TestingModule } from '@nestjs/testing';
import { JobsScheduler } from '../jobs.scheduler';
import { PostsService } from 'src/posts/posts.service';
import { JobsService } from '../jobs.service';
import { Post } from 'src/posts/post.entity';

describe('JobsScheduler (Integration)', () => {
  let scheduler: JobsScheduler;
  let postsService: PostsService;
  let jobsService: JobsService;

  // Mock Data

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        JobsScheduler,
        {
          provide: PostsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: JobsService,
          useValue: {
            addScrapingJob: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = moduleFixture.get<JobsScheduler>(JobsScheduler);
    postsService = moduleFixture.get<PostsService>(PostsService);
    jobsService = moduleFixture.get<JobsService>(JobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('scheduleJobs', () => {
    it('should successfully queue jobs for all found posts', async () => {
      // Arrange
      jest.spyOn(postsService, 'findAll').mockResolvedValue(mockPosts as Post[]);
      jest.spyOn(jobsService, 'addScrapingJob').mockResolvedValue(undefined); // assuming it returns void/Promise<void>

      // Act
      await scheduler.scheduleJobs();

      // Assert
      expect(postsService.findAll).toHaveBeenCalledTimes(1);
      expect(jobsService.addScrapingJob).toHaveBeenCalledTimes(2);
      expect(jobsService.addScrapingJob).toHaveBeenNthCalledWith(1, 'https://example.com/1', ['tracker1']);
      expect(jobsService.addScrapingJob).toHaveBeenNthCalledWith(2, 'https://example.com/2', ['tracker2', 'tracker3']);
    });

    it('should exit early if no posts are found', async () => {
      // Arrange
      jest.spyOn(postsService, 'findAll').mockResolvedValue([]);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await scheduler.scheduleJobs();

      // Assert
      expect(postsService.findAll).toHaveBeenCalledTimes(1);
      expect(jobsService.addScrapingJob).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('No posts found to schedule jobs for.');

      consoleLogSpy.mockRestore();
    });

    it('should continue processing other posts if one job fails to queue', async () => {
      // Arrange
      jest.spyOn(postsService, 'findAll').mockResolvedValue(mockPosts as Post[]);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // First call fails, second call succeeds
      jest.spyOn(jobsService, 'addScrapingJob')
        .mockRejectedValueOnce(new Error('Queue connection error'))
        .mockResolvedValueOnce(undefined);

      // Act
      await scheduler.scheduleJobs();

      // Assert
      expect(postsService.findAll).toHaveBeenCalledTimes(1);
      expect(jobsService.addScrapingJob).toHaveBeenCalledTimes(2); // Still attempts the second one!
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // Caught the error for the first post

      consoleErrorSpy.mockRestore();
    });
  });
});