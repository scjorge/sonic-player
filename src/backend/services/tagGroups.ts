import { AppDataSource } from '../utils/db';
import { TagGroupEntity } from '../entities/TagGroupEntity';

export const tagGroupsService = {
  async list(userId: string) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const entities = await repo.find({ where: { userId } });
    return entities.map((g) => ({
      id: g.id,
      name: g.name,
      prefix: g.prefix,
      items: JSON.parse(g.items || '[]'),
    }));
  },

  async create(userId: string, group: { id: string; name: string; prefix: string; items: string[] }) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const entity = repo.create({
      id: group.id,
      userId,
      name: group.name,
      prefix: group.prefix,
      items: JSON.stringify(group.items || []),
    });
    await repo.save(entity);
    return group;
  },

  async update(userId: string, id: string, group: { name: string; prefix: string; items: string[] }) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const existing = await repo.findOne({ where: { userId, id } });
    if (!existing) return null;
    existing.name = group.name;
    existing.prefix = group.prefix;
    existing.items = JSON.stringify(group.items || []);
    await repo.save(existing);
    return {
      id,
      name: existing.name,
      prefix: existing.prefix,
      items: JSON.parse(existing.items || '[]'),
    };
  },

  async remove(userId: string, id: string) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    await repo.delete({ userId, id });
  },
};
