import { Router } from 'express';
import { listTagGroups, createTagGroup, updateTagGroup, deleteTagGroup } from '../controllers/tagGroups';

const tagGroupsRouter = Router();

tagGroupsRouter.get('/', listTagGroups);
tagGroupsRouter.post('/', createTagGroup);
tagGroupsRouter.put('/:id', updateTagGroup);
tagGroupsRouter.delete('/:id', deleteTagGroup);

export default tagGroupsRouter;
