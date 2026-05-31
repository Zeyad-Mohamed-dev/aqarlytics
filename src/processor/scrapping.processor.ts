import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { data } from "node_modules/cheerio/dist/commonjs/api/attributes";
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
        const {comments} = await this.scrapper.scrapeFacebook(job.data.postUrl, email, password);
        if (!comments || comments.length === 0) {
            this.logger.log(`No comments found for URL: ${job.data.postUrl}`);
            return { status: 'no_comments' };
        }
        const postTrackerKey = `post:${job.data.postId || encodeURIComponent(job.data.postUrl)}:comments`;
        const pipeline = this.redis.pipeline();
        comments.forEach((comment: FacebookComment) => {
            pipeline.sadd(postTrackerKey, comment.id);
        });
        pipeline.expire(postTrackerKey, 60 * 60 * 24 * 7); // 7 days
        const pipelineResults = await pipeline.exec();
        const newNotificationJobs = comments.map((comment, index) => {
            const [err, result] = pipelineResults[index];
            if (err) {
                this.logger.error(`Error processing comment ${comment.id}: ${err.message}`);
                return;
            }
            // If result is 1, it means the comment ID was added to the set, indicating it's a new comment
            if (result === 1) {
                return {
                    name: 'new_comment',
                    data: {
                        postUrl: job.data.postUrl,
                        comment,
                        trackers: job.data.trackers,
                    },
                };
            }
            return null;
        }).filter(Boolean);
        if (newNotificationJobs.length > 0) {
            await this.notificationQueue.addBulk(newNotificationJobs);
            this.logger.log(`Added ${newNotificationJobs.length} new notification jobs for URL: ${job.data.postUrl}`);
        }
        return { status: 'done', newComments: newNotificationJobs.length };
    }
}