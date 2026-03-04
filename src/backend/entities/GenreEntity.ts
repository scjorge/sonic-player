import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'genres' })
@Index(['userId', 'name'], { unique: true })
export class GenreEntity {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text' })
    name!: string;
}
