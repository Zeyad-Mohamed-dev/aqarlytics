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
import { TransactionType } from '../types/transaction-type.enum';
import { FinishingLevel } from '../types/finishing-level.enum';

@Entity('market_observations')
export class MarketObservation {
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

  @Column({ type: 'enum', enum: PropertyType, nullable: true })
  propertyType: PropertyType | null;

  @Column({ type: 'enum', enum: TransactionType, nullable: true })
  transactionType: TransactionType | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  askingPrice: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  areaSqm: number | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'enum', enum: FinishingLevel, nullable: true })
  finishingLevel: FinishingLevel | null;

  @Column({ type: 'boolean', nullable: true })
  furnished: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryStatus: string | null;

  @Column({ type: 'int', nullable: true })
  floor: number | null;

  @Column({ default: 0 })
  extractorConfidence: number;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, any>;

  @Column({ type: 'timestamptz' })
  observedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
