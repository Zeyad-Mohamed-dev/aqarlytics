import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationDimension } from './entities/location-dimension.entity';
import { MarketObservation } from './entities/market-observation';
import { DemandSignal } from './entities/demand-signals.entity';
import { ListingExtractorService } from './services/ListingExtractorService';
import { AnalyzerModule } from 'src/analyzer/analyzer.module';

@Module({
  imports: [
    AnalyzerModule,
    TypeOrmModule.forFeature([
      LocationDimension,
      MarketObservation,
      DemandSignal,
    ]),
  ],
  providers: [ListingExtractorService],
  exports: [TypeOrmModule, ListingExtractorService],
})
export class AnalyticsModule {}
