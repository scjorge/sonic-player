import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'navidrome_settings' })
export class NavidromeSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  baseUrl!: string;

  @Column({ type: 'text' })
  user!: string;

  @Column({ type: 'text' })
  password!: string;
}
