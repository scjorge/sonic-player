import { AppDataSource } from '../utils/db';
import { GenreEntity } from '../entities/GenreEntity';

export const genresService = {
  async list() {
    const repo = AppDataSource.getRepository(GenreEntity);
    const entities = await repo.find({ order: { name: 'ASC' } });
    return entities.map((g) => g.name);
  },

  async add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const repo = AppDataSource.getRepository(GenreEntity);
    const exists = await repo.findOne({ where: { name: trimmed } });
    if (exists) return;
    const entity = repo.create({ name: trimmed });
    await repo.save(entity);
  },

  async remove(name: string) {
    const repo = AppDataSource.getRepository(GenreEntity);
    await repo.delete({ name });
  },
};
