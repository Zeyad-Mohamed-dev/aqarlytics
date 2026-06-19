import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/response.interceptor';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { PostsModule } from './posts/posts.module';
import { AgencyModule } from './agency/agency.module';
import { ScrapperModule } from './scrapper/scrapper.module';
import { AnalyzerModule } from './analyzer/analyzer.module';
import { JobsModule } from './jobs/jobs.module';
import { BullModule } from '@nestjs/bullmq';
import { BullModuleConfig } from './configs/BullModuleConfig';
import { ProcessorModule } from './processor/processor.module';
import Redis from 'ioredis';
import { RedisProvider } from './providers/redis.provider';
import { WhatsappModule } from './whatsapp/whatsapp-sender.module';
import { NotificationModule } from './notification/notification.module';
import { TelegramService } from './telegram/telegram.service';
import { TelegramModule } from './telegram/telegram.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    LeadsModule,
    PostsModule,
    AgencyModule,
    ScrapperModule,
    AnalyzerModule,
    JobsModule,
    BullModule.forRoot(BullModuleConfig),
    ProcessorModule,
    WhatsappModule,
    NotificationModule,
    TelegramModule,
    AnalyticsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RedisProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    TelegramService,
  ],
})
export class AppModule {}
