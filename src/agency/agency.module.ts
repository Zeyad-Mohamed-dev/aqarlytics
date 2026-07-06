import { Module } from '@nestjs/common';
import { AgencyService } from './agency.service';

@Module({
  providers: [AgencyService]
})
export class AgencyModule {}
