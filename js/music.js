// 背景音樂：用 WebAudio 即時合成的原創 8-bit 風小曲（不用音檔、沒有版權問題）
// 每首歌用 8 分音符為一格寫成字串：音名＝新音符、「-」＝延長、「.」＝休止

const SONGS = {
  // 主畫面：輕快 C 大調
  home: {
    bpm: 112, swing: 0.08,
    lead: 'E5 G5 C6 G5 A5 G5 E5 . | F5 A5 D6 A5 G5 - . . | E5 G5 C6 G5 A5 C6 D6 E6 | D6 C6 A5 B5 C6 - . . |'
      + ' A5 - G5 E5 F5 - E5 C5 | D5 E5 F5 A5 G5 - . . | A5 - G5 E5 F5 A5 G5 F5 | E5 D5 E5 G5 C5 - . . |',
    bass: 'C3 . G3 . C3 . G3 . | F3 . C4 . G3 . D3 . | C3 . G3 . A2 . E3 . | F3 . G3 . C3 . G2 . |'
      + ' F3 . C4 . E3 . C4 . | D3 . A3 . G3 . B2 . | F3 . C4 . E3 . A3 . | D3 . G3 . C3 . . . |',
    arp: 'C5 E5 G5 E5 C5 E5 G5 E5 | F5 A5 C6 A5 G5 B5 D6 B5 | C5 E5 G5 E5 A4 C5 E5 C5 | F5 A5 G5 B5 C5 E5 G5 E5 |'
      + ' F5 A5 C6 A5 E5 G5 C6 G5 | D5 F5 A5 F5 G5 B5 D6 B5 | F5 A5 C6 A5 E5 A5 C6 A5 | D5 F5 G5 B5 C5 E5 G5 E5 |',
    drums: 'k . h . s . h h | k . h . s . h . |',
    vol: { lead: .09, bass: .12, arp: .025, drums: .5 },
  },
  // 戰鬥：快板、有衝勁
  battle: {
    bpm: 144, swing: 0,
    lead: 'G5 G5 B5 D6 . D6 B5 G5 | A5 A5 C6 E6 . E6 C6 A5 | B5 D6 G6 D6 E6 D6 B5 G5 | A5 B5 C6 A5 D6 - - . |'
      + ' E6 - D6 B5 C6 - B5 G5 | A5 - G5 E5 F#5 G5 A5 . | B5 D6 G6 F#6 E6 D6 C6 B5 | A5 C6 B5 A5 G5 - - . |',
    bass: 'G2 G3 G2 G3 G2 G3 G2 G3 | A2 A3 A2 A3 A2 A3 A2 A3 | E2 E3 E2 E3 C3 C4 C3 C4 | D3 D4 D3 D4 D3 D4 D3 D4 |'
      + ' C3 C4 C3 C4 G2 G3 G2 G3 | A2 A3 A2 A3 D3 D4 D3 D4 | E2 E3 E2 E3 C3 C4 C3 C4 | D3 D4 D3 D4 G2 G3 G2 . |',
    arp: '',
    drums: 'k h s h k k s h |',
    vol: { lead: .075, bass: .11, arp: 0, drums: .55 },
  },
  // 大王：小調、緊張
  boss: {
    bpm: 152, swing: 0,
    lead: 'A5 . E5 A5 C6 B5 A5 G5 | F5 . C5 F5 A5 G5 F5 E5 | D5 F5 A5 D6 C6 A5 B5 C6 | B5 . G#5 . E5 . . . |'
      + ' A5 C6 E6 C6 D6 C6 B5 A5 | G5 B5 D6 B5 C6 B5 A5 G5 | F5 A5 C6 A5 B5 G#5 E5 G#5 | A5 - - . A4 . . . |',
    bass: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | D2 D2 D3 D2 E2 E2 E3 E2 | E2 E2 E3 E2 E2 E2 E3 G#2 |'
      + ' A2 A2 A3 A2 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 G3 G2 | F2 F2 F3 F2 E2 E2 E3 E2 | A2 A2 A3 A2 A2 . . . |',
    arp: '',
    drums: 'k h s h k h s s | k h s h k k s h |',
    vol: { lead: .075, bass: .12, arp: 0, drums: .6 },
  },
};

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (name) => {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};
// 字串 → [{step, f, len}]
function parse(str) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = [];
  toks.forEach((t, i) => {
    if (t === '-') { if (out.length) out[out.length - 1].len++; return; }
    if (t === '.') return;
    out.push({ step: i, f: freq(t), len: 1 });
  });
  return { notes: out, length: toks.length };
}
const parseDrums = (str) => {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  return { hits: toks, length: toks.length };
};

