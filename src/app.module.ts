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
    ProcessorModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
