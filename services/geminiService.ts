import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestMetadata = async (filename: string, currentArtist?: string): Promise<AISuggestion | null> => {
  try {
    const prompt = `Analise este nome de arquivo de música e sugira metadados ID3 corretos (Título, Artista, Álbum, Ano, Gênero).
    Nome do arquivo: "${filename}".
    ${currentArtist ? `Dica de artista: ${currentArtist}` : ''}
    Se não conseguir determinar, deixe o campo em branco. Retorne apenas JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            album: { type: Type.STRING },
            year: { type: Type.STRING },
            genre: { type: Type.STRING },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AISuggestion;
    }
    return null;
  } catch (error) {
    console.error("Gemini Suggest Error:", error);
    return null;
  }
};