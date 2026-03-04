import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { NavidromeSetting } from '../entities/Navidrome';
import { SpotifySetting } from '../entities/SpotifySetting';
import { TagGroupEntity } from '../entities/TagGroupEntity';
import { GenreEntity } from '../entities/GenreEntity';
import { YoutubeSetting } from '../entities/YoutubeSetting';
import { GeneralSettingsEntity } from '../entities/GeneralSettings';
import { AudioEditorStateEntity } from '../entities/AudioEditorState';
import { DATABASE_PATH } from '../config';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: DATABASE_PATH,
  entities: [User, NavidromeSetting, SpotifySetting, TagGroupEntity, GenreEntity, YoutubeSetting, GeneralSettingsEntity, AudioEditorStateEntity],
  synchronize: true,
  logging: false,
});
