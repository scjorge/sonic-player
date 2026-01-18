import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'general_settings' })
export class GeneralSettingsEntity {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ type: 'text' })
    navidromeSaveFormat!: string;
}