let ctx = null, master = null, noiseBuf = null;
let current = null;    // 正在播放的歌名
let timer = 0, step = 0, nextTime = 0, parsed = null;
let enabled = true, duck = 1;

export function initMusic(audioCtx) {
  if (ctx || !audioCtx) return;
  ctx = audioCtx;
  master = ctx.createGain();
  master.gain.value = 0;
  // 柔和一點：低通濾波，讓 8-bit 方波不刺耳
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 4200;
  master.connect(lp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (pending) { const p = pending; pending = null; playMusic(p); }
}

function voice(type, f, t, dur, vol, { attack = 0.01, vibrato = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (vibrato) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 6; lg.gain.value = f * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t + 0.08); lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function drum(kind, t, vol) {
  if (kind === 'k') { // 大鼓
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.16);
    return;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(vol * 0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); }
  else { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); }
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + 0.15);
}

let active = null;     // 排程器實際在播的歌（淡出期間 current 已清空，但還要繼續排）
let playToken = 0;

function schedule() {
  const song = active;
  if (!song) return;
  const eighth = 60 / song.bpm / 2;
  while (nextTime < ctx.currentTime + 0.15) {
    const t = nextTime + (step % 2 ? song.swing * eighth : 0);
    const { lead, bass, arp, drums } = parsed;
    const at = (trk, fn) => { const s = step % trk.length; trk.notes.forEach((n) => n.step === s && fn(n)); };
    at(lead, (n) => voice('square', n.f, t, n.len * eighth * 0.95, song.vol.lead, { vibrato: n.len > 1 ? 0.012 : 0 }));
    at(bass, (n) => voice('triangle', n.f, t, n.len * eighth * 0.9, song.vol.bass));
    if (arp.length) at(arp, (n) => voice('square', n.f * 2, t, eighth * 0.5, song.vol.arp));
    const h = drums.hits[step % drums.length];
    if (h && h !== '.') drum(h, t, song.vol.drums * 0.25);
    step++;
    nextTime += eighth;
  }
}

let pending = null;
export function playMusic(name) {
  if (!ctx) { pending = name; return; }
  if (!enabled) { current = name; playToken++; stopLoop(); return; }
  if (current === name && timer) return;
  current = name;
  playToken++;
  stopLoop();
  const s = SONGS[name];
  active = s;
  parsed = { lead: parse(s.lead), bass: parse(s.bass), arp: s.arp ? parse(s.arp) : { notes: [], length: 1 }, drums: parseDrums(s.drums) };
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  fade(0.9);
  timer = setInterval(schedule, 40);
  schedule();
}

function stopLoop() { clearInterval(timer); timer = 0; }

function fade(to, sec = 0.4) {
  if (!master) return;
  const g = master.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(to * duck * (enabled ? 1 : 0), t + sec);
}

export function stopMusic(sec = 0.4) {
  if (!ctx) { pending = null; return; }
  fade(0, sec);
  const token = ++playToken;
  setTimeout(() => { if (playToken === token) stopLoop(); }, sec * 1000 + 50);
  current = null;
}

// 運動中語音報數比較重要：把音樂壓小聲
export function duckMusic(on) {
  duck = on ? 0.45 : 1;
  if (timer) fade(0.9, 0.3);
}

export function setMusicEnabled(on) {
  enabled = on;
  if (!ctx) return;
  if (on && current) { const c = current; current = null; playMusic(c); }
  else if (!on) { fade(0, 0.2); setTimeout(stopLoop, 250); }
}

export const musicEnabled = () => enabled;
export const musicState = () => ({ song: current, playing: !!timer, gain: master ? +master.gain.value.toFixed(2) : null, ctx: ctx?.state });

// 背景分頁就停下來，回來再繼續
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { stopLoop(); }
  else if (current && enabled && !timer) { nextTime = ctx.currentTime + 0.05; timer = setInterval(schedule, 40); }
});
