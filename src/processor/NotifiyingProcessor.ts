import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PostsService } from "src/posts/posts.service";

@Processor('notifying') 
export class NotifyingProcessor extends WorkerHost {
    constructor(private readonly logger: Logger,
        private readonly postService: PostsService
    ) {
        super();
    }
    process(job: Job, token?: string): Promise<any> {
        const { comments, postUrl, tracker } = job.data;
        this.logger.log(`Processing notification job for post: ${postUrl} with ${comments.length} new comments`);
        comments.forEach((comment) => {
            console.log(tracker);
            this.logger.log(`New comment by ${comment.author}: ${comment.content}`);
        });
        // Here you would implement the actual notification logic, e.g. sending emails or push notifications
        // For demonstration, we just log the comments
        return Promise.resolve({ status: 'notifications_sent' });
    }
}