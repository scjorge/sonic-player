import sqlite3 from 'sqlite3';
import { NAVIDROME_DATABASE_SQLITE_PATH } from '../../core/config';


function getDatabase() {
    return new sqlite3.Database(NAVIDROME_DATABASE_SQLITE_PATH);
}

async function execQuery(query: string, params: string[] | null): Promise<any> {
    const db = getDatabase()

    const row: any = await new Promise((resolve, reject) => {
        db.get(query, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    }).finally(() => {
        db.close();
    });

    return row;
}

export async function getPathById(id: string): Promise<string | null> {
    const query = 'SELECT path FROM media_file WHERE id = ?';
    const row = await execQuery(query, [id]);
    if (!row) {
        return null;
    }
    return row.path as string;
}
