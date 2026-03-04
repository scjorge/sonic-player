
import { TIDAL_CLIENT_ID, TIDAL_CLIENT_SECRET } from '../../core/config';

const TIDAL_AUTH_KEY = 'sonictag_tidal_auth';


export const getTidalCredentials = () => {
  try {
    const authData = localStorage.getItem(TIDAL_AUTH_KEY);

    const auth: any = authData ? JSON.parse(authData) : {};

    return {
      clientId: TIDAL_CLIENT_ID,
      clientSecret: TIDAL_CLIENT_SECRET,
      userId: auth.userId || '',
      countryCode: auth.countryCode || 'BR',
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt,
    };
  } catch (e) {
    console.error('Erro ao carregar Tidal do LocalStorage', e);
    return { clientId: '', clientSecret: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined };
  }
};

export const saveTidalCredentials = (creds: any) => {
  try {
    const { accessToken, refreshToken, expiresAt, countryCode, userId} = creds;

    // Save auth tokens separately
    if (accessToken && refreshToken && expiresAt) {
      localStorage.setItem(TIDAL_AUTH_KEY, JSON.stringify({ accessToken, refreshToken, expiresAt, countryCode, userId}));
    } else {
      localStorage.removeItem(TIDAL_AUTH_KEY);
    }
  } catch (e) {
    console.error('Erro ao salvar Tidal no LocalStorage', e);
  }
};
