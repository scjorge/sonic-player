import { DataSource } from 'typeorm';
import { NavidromeSetting } from '../entities/NavidromeSetting';
import { SpotifySetting } from '../entities/SpotifySetting';
import { TagGroupEntity } from '../entities/TagGroupEntity';
import { GenreEntity } from '../entities/GenreEntity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || '/app/database.sqlite',
  entities: [NavidromeSetting, SpotifySetting, TagGroupEntity, GenreEntity],
  synchronize: true,
  logging: false,
});
