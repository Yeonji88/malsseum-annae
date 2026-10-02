import { TextToSpeech } from '@capacitor-community/text-to-speech';

const VOICE_INDEX = 254;
const SPEECH_RATE = 0.85;
const SPEECH_PITCH = 0.9;
let speechSession = 0;

window.malsseumNativeSpeak = async function(text) {
  const session = ++speechSession;
  await TextToSpeech.stop();

  if (session !== speechSession) return;

  return TextToSpeech.speak({
    text: text.trim().replace(/[.!?。！？]+$/, '') + '. 아멘.',
    lang: 'ko-KR',
    rate: SPEECH_RATE,
    pitch: SPEECH_PITCH,
    volume: 1.0,
    voice: VOICE_INDEX
  });
};

window.malsseumNativeStop = async function() {
  speechSession++;
  return TextToSpeech.stop();
};
