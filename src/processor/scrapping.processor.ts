import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { BulkJobOptions } from "bullmq";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/providers/redis.provider";
import { ScrapperService } from "src/scrapper/scrapper.service";
import { FacebookComment } from "src/scrapper/types/FacebookComment";

@Processor('scraping', {
    concurrency: 1
})
export class ScrappingProcessor extends WorkerHost {

    constructor(private readonly scrapper: ScrapperService,
        private readonly logger: Logger,
        @InjectQueue('notifying') private readonly notificationQueue: Queue,
        @Inject(REDIS_CLIENT) private readonly redis: Redis) {
        super();
    }

    async process(job: Job, token?: string): Promise<any> {
        Logger.log(`Processing job ${job.id} for URL: ${job.data.postUrl}`);
        const email = process.env.FACEBOOK_EMAIL || '';
        const password = process.env.FACEBOOK_PASSWORD || '';
        const { comments } = await this.scrapper.scrapeFacebook(job.data.postUrl, email, password);

        if (!comments || comments.length === 0) {
            this.logger.log(`No comments found for URL: ${job.data.postUrl}`);
            return { status: 'no_comments' };
        }

        const postTrackerKey = `post:${job.data.postId || encodeURIComponent(job.data.postUrl)}:comments`;
        const pipeline = this.redis.pipeline();

        comments.forEach((comment: FacebookComment) => {
            pipeline.sadd(postTrackerKey, comment.id);  // Fix 1: add `id` to FacebookComment type
        });
        pipeline.expire(postTrackerKey, 60 * 60 * 24 * 7);

        // Fix 2: handle null from pipeline.exec()
        const pipelineResults = await pipeline.exec() ?? [];

        // Fix 3: explicit type guard instead of .filter(Boolean)
        const newNotificationJobs: { name: string; data: any; opts?: BulkJobOptions }[] = [];

        comments.forEach((comment, index) => {
            const entry = pipelineResults[index];
            if (!entry) return;

            const [err, result] = entry;
            if (err) {
                this.logger.error(`Error processing comment ${comment.id}: ${err.message}`);
                return;
            }
            if (result === 1) {
                newNotificationJobs.push({
                    name: 'new_comment',
                    data: {
                        postUrl: job.data.postUrl,
                        comment,
                        trackers: job.data.trackers,
                    },
                });
            }
        });

        if (newNotificationJobs.length > 0) {
            await this.notificationQueue.addBulk(newNotificationJobs);
            this.logger.log(`Added ${newNotificationJobs.length} new notification jobs for URL: ${job.data.postUrl}`);
        }

        return { status: 'done', newComments: newNotificationJobs.length };
    }
}