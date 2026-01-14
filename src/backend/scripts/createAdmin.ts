import { AppDataSource } from '../utils/db';
import { User } from '../entities/User';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    await AppDataSource.initialize();
    console.log('Database initialized');

    const userRepository = AppDataSource.getRepository(User);

    // Verifica se já existe algum usuário
    const userCount = await userRepository.count();

    if (userCount > 0) {
      console.log('Já existem usuários no sistema. Seed não será executado.');
      process.exit(0);
    }

    // Cria o usuário admin padrão
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@sonicplayer.com',
      password: adminPassword,
      role: 'admin',
      isActive: true
    });

    await userRepository.save(adminUser);

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    process.exit(1);
  }
}

createAdminUser();
