import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'scraping',
        }),
    ]
    ,
    providers: [],
    exports: [
        BullModule.registerQueue({ name: 'scraping' })
    ]
})
export class ProcessorModule {}
