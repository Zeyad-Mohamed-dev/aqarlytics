import { Module } from '@nestjs/common';
import { WhatsappModule } from 'src/whatsapp/whatsapp-sender.module';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { WhatsappNotifier } from './notifiers/WhatsappNotifier';
import { NotificationService } from './notification.service';
import { TelegramNotifier } from './notifiers/TelegramNotifier';
import { TelegramModule } from 'src/telegram/telegram.module';
export const NOTIFIERS = 'NOTIFIERS';
@Module({
    imports: [
        WhatsappModule,
        TelegramModule
    ],
    exports: [NotificationService],
    providers: [
        WhatsappNotifier,
        NotificationService,
        TelegramNotifier,
        {
            provide: NOTIFIERS,
            useFactory: (whatsappNotifier: WhatsappNotifier, telegramNotifier: TelegramNotifier) => [whatsappNotifier, telegramNotifier],
            inject: [WhatsappNotifier, TelegramNotifier]
        }
    ]
})
export class NotificationModule {}
