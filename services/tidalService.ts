import { getTidalCredentials, saveTidalCredentials } from './data';

export const tidalService = {
  getCredentials: () => {
    return getTidalCredentials();
  },
  saveCredentials: (creds: { clientId: string; clientSecret?: string }) => {
    saveTidalCredentials(creds);
  },
  clearCredentials: () => {
    saveTidalCredentials({ clientId: '', clientSecret: '' });
  }
};
