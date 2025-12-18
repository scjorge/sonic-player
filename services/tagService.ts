import { MusicFile, MusicMetadata } from '../types';
import { parseBuffer } from 'music-metadata'; 
import { ID3Writer } from 'browser-id3-writer';

// Helper to read tags using music-metadata
export const readTags = async (file: File): Promise<Partial<MusicFile>> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Parse the buffer instead of blob, hinting the mime-type
    const metadata = await parseBuffer(uint8Array, { mimeType: file.type });
    
    const common = metadata.common;
    
    let coverUrl = null;
    if (common.picture && common.picture.length > 0) {
      const picture = common.picture[0];
      const blob = new Blob([picture.data], { type: picture.format });
      coverUrl = URL.createObjectURL(blob);
    }

    // Helper to extract comment string safely
    const getComment = (comment: any): string => {
        if (!comment) return '';
        if (typeof comment === 'string') return comment;
        if (typeof comment === 'object' && comment.text) return comment.text;
        return '';
    };

    return {
      metadata: {
        title: common.title || '',
        artist: common.artist || '',
        album: common.album || '',
        year: common.year ? common.year.toString() : '',
        genre: common.genre && common.genre.length > 0 ? common.genre[0] : '',
        trackNumber: common.track && common.track.no ? common.track.no.toString() : '',
        comments: common.comment && common.comment.length > 0 ? getComment(common.comment[0]) : '',
      },
      coverUrl
    };
  } catch (error) {
    console.error("Error reading tags:", error);
    // Fallback if library fails or not installed properly in this context
    return {
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
        artist: '',
        album: '',
        year: '',
        genre: '',
        trackNumber: '',
        comments: '',
      },
      coverUrl: null
    };
  }
};

export const writeTagsAndDownload = async (musicFile: MusicFile, newCoverFile?: File | Blob) => {
  try {
    const arrayBuffer = await musicFile.file.arrayBuffer();
    const writer = new ID3Writer(arrayBuffer);

    const { metadata } = musicFile;

    if (metadata.title) writer.setFrame('TIT2', metadata.title);
    if (metadata.artist) writer.setFrame('TPE1', [metadata.artist]);
    if (metadata.album) writer.setFrame('TALB', metadata.album);
    if (metadata.year) {
      const yearInt = parseInt(metadata.year, 10);
      if (!isNaN(yearInt)) {
        writer.setFrame('TYER', yearInt);
      }
    }
    if (metadata.genre) writer.setFrame('TCON', [metadata.genre]);
    if (metadata.trackNumber) writer.setFrame('TRCK', metadata.trackNumber);
    
    if (metadata.comments) {
      writer.setFrame('COMM', {
        description: '',
        text: metadata.comments,
        language: 'eng'
      });
    }

    if (newCoverFile) {
        const coverBuffer = await newCoverFile.arrayBuffer();
        writer.setFrame('APIC', {
            type: 3, // cover front
            data: coverBuffer,
            description: 'Cover'
        });
    }

    writer.addTag();

    const taggedUrl = writer.getURL();
    const link = document.createElement('a');
    link.href = taggedUrl;
    link.download = musicFile.fileName; // Save with original name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(taggedUrl);

  } catch (error) {
    console.error("Error writing tags:", error);
    alert("Erro ao salvar o arquivo. Verifique se o formato é suportado (MP3).");
  }
};