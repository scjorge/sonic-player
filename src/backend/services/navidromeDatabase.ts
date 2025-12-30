import Database from 'better-sqlite3';
import { NAVIDROME_DATABASE_SQLITE_PATH } from '../../core/config';


const db = new Database(NAVIDROME_DATABASE_SQLITE_PATH, {
  readonly: true
});


export async function getPathById(id: string): Promise<string | null> {
  const sql = 'SELECT path FROM media_file WHERE id = ?';
  const rows = db.prepare(sql).all([id]);
  if (rows.length === 0) {
    return null;
  }
  return rows[0].path as string;
}


export function search4(comments: string[], genres: string[], artists: string[], years: string[], limit: number = 50, offset: number = 0): any {
  if(!comments.length && !genres.length && !artists.length && !years.length){
    return [];
  }

  const whereParts: string[] = [];
  const params: any[] = [];

  if (comments.length){
    whereParts.push(
      comments.map(() => `CAST(comment AS TEXT) LIKE ?`).join(' OR ')
    );
    params.push(...comments.map(c => `%${c}%`));
  }

  if (artists.length){
    whereParts.push(
      artists.map(() => `CAST(artist AS TEXT) LIKE ? OR CAST(title AS TEXT) LIKE ?`).join(' OR ')
    );
    params.push(...artists.map(a => `%${a}%`));
    params.push(...artists.map(a => `%${a}%`));
  }

  if (years.length){
    whereParts.push(
      years.map(() => `CAST(year AS TEXT) LIKE ?`).join(' OR ')
    );
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
    params.push(...genres.map(g => `%${g}%`));
  }

  const sql = `
    SELECT
      *
    FROM media_file
    WHERE
      (${whereParts.join(' AND ')})
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(params);
  return rows;
}

