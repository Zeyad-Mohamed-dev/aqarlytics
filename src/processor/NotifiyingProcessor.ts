import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { NotificationService } from "src/notification/notification.service";
import { PostsService } from "src/posts/posts.service";

@Processor('notifying')
export class NotifyingProcessor extends WorkerHost {
    constructor(private readonly logger: Logger,
        private readonly postService: PostsService,
        private readonly notificationService: NotificationService
    ) {
        super();
    }
    process(job: Job, token?: string): Promise<any> {
        const { comments, postUrl, tracker } = job.data;
        this.logger.log(`Processing notification job for post: ${postUrl} with ${comments.length} new comments`);
        comments.forEach(async (comment) => {
            console.log(tracker);
            this.logger.log(`New comment by ${comment.author}: ${comment.content}`);
            await this.sendNotification(tracker.contact, `New comment on post ${postUrl} by ${comment.author}: ${comment.content}`, 'telegram');
        });
        // Here you would implement the actual notification logic, e.g. sending emails or push notifications
        // For demonstration, we just log the comments
        return Promise.resolve({ status: 'notifications_sent' });
    }

    private async sendNotification(to: string, message: string, type: 'whatsapp' | 'telegram'): Promise<void> {
        try {
            if (type === 'whatsapp') {
                await this.notificationService.sendWhatsappNotification(to, message);
            } else if (type === 'telegram') {
                await this.notificationService.sendTelegramNotification(to, message);
            }
        } catch (error) {
            this.logger.error(`Failed to send ${type} notification to ${to}: ${error.message}`);
        }
    }
}