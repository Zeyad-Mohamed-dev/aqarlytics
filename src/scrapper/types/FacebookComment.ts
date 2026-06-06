import { FacebookReply } from "./FacebookReply";

export interface FacebookComment {
  id: string;
  author: string;
  authorUrl: string;
  content: string;
  timestamp: string;
  replies: FacebookReply[];
}