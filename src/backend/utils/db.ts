import { DataSource } from 'typeorm';
import { NavidromeSetting } from '../entities/Navidrome';
import { SpotifySetting } from '../entities/SpotifySetting';
import { TagGroupEntity } from '../entities/TagGroupEntity';
import { GenreEntity } from '../entities/GenreEntity';
import { YoutubeSetting } from '../entities/YoutubeSetting';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || '/app/database.sqlite',
  entities: [NavidromeSetting, SpotifySetting, TagGroupEntity, GenreEntity, YoutubeSetting],
  synchronize: true,
  logging: false,
});
