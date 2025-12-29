import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'genres' })
export class GenreEntity {
  @PrimaryGeneratedColumn()
    id!: number;

  @Index({ unique: true })
  @Column({ type: 'text' })
    name!: string;
}
