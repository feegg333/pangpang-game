// 進度存在手機瀏覽器 localStorage
import { NESTS, NEST_ORDER, REWARD } from './config.js';

const KEY = 'pangpang.v1';

const fresh = () => ({
  name: '',
  energy: 0,
  places: {},       // nestId -> 使用者自訂位置名稱
  collected: {},    // nestId -> true（已收服）
  wins: {},         // nestId -> 次數
  bossWins: 0,
  fatClaimed: '',   // 已領取雙倍的日期 'YYYY-MM-DD'
  streak: { last: '', count: 0 },
  boss: null,       // 進行中的大王戰 { seq, idx, deadline, phase }
  settings: { voice: true, music: true, sfx: true },
});

let state;
function load() {
  try {
    state = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    state = fresh();
  }
  state.settings = { ...fresh().settings, ...(state.settings || {}) };
}
load();

// 其他分頁（iPhone 每次碰貼紙都會開新分頁）改了進度時，重新讀取
export const reload = load;

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 私密模式等 */ }
}

export const S = () => state;

export function update(fn) {
  fn(state);
  save();
}

export function resetAll() {
  state = fresh();
  save();
}

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 每天固定一隻「變胖」：依日期算出來，同一天每次打開都一樣
export function fatNestToday() {
  const s = today();
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return NEST_ORDER[h % NEST_ORDER.length];
}

export function placeOf(id) {
  return state.places[id] || NESTS[id].defaultPlace;
}

export function level() {
  return Math.floor(state.energy / REWARD.perLevel) + 1;
}

export function allCollected() {
  return NEST_ORDER.every((id) => state.collected[id]);
}

// 打倒一隻胖胖怪，回傳 { gained, doubled, firstTime }
export function recordWin(id) {
  const firstTime = !state.collected[id];
  const isFat = fatNestToday() === id && state.fatClaimed !== today();
  const gained = REWARD.base * (isFat ? REWARD.fatBonus : 1);
  update((s) => {
    s.collected[id] = true;
    s.wins[id] = (s.wins[id] || 0) + 1;
    s.energy += gained;
    if (isFat) s.fatClaimed = today();
    touchStreak(s);
  });
  return { gained, doubled: isFat, firstTime };
}

export function recordBossWin(reward) {
  update((s) => {
    s.bossWins += 1;
    s.energy += reward;
    s.boss = null;
    touchStreak(s);
  });
}

function touchStreak(s) {
  const t = today();
  if (s.streak.last === t) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  s.streak.count = s.streak.last === today(y) ? s.streak.count + 1 : 1;
  s.streak.last = t;
}
