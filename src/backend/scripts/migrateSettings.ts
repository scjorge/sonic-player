import { AppDataSource } from '../utils/db';

async function migrateSettings() {
  try {
    await AppDataSource.initialize();
    console.log('Conexão com banco de dados estabelecida');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('Iniciando migração das configurações...');

    // Migrar youtube_settings
    try {
      console.log('Migrando youtube_settings...');
      
      // Verifica se a coluna userId já existe
      const youtubeColumns = await queryRunner.query(
        `PRAGMA table_info(youtube_settings)`
      );
      const hasYoutubeUserId = youtubeColumns.some((col: any) => col.name === 'userId');

      if (!hasYoutubeUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE youtube_settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            apiKey TEXT
          )
        `);

        // Copiar dados existentes (assumindo primeiro usuário criado)
        // Você precisará ajustar isso se quiser atribuir a um usuário específico
        await queryRunner.query(`
          INSERT INTO youtube_settings_new (id, userId, apiKey)
          SELECT id, 'default-user-id', apiKey
          FROM youtube_settings
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE youtube_settings`);
        await queryRunner.query(`ALTER TABLE youtube_settings_new RENAME TO youtube_settings`);

        // Criar índice único
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_youtube_settings_userId ON youtube_settings (userId)
        `);

        console.log('✅ youtube_settings migrado com sucesso');
      } else {
        console.log('⏭️  youtube_settings já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar youtube_settings:', error);
    }

    // Migrar spotify_settings
    try {
      console.log('Migrando spotify_settings...');
      
      // Verifica se a coluna userId já existe
      const spotifyColumns = await queryRunner.query(
        `PRAGMA table_info(spotify_settings)`
      );
      const hasSpotifyUserId = spotifyColumns.some((col: any) => col.name === 'userId');

      if (!hasSpotifyUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE spotify_settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            clientId TEXT,
            clientSecret TEXT,
            redirectUri TEXT,
            accessToken TEXT,
            refreshToken TEXT,
            expiresAt BIGINT
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO spotify_settings_new (id, userId, clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt)
          SELECT id, 'default-user-id', clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt
          FROM spotify_settings
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE spotify_settings`);
        await queryRunner.query(`ALTER TABLE spotify_settings_new RENAME TO spotify_settings`);

        // Criar índice único
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_spotify_settings_userId ON spotify_settings (userId)
        `);

        console.log('✅ spotify_settings migrado com sucesso');
      } else {
        console.log('⏭️  spotify_settings já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar spotify_settings:', error);
    }

    await queryRunner.release();
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n⚠️  IMPORTANTE: Se você tinha configurações anteriores, elas foram atribuídas a "default-user-id".');
    console.log('   Você precisará reconfigurar as APIs do YouTube e Spotify para cada usuário.');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrateSettings();
