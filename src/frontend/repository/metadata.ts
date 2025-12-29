
import { TagGroup } from '../../../types';
import { BACKEND_BASE_URL } from '../../core/config';

// Group Tags storage functions - only via backend requests
export const getStoredGroups = async (): Promise<TagGroup[]> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao buscar grupos do backend', res.status, errText);
      return [];
    }
    const groups: TagGroup[] = await res.json();
    return groups;
  } catch (e) {
    console.error('Erro ao buscar grupos do backend', e);
    return [];
  }
};

export const addStoredGroup = async (group: TagGroup): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao criar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao criar grupo', e);
  }
};

export const updateStoredGroup = async (updatedGroup: TagGroup): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups/${encodeURIComponent(updatedGroup.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: updatedGroup.name,
        prefix: updatedGroup.prefix,
        items: updatedGroup.items,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao atualizar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao atualizar grupo', e);
  }
};

export const deleteStoredGroup = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao apagar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao apagar grupo', e);
  }
};


// Genre list storage functions - only via backend requests
export const getStoredGenres = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao buscar gêneros do backend', res.status, errText);
      return [];
    }
    const genres: string[] = await res.json();
    return genres;
  } catch (e) {
    console.error('Erro ao buscar gêneros do backend', e);
    return [];
  }
};

export const addStoredGenre = async (genre: string): Promise<void> => {
  const value = genre.trim();
  if (!value) return;

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao criar gênero', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao criar gênero', e);
  }
};

export const deleteStoredGenre = async (genre: string): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres/${encodeURIComponent(genre)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao apagar gênero', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao apagar gênero', e);
  }
};
