import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AnalyzerService } from "src/analyzer/analyzer.service";
import { ScrapperService } from "src/scrapper/scrapper.service";

@Processor('classify-content')
export class ClassifyContentProcessor extends WorkerHost {
    
    constructor(
        private readonly analyzerService: AnalyzerService,
        private readonly scrapperService: ScrapperService,
    ) {
        super();
    }

    async process(job: Job, token?: string): Promise<any> {
        const { url } = job.data;
        Logger.log(`Processing classify content job for URL: ${url}`);
        const { postContent } = 
           await this.scrapperService.scrapeFacebook(
            url, process.env.FACEBOOK_EMAIL || '', process.env.FACEBOOK_PASSWORD || '');
        
        const isRealEstateRelated = await this.analyzerService.isRealEstateRelated(postContent);
        
        if (isRealEstateRelated) {
            Logger.log(`The content at ${url} is related to real estate.`);
        }
        else {
            Logger.error(`The content at ${url} is not related to real estate.`);
        }
    }
}