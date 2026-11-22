// 音效（WebAudio 即時合成，不用音檔）＋ 語音（瀏覽器內建中文語音）＋ 背景音樂開關
import { S } from './store.js';
import { initMusic, setMusicEnabled } from './music.js';

let ctx = null;
let voice = null;
let noise = null;
let speechUnlocked = false;

// iPhone 規定聲音要在使用者點擊時「解鎖」，開始按鈕會呼叫這個
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    setMusicEnabled(S().settings.music !== false);
    initMusic(ctx);
  } catch { /* 沒有 WebAudio */ }
  if (speechUnlocked) return;
  speechUnlocked = true;
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

// ---------- 合成器小零件 ----------
const on = () => ctx && S().settings.sfx !== false;

function tone({ f0, f1 = f0, dur = 0.15, type = 'sine', vol = 0.3, delay = 0, attack = 0.005 }) {
  if (!on()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss({ dur = 0.2, from = 800, to = 4000, type = 'bandpass', vol = 0.2, delay = 0, q = 1 }) {
  if (!on() || !noise) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

const notes = (list, { type = 'triangle', step = 0.1, dur = 0.18, vol = 0.22, delay = 0 } = {}) =>
  list.forEach((f, i) => tone({ f0: f, dur, type, vol, delay: delay + i * step }));

const rnd = (a, b) => a + Math.random() * (b - a);

export const sfx = {
  // 介面
  click: () => { tone({ f0: 660, f1: 990, dur: 0.06, type: 'square', vol: 0.06 }); },
  back: () => tone({ f0: 700, f1: 420, dur: 0.08, type: 'square', vol: 0.06 }),
  boing: () => tone({ f0: 200, f1: 620, dur: 0.25, type: 'triangle', vol: 0.3 }),
  ding: () => { tone({ f0: 1320, dur: 0.18 }); tone({ f0: 1760, dur: 0.3, delay: 0.12 }); },
  scan: () => { tone({ f0: 700, dur: 0.08, type: 'square', vol: 0.12 }); tone({ f0: 1050, dur: 0.14, type: 'square', vol: 0.12, delay: 0.1 }); },
  oops: () => { tone({ f0: 330, f1: 220, dur: 0.18, type: 'square', vol: 0.1 }); tone({ f0: 260, f1: 170, dur: 0.22, type: 'square', vol: 0.1, delay: 0.16 }); },
  tick: () => tone({ f0: 1000, dur: 0.05, vol: 0.12 }),
  // 遭遇
  alert: () => { notes([880, 1175], { type: 'square', step: 0.09, dur: 0.12, vol: 0.1 }); hiss({ dur: 0.25, from: 2000, to: 6000, vol: 0.08 }); },
  appear: () => { tone({ f0: 300, f1: 900, dur: 0.3, type: 'triangle', vol: 0.25 }); hiss({ dur: 0.35, from: 600, to: 5000, vol: 0.1, delay: 0.05 }); notes([1568, 2093], { type: 'sine', step: 0.07, dur: 0.15, vol: 0.12, delay: 0.25 }); },
  bossAppear: () => {
    tone({ f0: 70, f1: 45, dur: 1.2, type: 'sawtooth', vol: 0.18 });
    hiss({ dur: 1.0, from: 200, to: 120, type: 'lowpass', vol: 0.35 });
    notes([220, 262, 311], { type: 'square', step: 0.22, dur: 0.3, vol: 0.1, delay: 0.5 });
  },
  // 戰鬥
  countdown: () => tone({ f0: 660, dur: 0.15, type: 'square', vol: 0.12 }),
  go: () => { tone({ f0: 990, dur: 0.12, type: 'square', vol: 0.14 }); tone({ f0: 1320, dur: 0.3, type: 'square', vol: 0.14, delay: 0.1 }); },
  hit: () => { // 每做一下：音高有點隨機，比較不會膩
    const f = rnd(700, 1100);
    tone({ f0: f, f1: f * 0.2, dur: 0.12, vol: 0.35 });
    hiss({ dur: 0.08, from: 3000, to: 1200, vol: 0.12 });
  },
  pop: () => tone({ f0: 900, f1: 180, dur: 0.12, vol: 0.4 }),
  squish: () => { tone({ f0: 220, f1: 520, dur: 0.12, type: 'triangle', vol: 0.18 }); tone({ f0: 520, f1: 260, dur: 0.1, type: 'triangle', vol: 0.12, delay: 0.1 }); },
  combo: (n) => notes([523, 659, 784, 1047].slice(0, Math.min(4, 1 + Math.floor(n / 5))), { type: 'square', step: 0.06, dur: 0.1, vol: 0.08 }),
  warn: () => { tone({ f0: 520, dur: 0.1, type: 'square', vol: 0.08 }); tone({ f0: 520, dur: 0.1, type: 'square', vol: 0.08, delay: 0.14 }); },
  heartbeat: () => { tone({ f0: 80, f1: 50, dur: 0.12, vol: 0.4 }); tone({ f0: 80, f1: 50, dur: 0.12, vol: 0.3, delay: 0.18 }); },
  deflate: () => { // 噗咻～（滑音往下＋氣聲）
    tone({ f0: 900, f1: 80, dur: 1.0, type: 'sawtooth', vol: 0.1 });
    hiss({ dur: 1.0, from: 3000, to: 300, vol: 0.18 });
  },
  ko: () => {
    tone({ f0: 1200, f1: 200, dur: 0.6, type: 'square', vol: 0.08 });
    notes([784, 988, 1175, 1568], { type: 'square', step: 0.08, dur: 0.14, vol: 0.1, delay: 0.55 });
  },
  // 收服 / 獎勵
  sparkle: () => notes([1568, 1976, 2349, 3136], { type: 'sine', step: 0.06, dur: 0.25, vol: 0.12 }),
  catch: () => {
    hiss({ dur: 0.3, from: 400, to: 6000, vol: 0.12 });
    notes([784, 1047, 1319, 1568, 2093], { type: 'triangle', step: 0.07, dur: 0.3, vol: 0.2, delay: 0.1 });
  },
  coin: () => { tone({ f0: 988, dur: 0.06, type: 'square', vol: 0.07 }); tone({ f0: 1319, dur: 0.12, type: 'square', vol: 0.07, delay: 0.06 }); },
  star: (i = 0) => { tone({ f0: 880 * Math.pow(1.26, i), dur: 0.25, type: 'triangle', vol: 0.22 }); hiss({ dur: 0.15, from: 5000, to: 9000, type: 'highpass', vol: 0.06 }); },
  win: () => { // 過關小號角
    notes([523, 659, 784], { type: 'square', step: 0.11, dur: 0.12, vol: 0.12 });
    tone({ f0: 1047, dur: 0.5, type: 'square', vol: 0.12, delay: 0.36 });
    notes([392, 523, 659, 784], { type: 'triangle', step: 0.11, dur: 0.2, vol: 0.18 });
    tone({ f0: 523, dur: 0.6, type: 'triangle', vol: 0.18, delay: 0.44 });
  },
  levelUp: () => notes([523, 659, 784, 1047, 784, 1047, 1319], { type: 'square', step: 0.08, dur: 0.14, vol: 0.1 }),
  fail: () => notes([523, 494, 466, 392], { type: 'triangle', step: 0.22, dur: 0.3, vol: 0.2 }),
};

export function vibrate(p = 60) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate && navigator.vibrate(p); } catch { /* iPhone 不支援，沒關係 */ }
}
