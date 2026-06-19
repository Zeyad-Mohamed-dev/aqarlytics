import { Post } from "src/posts/post.entity";
import { PostsService } from "src/posts/posts.service";
import { JobsService } from "./jobs.service";
import { Cron } from "@nestjs/schedule";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

@Injectable()
export class JobsScheduler implements OnModuleInit{
    constructor(private readonly postService: PostsService, private readonly jobService: JobsService) { }
    async onModuleInit() {
        Logger.log('Initializing Jobs Scheduler and scheduling initial jobs...');
        await this.scheduleJobs();
    }

    @Cron('0 */30 * * * *')
    async scheduleJobs() {
        const posts: Post[] = await this.postService.findAll();
        if (posts.length === 0) {
            console.log('No posts found to schedule jobs for.');
            return;
        }
        for (const post of posts) {
            try {
                await this.jobService.addScrapingJob(post.id, post.url, post.trackers);
            } catch (err) {
                console.error(`Failed to queue job for ${post.url}:`, err);
            }
        }

    }
}
