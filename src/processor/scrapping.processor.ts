import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/providers/redis.provider";
import { ScrapperService } from "src/scrapper/scrapper.service";
import { AnalyzerService } from "src/analyzer/analyzer.service";
import { LeadsService } from "src/leads/leads.service";
import { FacebookComment } from "src/scrapper/types/FacebookComment";
import { ListingExtractorService } from "src/analytics/services/ListingExtractorService";

@Processor('scraping', {
    concurrency: 1
})
export class ScrappingProcessor extends WorkerHost {

    constructor(
        private readonly scrapper: ScrapperService,
        private readonly analyzer: AnalyzerService,
        private readonly leadsService: LeadsService,
        private readonly listingExtractorService: ListingExtractorService,
        private readonly logger: Logger,
        @InjectQueue('notifying') private readonly notificationQueue: Queue,
        @Inject(REDIS_CLIENT) private readonly redis: Redis
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

        for (const tracker of job.data.trackers) {
            const trackerKey = `post:${job.data.postId || encodeURIComponent(job.data.postUrl)}:tracker:${tracker.id}:comments`;
            const pipeline = this.redis.pipeline();

            comments.forEach((comment: FacebookComment) => {
                pipeline.sadd(trackerKey, comment.id);
            });
            pipeline.expire(trackerKey, 60 * 60 * 24 * 7);

            const results = await pipeline.exec() ?? [];
            const newComments: FacebookComment[] = [];

            comments.forEach((comment, index) => {
                const entry = results[index];
                if (!entry) return;
                const [err, result] = entry;
                if (!err && result === 1) {
                    newComments.push(comment);
                }
            });

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
