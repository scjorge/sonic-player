import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity({ name: 'tag_groups' })
@Index(['userId', 'id'], { unique: true })
export class TagGroupEntity {
  @PrimaryColumn({ type: 'text' })
    id!: string;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text' })
    name!: string;

  @Column({ type: 'text' })
    prefix!: string;

  // JSON-encoded array of items (strings)
  @Column({ type: 'text' })
    items!: string;
}
