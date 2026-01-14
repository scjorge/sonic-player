
import { TagGroup } from '../../types';
import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

// Group Tags storage functions - only via backend requests
export const getStoredGroups = async (): Promise<TagGroup[]> => {
  try {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/tag-groups`, { headers });
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
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/tag-groups`, {
      method: 'POST',
      headers,
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
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/tag-groups/${encodeURIComponent(updatedGroup.id)}`, {
      method: 'PUT',
      headers,
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
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/tag-groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
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
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/genres`, { headers });
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
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/genres`, {
      method: 'POST',
      headers,
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
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/genres/${encodeURIComponent(genre)}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao apagar gênero', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao apagar gênero', e);
  }
};
