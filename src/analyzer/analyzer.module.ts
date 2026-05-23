import { Module } from '@nestjs/common';
import { AnalyzerService } from './analyzer.service';
import { LLM_PROVIDER } from './providers/llm-provider.interface';
import { GroqProvider } from './providers/GroqProvider';

@Module({
  providers: [AnalyzerService,
    {
      provide: LLM_PROVIDER,
      useClass: GroqProvider,
    }
  ]
})
export class AnalyzerModule {}
