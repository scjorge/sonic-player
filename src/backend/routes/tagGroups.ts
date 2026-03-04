import { Router } from 'express';
import { listTagGroups, createTagGroup, updateTagGroup, deleteTagGroup } from '../controllers/tagGroups';
import { authMiddleware } from '../middleware/auth';

const tagGroupsRouter = Router();

tagGroupsRouter.get('/', authMiddleware, listTagGroups);
tagGroupsRouter.post('/', authMiddleware, createTagGroup);
tagGroupsRouter.put('/:id', authMiddleware, updateTagGroup);
tagGroupsRouter.delete('/:id', authMiddleware, deleteTagGroup);

export default tagGroupsRouter;
