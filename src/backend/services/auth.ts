import { AppDataSource } from '../utils/db';
import { User } from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(data: RegisterInput): Promise<AuthResponse> {
    // Verifica se o usuário já existe
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: data.username },
        { email: data.email }
      ]
    });

    if (existingUser) {
      if (existingUser.username === data.username) {
        throw new Error('Nome de usuário já está em uso');
      }
      throw new Error('Email já está em uso');
    }

    // Valida senha
    if (data.password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Cria o usuário
    const user = this.userRepository.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: 'user',
      isActive: true
    });

    await this.userRepository.save(user);

    // Gera o token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    // Busca o usuário
    const user = await this.userRepository.findOne({
      where: { username: data.username }
    });

    if (!user) {
      throw new Error('Usuário ou senha inválidos');
    }

    if (!user.isActive) {
      throw new Error('Usuário desativado');
    }

    // Verifica a senha
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Usuário ou senha inválidos');
    }

    // Gera o token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica a senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Valida nova senha
    if (newPassword.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres');
    }

    // Hash da nova senha
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Senha atualizada com sucesso' };
  }

  async listUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'isActive', 'createdAt']
    });

    return users;
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };
  }

  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN
    };
    
    return jwt.sign(payload, JWT_SECRET, options);
  }
}
