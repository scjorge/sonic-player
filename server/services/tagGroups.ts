import { AppDataSource } from '../utils/db';
import { TagGroupEntity } from '../entities/TagGroupEntity';

export const tagGroupsService = {
  async list() {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const entities = await repo.find();
    return entities.map((g) => ({
      id: g.id,
      name: g.name,
      prefix: g.prefix,
      items: JSON.parse(g.items || '[]'),
    }));
  },

  async create(group: { id: string; name: string; prefix: string; items: string[] }) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const entity = repo.create({
      id: group.id,
      name: group.name,
      prefix: group.prefix,
      items: JSON.stringify(group.items || []),
    });
    await repo.save(entity);
    return group;
  },

  async update(id: string, group: { name: string; prefix: string; items: string[] }) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    const existing = await repo.findOne({ where: { id } });
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

  async remove(id: string) {
    const repo = AppDataSource.getRepository(TagGroupEntity);
    await repo.delete({ id });
  },
};
