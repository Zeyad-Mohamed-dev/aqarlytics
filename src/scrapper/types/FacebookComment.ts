import { FacebookReply } from "./FacebookReply";

export interface FacebookComment {
  author: string;
  authorUrl: string;
  content: string;
  timestamp: string;
  replies: FacebookReply[];
}