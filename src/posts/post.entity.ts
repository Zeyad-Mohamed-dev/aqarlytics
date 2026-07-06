import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from 'src/users/user.entity';
import { SocialMediaPlatform } from './types/social-media-platform';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column('simple-array', { nullable: true })
  comments: string[];

  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'post_trackers',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  trackers: User[];

  platform: SocialMediaPlatform;

  @Column({ type: 'enum', enum: ['pending', 'scraped', 'error'], default: 'pending' })
  status: 'pending' | 'scraped' | 'error';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}