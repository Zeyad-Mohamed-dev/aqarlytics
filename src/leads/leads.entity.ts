import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    profileUrl: string;

    @Column()
    postUrl: string;

    @Column('text')
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}