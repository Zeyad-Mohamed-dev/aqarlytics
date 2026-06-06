import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // 👈 add
import { JobsScheduler } from './jobs.scheduler';  // 👈 add
import { PostsModule } from 'src/posts/posts.module';
import { JobsService } from './jobs.service';
import { BullModule } from '@nestjs/bullmq';
import { ScrappingProcessor } from 'src/processor/scrapping.processor';
import { RedisProvider } from 'src/providers/redis.provider';
import { ScrapperModule } from 'src/scrapper/scrapper.module';

@Module({
  imports: [
    PostsModule,
    ScrapperModule,
    ScheduleModule.forRoot(), // 👈 add
    BullModule.registerQueue(
      { name: 'scraping' },
      { name: 'notifying' },
    ),
  ],
  providers: [
    JobsService,
    JobsScheduler,      // 👈 add
    ScrappingProcessor,
    Logger,
    RedisProvider,
    // 👆 ScrapperService removed, it comes from ScrapperModule
  ],
  exports: [JobsService],
})
export class JobsModule {}