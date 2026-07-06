import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    WASocket,
} from 'baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class WhatsappService implements OnModuleInit {
    
    private readonly logger = new Logger(WhatsappService.name);
    private socket: WASocket | null = null;
    private isReady: boolean = false;

    async onModuleInit() {
        await this.connect();
    }


    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_sessions');
        const { version } = await fetchLatestBaileysVersion();
        this.socket = makeWASocket({
            version,
            auth: state,
            logger: P({ level: 'silent' }), // suppress noise; swap to 'debug' if needed
            printQRInTerminal: true,         // QR printed to terminal on first run
        });

        this.socket.ev.on('creds.update', saveCreds);

        this.socket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'close') {
                this.isReady = false;
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                this.logger.warn(`Connection closed (${statusCode}). Reconnect: ${shouldReconnect}`);
                if (shouldReconnect) {
                    setTimeout(() => this.connect(), 5000); // retry after 5s
                }
            }

            if (connection === 'open') {
                this.isReady = true;
                this.logger.log('WhatsApp connected ✅');
            }
        })
    }

    async sendMessage(to: string, text: string): Promise<void>{
        if (!this.socket || !this.isReady) {
            throw new Error('WhatsApp socket not ready');
        }

        // Baileys JID format: "<phone>@s.whatsapp.net"
        const jid = `${to}@s.whatsapp.net`;
        await this.socket.sendMessage(jid, { text });
        this.logger.log(`Message sent to ${to}`);
    }
}