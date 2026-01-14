// APP
export const PREPARATION_PATH = process.env.PREPARATION_PATH || "/app/downloads";
export const DATABASE_PATH = process.env.DATABASE_PATH || "/app/database/sonicplayer.db";
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const JWT_EXPIRES_IN = '7d';

// NAVIDROME
export const NAVIDROME_MEDIA_PATH = process.env.NAVIDROME_MEDIA_PATH || "/app/downloads_navidrome";
export const NAVIDROME_DATABASE_SQLITE_PATH = process.env.NAVIDROME_DATABASE_SQLITE_PATH || "/app/navidrome_database/navidrome.db";
