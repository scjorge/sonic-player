import { DataSource } from 'typeorm';
import { NavidromeSetting } from '../entities/Navidrome';
import { SpotifySetting } from '../entities/SpotifySetting';
import { TagGroupEntity } from '../entities/TagGroupEntity';
import { GenreEntity } from '../entities/GenreEntity';
import { YoutubeSetting } from '../entities/YoutubeSetting';
import { GeneralSettingsEntity } from '../entities/GeneralSettings';
import { DATABASE_PATH } from '../../core/config';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: DATABASE_PATH,
  entities: [NavidromeSetting, SpotifySetting, TagGroupEntity, GenreEntity, YoutubeSetting, GeneralSettingsEntity],
  synchronize: true,
  logging: false,
});
