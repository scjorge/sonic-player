import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audio_editor_state' })
export class AudioEditorStateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  stateJson!: string;
}
