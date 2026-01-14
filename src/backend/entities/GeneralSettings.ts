import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'general_settings' })
@Index(['userId'], { unique: true })
export class GeneralSettingsEntity {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'varchar', length: 255 })
    userId!: string;

  @Column({ type: 'text' })
    navidromeSaveFormat!: string;
}
