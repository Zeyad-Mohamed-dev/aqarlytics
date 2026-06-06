import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { ScrapperService } from "src/scrapper/scrapper.service";
@Injectable()
export class JobsService {
    constructor(
    @InjectQueue('scraping') private readonly scrapingQueue: Queue,
    private readonly scrapperService: ScrapperService
  ) {}

  async addScrapingJob(postUrl, trackers) {
    const job = await this.scrapingQueue.add('scraping', {
        postUrl,
        trackers, 
        platform: 'facebook'
    },
    {
      attempts: 3, // Retry up to 3 times on failure
      backoff: 5000 // Wait 5 seconds between retries
    }
    );
    Logger.log(`Added scraping job for ${postUrl} with ID ${job.id} and trackers ${JSON.stringify(trackers)}`);
    return job.id;
  }

  async addNotificationJob() {}
}