import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from 'src/posts/post.entity';
import { LocationDimension } from './location-dimension.entity';
import { PropertyType } from '../types/property-type.enum';

@Entity('demand_signals')
export class DemandSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => LocationDimension, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: LocationDimension | null;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @Column()
  commentId: string;

  @Column()
  commentAuthor: string;

  @Column({ nullable: true })
  commentAuthorUrl: string;

  @Column('text')
  commentContent: string;

  @Column({ nullable: true })
  commentTimestamp: string;

  @Column()
  interestScore: number;

  @Column('text')
  reason: string;

  @Column({ type: 'enum', enum: PropertyType, nullable: true })
  propertyType: PropertyType | null;

  @Column({ nullable: true })
  intentCategory: string;

  @Column({ type: 'timestamptz' })
  observedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
