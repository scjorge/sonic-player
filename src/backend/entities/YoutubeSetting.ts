import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'youtube_settings' })
@Index(['userId'], { unique: true })
export class YoutubeSetting {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text', nullable: true })
    apiKey!: string | null;
}
