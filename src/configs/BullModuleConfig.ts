import { BullModule } from "@nestjs/bullmq";

export const BullModuleConfig = {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    }
}
