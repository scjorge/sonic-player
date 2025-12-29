
export interface DownloadedCover {
    buffer: Buffer;
    mime:  string | 'image/jpeg' | 'image/png';
}

export interface AudioMetadata {
    title?: string;
    artists?: string;
    album?: string;
    albumArtist?: string;
    year?: number;
    trackNumber?: number;
    discNumber?: number;
    genre?: string;
    label?: string;
    isrc?: string;
    comments?: string;
    cover?: DownloadedCover;
}
