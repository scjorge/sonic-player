import { Router } from 'express';
import { getNavidromeSettings, saveNavidromeSettings, clearNavidromeSettings, search4 } from '../controllers/navidrome';

const navidromeRouter = Router();

navidromeRouter.get('/', getNavidromeSettings);
navidromeRouter.put('/', saveNavidromeSettings);
navidromeRouter.delete('/', clearNavidromeSettings);
navidromeRouter.get('/search4', search4);


export default navidromeRouter;
