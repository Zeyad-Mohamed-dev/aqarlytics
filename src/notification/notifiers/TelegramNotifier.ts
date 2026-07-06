// notification/telegram.notifier.ts
import { Injectable } from '@nestjs/common';
import { Notifier } from './notifier';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class TelegramNotifier extends Notifier {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  async notify(to: string, message: string): Promise<void> {
    await this.telegram.sendMessage(to, message);
  }
}