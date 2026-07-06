import { User } from "src/users/user.entity";

export class Agency {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    owner: User;
    email: string;
    password: string;
    sellers: User[];
}