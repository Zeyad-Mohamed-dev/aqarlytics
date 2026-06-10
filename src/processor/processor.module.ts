import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScrappingProcessor } from './scrapping.processor';
import { NotifyingProcessor } from './NotifiyingProcessor';
import { ScrapperModule } from 'src/scrapper/scrapper.module';
import { PostsModule } from 'src/posts/posts.module';
import { Logger } from '@nestjs/common';
import { RedisProvider } from 'src/providers/redis.provider';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scraping' }),
    BullModule.registerQueue({ name: 'notifying' }),
    ScrapperModule,
    PostsModule,
  ],
  providers: [
    ScrappingProcessor,
    NotifyingProcessor,
    Logger,
    RedisProvider
  ],
  exports: [
    BullModule.registerQueue({ name: 'scraping' }),
    BullModule.registerQueue({ name: 'notifying' }),
  ],
})
export class ProcessorModule {}