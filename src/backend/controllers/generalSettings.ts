import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { generalSettingsService } from '../services/generalSettings';
import { NAVIDROME_SAVE_FORMAT_DEFAULT } from '../../core/config';


export async function getGeneralSettings(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const result = await generalSettingsService.getGeneralSettings();
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ id: e?.message || 'failed to get general settings' });
  }
}

export async function saveGeneralSettings(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Apenas admin pode salvar configurações gerais
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem editar configurações gerais' });
  }

  const body = req.body || {};
  if (!body.settings) {
    return res.status(400).json({ error: 'settings é obrigatório' });
  }

  const navidromeSaveFormat = typeof body.settings.navidromeSaveFormat === 'string' && body.settings.navidromeSaveFormat.trim()
    ? body.settings.navidromeSaveFormat.trim()
    : NAVIDROME_SAVE_FORMAT_DEFAULT;

  try {
    const result = await generalSettingsService.saveGeneralSettings(navidromeSaveFormat);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ id: e?.message || 'failed to save general settings' });
  }
}
