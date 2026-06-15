import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScrappingProcessor } from './scrapping.processor';
import { NotifyingProcessor } from './NotifiyingProcessor';
import { ScrapperModule } from 'src/scrapper/scrapper.module';
import { PostsModule } from 'src/posts/posts.module';
import { Logger } from '@nestjs/common';
import { RedisProvider } from 'src/providers/redis.provider';
import { NotificationModule } from 'src/notification/notification.module';
import { AnalyzerModule } from 'src/analyzer/analyzer.module';
import { LLM_PROVIDER } from 'src/analyzer/providers/llm-provider.interface';
import { AnalyzerService } from 'src/analyzer/analyzer.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scraping' }),
    BullModule.registerQueue({ name: 'notifying' }),
    ScrapperModule,
    PostsModule,
    AnalyzerModule,
    NotificationModule
  ],
  providers: [
    ScrappingProcessor,
    NotifyingProcessor,
    Logger,
    AnalyzerService,
    RedisProvider
  ],
  exports: [
    BullModule.registerQueue({ name: 'scraping' }),
    BullModule.registerQueue({ name: 'notifying' }),
  ],
})
export class ProcessorModule {}