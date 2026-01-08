import { Request, Response } from 'express';
import { generalSettingsService } from '../services/generalSettings';
import { NAVIDROME_SAVE_FORMAT_DEFAULT } from '../../core/config';


export async function getGeneralSettings(_req: Request, res: Response) {
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

export async function saveGeneralSettings(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.navidromeSaveFormat) {
    return res.status(400).json({ error: 'navidromeSaveFormat é obrigatório' });
  }

  const navidromeSaveFormat = typeof body.navidromeSaveFormat === 'string' && body.navidromeSaveFormat.trim()
    ? body.navidromeSaveFormat.trim()
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
