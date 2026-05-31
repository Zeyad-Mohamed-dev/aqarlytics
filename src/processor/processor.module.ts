import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'scraping',
        }),
        BullModule.registerQueue({
            name: 'notifying',
        })
    ]
    ,
    providers: [],
    exports: [
        BullModule.registerQueue({ name: 'scraping' })
    ]
})
export class ProcessorModule {}
