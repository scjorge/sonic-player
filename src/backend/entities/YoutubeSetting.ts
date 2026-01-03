import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'youtube_settings' })
export class YoutubeSetting {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'text', nullable: true })
    apiKey!: string | null;
}
