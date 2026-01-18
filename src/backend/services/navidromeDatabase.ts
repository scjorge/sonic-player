import Database from 'better-sqlite3';
import { NAVIDROME_DATABASE_SQLITE_PATH, NAVIDROME_MEDIA_PATH } from '../config';
import path from 'path';


const db = getNaviDatabaseConnection();


function getNaviDatabaseConnection(): Database.Database | null {
  try {
    return new Database(NAVIDROME_DATABASE_SQLITE_PATH);
  } catch (error) {
    return null;
  }
}


function execQueryAll(sql: string, params: any[] = []): any[] {
  if (!db) return [];
  return db.prepare(sql).all(params);
}


export async function getPathById(id: string): Promise<string | null> {
  const sql = 'SELECT path, library_id FROM media_file WHERE id = ?';
  const rows = execQueryAll(sql, [id]);
  if (rows.length === 0) {
    return null;
  }
  const trackPath = rows[0].path as string;
  const trackLibraryID = rows[0].library_id as string;
  if (!trackPath) {
    throw new Error('Media file path not found in Navidrome database');
  }

  const sqlLibrary = 'SELECT path FROM library WHERE id = ?';
  const rowsLibrary = execQueryAll(sqlLibrary, [trackLibraryID]);
  if (rowsLibrary.length === 0) {
    return null;
  }
  let libraryPath = rowsLibrary[0].path as string;
  if (!libraryPath) {
    throw new Error('Media file path not found in Navidrome database');
  }
  libraryPath = libraryPath.replace(/\/music/,'');
  const fullPath = path.join(NAVIDROME_MEDIA_PATH, libraryPath, trackPath);
  return fullPath;
}

export function getByIds(ids: string[]): any[] {
  if (!db || ids.length === 0) return [];
  
  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT * FROM media_file WHERE id IN (${placeholders})`;
  return execQueryAll(sql, ids);
}


export function search4(comments: string[], genres: string[], artists: string[], years: string[], limit: number = 50, offset: number = 0, musicFolderId: string | number): any {
  if (!comments.length && !genres.length && !artists.length && !years.length) {
    return [];
  }

  const whereParts: string[] = [];
  const params: any[] = [];

  if (comments.length) {
    whereParts.push(
      comments.map(() => `CAST(comment AS TEXT) LIKE ?`).join(' OR ')
    );
    whereParts[whereParts.length - 1] = `(${whereParts[whereParts.length - 1]})`;
    params.push(...comments.map(c => `%${c}%`));
  }

  if (artists.length) {
    whereParts.push(
      artists.map(() => `CAST(artist AS TEXT) LIKE ? OR CAST(title AS TEXT) LIKE ?`).join(' OR ')
    );
    whereParts[whereParts.length - 1] = `(${whereParts[whereParts.length - 1]})`;
    params.push(...artists.map(a => `%${a}%`));
    params.push(...artists.map(a => `%${a}%`));
  }

  if (years.length) {
    whereParts.push(
      years.map(() => `CAST(year AS TEXT) LIKE ?`).join(' OR ')
    );
    whereParts[whereParts.length - 1] = `(${whereParts[whereParts.length - 1]})`;
    params.push(...years.map(y => `%${y}%`));
  }

  if (genres.length) {
    const genreWhere = genres.map(() => `
      EXISTS (
        SELECT 1
        FROM json_each(media_file.tags, '$.genre')
        WHERE json_each.value ->> '$.value' LIKE ?
      )
    `).join(' OR ');
    whereParts.push(`(${genreWhere})`);
    whereParts[whereParts.length - 1] = `(${whereParts[whereParts.length - 1]})`;
    params.push(...genres.map(g => `%${g}%`));
  }

  const sql = `
    SELECT
      *
    FROM media_file
    WHERE
      (${whereParts.join(' AND ')})
    AND library_id = ?
    LIMIT ? OFFSET ?
  `;
  params.push(musicFolderId, limit, offset);

  const rows = execQueryAll(sql, params);
  return rows;
}
