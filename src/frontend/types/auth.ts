export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}
