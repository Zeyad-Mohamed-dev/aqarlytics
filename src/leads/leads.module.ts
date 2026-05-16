import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';

@Module({
  providers: [LeadsService]
})
export class LeadsModule {}
