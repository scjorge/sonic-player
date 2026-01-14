import { BACKEND_BASE_URL } from '../../core/config';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types/auth';

const API_URL = `${BACKEND_BASE_URL}/auth`;

class AuthService {
  private token: string | null = null;
  private sessionPassword: string | null = null; // Senha em memória apenas para a sessão

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
    
    // Armazena a senha em memória para uso com Navidrome
    this.sessionPassword = credentials.password;
    
    return result;
  }

  logout() {
    this.token = null;
    this.sessionPassword = null; // Limpa a senha da memória
    localStorage.removeItem('authToken');
  }

  getCurrentUserSync(): User | null {
    if (!this.token) {
      return null;
    }

    try {
      // Decodifica o JWT token (payload é a segunda parte do token)
      const parts = this.token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      
      // Verifica se o token expirou
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logout();
        return null;
      }

      return {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        isActive: payload.isActive,
        createdAt: payload.createdAt,
      } as User;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
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
    // Sincroniza token com localStorage se necessário
    if (!this.token) {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        this.token = storedToken;
      }
    }
    
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token inválido ou expirado, faz logout
        this.logout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      // Tenta extrair a mensagem de erro do backend
      try {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao listar usuários');
      } catch (e) {
        throw new Error('Erro ao listar usuários');
      }
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

  async createUser(username: string, email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<User> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ username, email, password, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar usuário');
    }

    return await response.json();
  }

  async adminUpdateUser(userId: string, username?: string, email?: string): Promise<User> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ username, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar usuário');
    }

    return await response.json();
  }

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    if (!this.token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao resetar senha');
    }
  }

  getToken(): string | null {
    // Sincroniza com localStorage se necessário
    if (!this.token && localStorage.getItem('authToken')) {
      this.token = localStorage.getItem('authToken');
    }
    
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getSessionPassword(): string | null {
    return this.sessionPassword;
  }

  hasSessionPassword(): boolean {
    return !!this.sessionPassword;
  }
}

export const authService = new AuthService();
