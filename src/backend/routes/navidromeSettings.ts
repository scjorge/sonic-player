import { Router } from 'express';
import { getNavidromeSettings, saveNavidromeSettings, clearNavidromeSettings } from '../controllers/navidromeSettings';

const navidromeSettingsRouter = Router();

navidromeSettingsRouter.get('/', getNavidromeSettings);
navidromeSettingsRouter.put('/', saveNavidromeSettings);
navidromeSettingsRouter.delete('/', clearNavidromeSettings);

export default navidromeSettingsRouter;
