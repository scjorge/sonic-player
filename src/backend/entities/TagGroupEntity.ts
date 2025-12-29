import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'tag_groups' })
export class TagGroupEntity {
  @PrimaryColumn({ type: 'text' })
    id!: string;

  @Column({ type: 'text' })
    name!: string;

  @Column({ type: 'text' })
    prefix!: string;

  // JSON-encoded array of items (strings)
  @Column({ type: 'text' })
    items!: string;
}
