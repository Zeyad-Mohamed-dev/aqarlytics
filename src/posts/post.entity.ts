import { User } from "src/users/user.entity";

export class Post {
    id: string;
    url: string;
    comments: string[];
    tracker: User;
}