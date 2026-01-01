// import { audioTagger }  from './src/backend/utils/tagger';

// audioTagger.write('downloads/G Perico Turn Up.flac', {comments: 'Teste de comentário'});
// audioTagger.write('downloads/teste.mp3', {comments: 'Teste de comentário'});
// // Exemplo de uso

import {Shazam} from 'node-shazam'
const shazam = new Shazam()

const recognise = await shazam.recognise("downloads/Ultramagnetic MC's Ego Trippin'.flac", 'en-US', true )
console.log(recognise)