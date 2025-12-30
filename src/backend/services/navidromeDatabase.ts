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


export function getTrackByComment(comments: string[], limit: number = 50, offset: number = 0): any {
  const commentList = Array.isArray(comments) ? comments : [comments];
  const where = commentList.map(() => `CAST(comment AS TEXT) LIKE ?`).join(' OR ');
  const params = [
    ...commentList.map(c => `%${c}%`),
    limit,
    offset
  ];

  const sql = `
        SELECT
            *
        FROM
            media_file
        WHERE 
            ${where}
        ORDER BY id LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(sql).all(params);
  return rows;
}
