import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ScrapperService } from "src/scrapper/scrapper.service";

@Processor('scraping', {
    concurrency: 1
})
export class ScrappingProcessor extends WorkerHost {
    constructor(private readonly scrapper: ScrapperService) {
        super();    
    }
    process(job: Job, token?: string): Promise<any> {
        Logger.log(`Processing job ${job.id} for URL: ${job.data.postUrl}`);
        const email = process.env.FACEBOOK_EMAIL || '';
        const password = process.env.FACEBOOK_PASSWORD || '';
        return this.scrapper.scrapeFacebook(job.data.postUrl, email, password);
    }

}