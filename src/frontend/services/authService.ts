import { BACKEND_BASE_URL } from '../../core/config';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types/auth';

const API_URL = `${BACKEND_BASE_URL}/auth`;

class AuthService {
  private token: string | null = null;

  constructor() {
    // Carrega o token do localStorage ao inicializar
    this.token = localStorage.getItem('authToken');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao registrar');
    }

    const result: AuthResponse = await response.json();
    this.setToken(result.token);
    return result;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const result: AuthResponse = await response.json();
    this.setToken(result.token);
    return result;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      return null;
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar senha');
    }
  }

  async updateProfile(username?: string, email?: string): Promise<{ token: string; user: User }> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ username, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar perfil');
    }

    const result = await response.json();
    
    // Atualiza o token já que as informações do usuário mudaram
    this.setToken(result.token);
    
    return result;
  }

  async listUsers(): Promise<User[]> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao listar usuários');
    }

    return await response.json();
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar usuário');
    }

    return await response.json();
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const authService = new AuthService();
