import { audioTagger }  from './src/backend/utils/tagger';

audioTagger.write('downloads/G Perico Turn Up.flac', {comments: 'Teste de comentário'});
audioTagger.write('downloads/teste.mp3', {comments: 'Teste de comentário'});
// Exemplo de uso