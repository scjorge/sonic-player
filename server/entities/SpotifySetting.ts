import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'spotify_settings' })
export class SpotifySetting {
  @PrimaryGeneratedColumn()
    id!: number;

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
