import { audioTagger } from '../server/utils/tagger.js';


const data = await audioTagger.read('./downloads/02 - Soul Assassination.mp3');

console.log(data)