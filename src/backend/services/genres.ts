import { AppDataSource } from '../utils/db';
import { GenreEntity } from '../entities/GenreEntity';

export const genresService = {
  async list(userId: string) {
    const repo = AppDataSource.getRepository(GenreEntity);
    const entities = await repo.find({ where: { userId }, order: { name: 'ASC' } });
    return entities.map((g) => g.name);
  },

  async add(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const repo = AppDataSource.getRepository(GenreEntity);
    const exists = await repo.findOne({ where: { userId, name: trimmed } });
    if (exists) return;
    const entity = repo.create({ userId, name: trimmed });
    await repo.save(entity);
  },

  async remove(userId: string, name: string) {
    const repo = AppDataSource.getRepository(GenreEntity);
    await repo.delete({ userId, name });
  },
};
