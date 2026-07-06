import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // 👈 add
import { JobsScheduler } from './jobs.scheduler';  // 👈 add
import { PostsModule } from 'src/posts/posts.module';
import { JobsService } from './jobs.service';
import { BullModule } from '@nestjs/bullmq';
import { ScrappingProcessor } from 'src/processor/scrapping.processor';
import { ScrapperModule } from 'src/scrapper/scrapper.module';

@Module({
  imports: [
    PostsModule,
    ScrapperModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: 'scraping' },
      { name: 'notifying' },
      { name: 'classify-content'}
    ),
  ],
  providers: [
    JobsService,
    JobsScheduler,     
    // ScrappingProcessor,
    Logger,
  ],
  exports: [JobsService],
})
export class JobsModule {}
