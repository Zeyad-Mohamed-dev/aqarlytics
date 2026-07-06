import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { ScrapperService } from "src/scrapper/scrapper.service";
import { AnalyzerService } from "src/analyzer/analyzer.service";
import { LeadsService } from "src/leads/leads.service";
import { FacebookComment } from "src/scrapper/types/FacebookComment";
import { ListingExtractorService } from "src/analytics/services/ListingExtractorService";
import { DemandSignalService } from "src/analytics/services/DemandSignalService";
import { RedisService } from "src/redis/redis.service";

@Processor('scraping', {
    concurrency: 1
})
export class ScrappingProcessor extends WorkerHost {

    constructor(
        private readonly scrapper: ScrapperService,
        private readonly analyzer: AnalyzerService,
        private readonly leadsService: LeadsService,
        private readonly listingExtractorService: ListingExtractorService,
        private readonly demandSignalService: DemandSignalService,
        private readonly redisService: RedisService,
        private readonly logger: Logger,
        @InjectQueue('notifying') private readonly notificationQueue: Queue,
    ) {
        super();
    }

    async process(job: Job, token?: string): Promise<any> {
        this.logger.log(`Processing job ${job.id} for URL: ${job.data.postUrl}`);

        const email = process.env.FACEBOOK_EMAIL || '';
        const password = process.env.FACEBOOK_PASSWORD || '';
        const { comments, postContent } = await this.scrapper.scrapeFacebook(job.data.postUrl, email, password);

        if (job.data.postId) {
            await this.listingExtractorService.extractAndPersist(
                job.data.postId,
                postContent,
                job.data.postUrl,
            );
        } else {
            this.logger.warn(`Skipping market observation extraction for job ${job.id} because postId is missing`);
        }

        if (!comments || comments.length === 0) {
            this.logger.log(`No comments found for URL: ${job.data.postUrl}`);
            return { status: 'no_comments' };
        }

        const newCommentsByTracker = new Map<string, FacebookComment[]>();
        const postCacheKey = job.data.postId || encodeURIComponent(job.data.postUrl);

        for (const tracker of job.data.trackers) {
            const newComments = await this.redisService.filterNewCommentsForTracker(
                postCacheKey,
                tracker.id,
                comments,
            );

            if (newComments.length > 0) {
                newCommentsByTracker.set(tracker.id, newComments);
            }
        }

        for (const [trackerId, newComments] of newCommentsByTracker) {
            const tracker = job.data.trackers.find((t: any) => t.id === trackerId);

            const interestedComments = await this.analyzer.analyzeComments(postContent, newComments);

            if (interestedComments.length === 0) {
                this.logger.log(`No interested comments for tracker ${trackerId}, skipping notification`);
                continue;
            }

            if (job.data.postId) {
                await this.demandSignalService.persistMany(job.data.postId, interestedComments);
            }

            for (const comment of interestedComments) {
                await this.leadsService.create({
                    profileUrl: comment.authorUrl,
                    postUrl: job.data.postUrl,
                    comment: comment.content,
                });
            }

            await this.notificationQueue.add('new_comments', {
                postUrl: job.data.postUrl,
                comments: interestedComments,
                tracker,
            });
            this.logger.log(`Added notification job for tracker ${trackerId} with ${interestedComments.length} interested comments`);
        }

        return { status: 'done', newComments: newCommentsByTracker.size };
    }
}
