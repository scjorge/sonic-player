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

    // Migrar navidrome_settings
    try {
      console.log('Migrando navidrome_settings...');
      
      // Verifica se a coluna userId já existe
      const navidromeColumns = await queryRunner.query(
        `PRAGMA table_info(navidrome_settings)`
      );
      const hasNavidromeUserId = navidromeColumns.some((col: any) => col.name === 'userId');

      if (!hasNavidromeUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE navidrome_settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            baseUrl TEXT NOT NULL,
            user TEXT NOT NULL,
            password TEXT NOT NULL
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO navidrome_settings_new (id, userId, baseUrl, user, password)
          SELECT id, 'default-user-id', baseUrl, user, password
          FROM navidrome_settings
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE navidrome_settings`);
        await queryRunner.query(`ALTER TABLE navidrome_settings_new RENAME TO navidrome_settings`);

        // Criar índice único
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_navidrome_settings_userId ON navidrome_settings (userId)
        `);

        console.log('✅ navidrome_settings migrado com sucesso');
      } else {
        console.log('⏭️  navidrome_settings já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar navidrome_settings:', error);
    }

    // Migrar tag_groups
    try {
      console.log('Migrando tag_groups...');
      
      // Verifica se a coluna userId já existe
      const tagGroupsColumns = await queryRunner.query(
        `PRAGMA table_info(tag_groups)`
      );
      const hasTagGroupsUserId = tagGroupsColumns.some((col: any) => col.name === 'userId');

      if (!hasTagGroupsUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE tag_groups_new (
            id TEXT PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            name TEXT NOT NULL,
            prefix TEXT NOT NULL,
            items TEXT NOT NULL
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO tag_groups_new (id, userId, name, prefix, items)
          SELECT id, 'default-user-id', name, prefix, items
          FROM tag_groups
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE tag_groups`);
        await queryRunner.query(`ALTER TABLE tag_groups_new RENAME TO tag_groups`);

        // Criar índice único composto
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_tag_groups_userId_id ON tag_groups (userId, id)
        `);

        console.log('✅ tag_groups migrado com sucesso');
      } else {
        console.log('⏭️  tag_groups já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar tag_groups:', error);
    }

    // Migrar genres
    try {
      console.log('Migrando genres...');
      
      // Verifica se a coluna userId já existe
      const genresColumns = await queryRunner.query(
        `PRAGMA table_info(genres)`
      );
      const hasGenresUserId = genresColumns.some((col: any) => col.name === 'userId');

      if (!hasGenresUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE genres_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            name TEXT NOT NULL
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO genres_new (id, userId, name)
          SELECT id, 'default-user-id', name
          FROM genres
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE genres`);
        await queryRunner.query(`ALTER TABLE genres_new RENAME TO genres`);

        // Criar índice único composto
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_genres_userId_name ON genres (userId, name)
        `);

        console.log('✅ genres migrado com sucesso');
      } else {
        console.log('⏭️  genres já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar genres:', error);
    }

    // Migrar general_settings
    try {
      console.log('Migrando general_settings...');
      
      // Verifica se a coluna userId já existe
      const generalSettingsColumns = await queryRunner.query(
        `PRAGMA table_info(general_settings)`
      );
      const hasGeneralSettingsUserId = generalSettingsColumns.some((col: any) => col.name === 'userId');

      if (!hasGeneralSettingsUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE general_settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            navidromeSaveFormat TEXT NOT NULL
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO general_settings_new (id, userId, navidromeSaveFormat)
          SELECT id, 'default-user-id', navidromeSaveFormat
          FROM general_settings
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE general_settings`);
        await queryRunner.query(`ALTER TABLE general_settings_new RENAME TO general_settings`);

        // Criar índice único
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_general_settings_userId ON general_settings (userId)
        `);

        console.log('✅ general_settings migrado com sucesso');
      } else {
        console.log('⏭️  general_settings já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar general_settings:', error);
    }

    // Migrar audio_editor_state
    try {
      console.log('Migrando audio_editor_state...');
      
      // Verifica se a coluna userId já existe
      const audioEditorColumns = await queryRunner.query(
        `PRAGMA table_info(audio_editor_state)`
      );
      const hasAudioEditorUserId = audioEditorColumns.some((col: any) => col.name === 'userId');

      if (!hasAudioEditorUserId) {
        // Criar nova tabela temporária
        await queryRunner.query(`
          CREATE TABLE audio_editor_state_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId VARCHAR(255) NOT NULL,
            stateJson TEXT NOT NULL
          )
        `);

        // Copiar dados existentes
        await queryRunner.query(`
          INSERT INTO audio_editor_state_new (id, userId, stateJson)
          SELECT id, 'default-user-id', stateJson
          FROM audio_editor_state
        `);

        // Remover tabela antiga e renomear
        await queryRunner.query(`DROP TABLE audio_editor_state`);
        await queryRunner.query(`ALTER TABLE audio_editor_state_new RENAME TO audio_editor_state`);

        // Criar índice único
        await queryRunner.query(`
          CREATE UNIQUE INDEX IDX_audio_editor_state_userId ON audio_editor_state (userId)
        `);

        console.log('✅ audio_editor_state migrado com sucesso');
      } else {
        console.log('⏭️  audio_editor_state já possui coluna userId');
      }
    } catch (error) {
      console.error('Erro ao migrar audio_editor_state:', error);
    }

    await queryRunner.release();
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n⚠️  IMPORTANTE: Se você tinha configurações anteriores, elas foram atribuídas a "default-user-id".');
    console.log('   Você precisará reconfigurar as APIs do YouTube, Spotify, Navidrome, Tags, Gêneros, Template Navidrome e Editor de Áudio para cada usuário.');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrateSettings();
