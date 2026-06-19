import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('location_dimensions')
@Index(['normalizedDistrict', 'normalizedCompound'], { unique: true })
export class LocationDimension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column({ type: 'varchar', nullable: true })
  compoundOrProject: string | null;

  @Column()
  normalizedCity: string;

  @Column()
  normalizedDistrict: string;

  @Column({ type: 'varchar', nullable: true })
  normalizedCompound: string | null;

  @Column({ type: 'jsonb', default: [] })
  aliases: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
