import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'navidrome_settings' })
@Index(['userId'], { unique: true })
export class NavidromeSetting {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text' })
    baseUrl!: string;

  @Column({ type: 'text' })
    user!: string;

  @Column({ type: 'text' })
    password!: string;
}
