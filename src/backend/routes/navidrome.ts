import { Router } from 'express';
import { getNavidromeSettings, saveNavidromeSettings, clearNavidromeSettings, search4, copyToUserDirectory, removeFiles } from '../controllers/navidrome';
import { authMiddleware } from '../middleware/auth';

const navidromeRouter = Router();

navidromeRouter.get('/', authMiddleware, getNavidromeSettings);
navidromeRouter.put('/', authMiddleware, saveNavidromeSettings);
navidromeRouter.delete('/', authMiddleware, clearNavidromeSettings);
navidromeRouter.get('/search4', search4);
navidromeRouter.post('/copy-to-user', authMiddleware, copyToUserDirectory);
navidromeRouter.post('/remove-files', authMiddleware, removeFiles);


export default navidromeRouter;
