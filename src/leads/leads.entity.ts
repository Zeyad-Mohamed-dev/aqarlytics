import { UUID } from "crypto";

export class Lead {
    id: UUID;
    profileUrl: string;
    postUrl: string;
    comment: string;
    createdAt: Date;
}