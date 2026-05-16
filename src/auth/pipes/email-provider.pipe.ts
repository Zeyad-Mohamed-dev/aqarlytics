import { PipeTransform, Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class EmailProviderValidationPipe implements PipeTransform {
  private allowedProviders = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'mail.com',
    'protonmail.com',
    'tutanota.com',
  ];

  transform(value: any) {
    const email: unknown = value?.email;
    if (typeof email !== 'string') return value;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !this.allowedProviders.includes(domain)) {
        Logger.warn(`Email provider validation failed for email: ${email}`);
      throw new BadRequestException(
        `Email provider is not allowed. Supported providers: ${this.allowedProviders.join(', ')}`,
      );
    }
    return value;
  }
}
