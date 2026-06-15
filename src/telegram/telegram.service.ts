// telegram/telegram.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  onModuleInit() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
    this.logger.log('Telegram bot initialized ✅');
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await this.bot.sendMessage(chatId, text);
    this.logger.log(`Telegram message sent to ${chatId}`);
  }
}