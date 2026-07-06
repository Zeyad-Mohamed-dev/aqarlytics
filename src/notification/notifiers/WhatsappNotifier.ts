import { WhatsappService } from "src/whatsapp/whatsapp.service";
import { Notifier } from "./notifier";
import { Injectable } from "@nestjs/common";
@Injectable()
export class WhatsappNotifier extends Notifier {
    constructor(private readonly whatsapp: WhatsappService) {
        super();
    }
    
    async notify(to: string, message: string): Promise<void> {
        await this.whatsapp.sendMessage(to, message);
    }

}