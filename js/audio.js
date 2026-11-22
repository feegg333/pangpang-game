// 音效（WebAudio 即時合成，不用音檔）＋ 語音（瀏覽器內建中文語音）
import { S } from './store.js';

let ctx = null;
let voice = null;

// iPhone 規定聲音要在使用者點擊時「解鎖」，開始按鈕會呼叫這個
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* 沒有 WebAudio */ }
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    pickVoice();
  }
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice =
    vs.find((v) => v.lang === 'zh-TW' && /Mei-Jia|美佳|Google/.test(v.name)) ||
    vs.find((v) => v.lang === 'zh-TW') ||
    vs.find((v) => /^zh/i.test(v.lang)) ||
    null;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = pickVoice;

// interrupt=true 會打斷前一句（報數用，避免越講越落後）
export function say(text, { interrupt = false, rate = 1.1, pitch = 1.4 } = {}) {
  if (!S().settings.voice || !('speechSynthesis' in window)) return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW';
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch; // 高一點比較可愛
  speechSynthesis.speak(u);
}

export function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function cnNum(n) {
  if (n <= 10) return CN[n];
  if (n < 20) return '十' + CN[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return CN[t] + '十' + (o ? CN[o] : '');
}

function tone({ f0, f1, dur = 0.15, type = 'sine', vol = 0.3, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  pop: () => tone({ f0: 900, f1: 180, dur: 0.12, vol: 0.4 }),               // 啵！
  boing: () => tone({ f0: 200, f1: 600, dur: 0.25, type: 'triangle' }),     // 彈跳
  ding: () => { tone({ f0: 1320, f1: 1318, dur: 0.18 }); tone({ f0: 1760, f1: 1758, dur: 0.3, delay: 0.12 }); },
  scan: () => { tone({ f0: 700, f1: 700, dur: 0.08 }); tone({ f0: 1050, f1: 1050, dur: 0.12, delay: 0.1 }); },
  deflate: () => tone({ f0: 600, f1: 60, dur: 0.9, type: 'sawtooth', vol: 0.15 }), // 噗咻～
  oops: () => tone({ f0: 300, f1: 200, dur: 0.2, type: 'square', vol: 0.12 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, f1: f, dur: 0.22, type: 'triangle', delay: i * 0.12 })),
  tick: () => tone({ f0: 1000, f1: 1000, dur: 0.05, vol: 0.15 }),
};

export function vibrate(p = 60) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate && navigator.vibrate(p); } catch { /* iPhone 不支援，沒關係 */ }
}
