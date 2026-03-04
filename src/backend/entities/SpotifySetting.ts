import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'spotify_settings' })
@Index(['userId'], { unique: true })
export class SpotifySetting {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text', nullable: true })
    clientId!: string | null;

  @Column({ type: 'text', nullable: true })
    clientSecret!: string | null;

  @Column({ type: 'text', nullable: true })
    redirectUri!: string | null;

  @Column({ type: 'text', nullable: true })
    accessToken!: string | null;

  @Column({ type: 'text', nullable: true })
    refreshToken!: string | null;

  @Column({ type: 'bigint', nullable: true })
    expiresAt!: number | null;
}
