import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export class JobsService {
    constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
  ) {}

  async addScrapingJob(postUrl, trackers) {
    const job = await this.scrapingQueue.add('scrape', {
        postUrl,
        trackers,
        platform: 'facebook'
    },
    {
      attempts: 3, // Retry up to 3 times on failure
      backoff: 5000 // Wait 5 seconds between retries
    }
    );
    return job.id;
  }

  async addNotificationJob() {}
}