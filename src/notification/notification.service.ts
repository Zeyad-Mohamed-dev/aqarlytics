import { Inject } from "@nestjs/common";
import { WhatsappNotifier } from "./notifiers/WhatsappNotifier";
import { TelegramNotifier } from "./notifiers/TelegramNotifier";

export class NotificationService {
    constructor(
        @Inject(WhatsappNotifier) private readonly whatsapp: WhatsappNotifier,
        @Inject(TelegramNotifier) private readonly telegram: TelegramNotifier
) {}

    async sendWhatsappNotification(to: string, message: string): Promise<void> {
        await this.whatsapp.notify(to, message);
    }

    async sendTelegramNotification(to: string, message: string): Promise<void> {
        // Implement Telegram notification logic here
        await this.telegram.notify(to, message);
    }
}