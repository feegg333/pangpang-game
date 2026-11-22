// 進度存在手機瀏覽器 localStorage；一支手機可以有多位家庭成員，各自一份進度
import { NESTS, NEST_ORDER, REWARD } from './config.js';

const PKEY = 'pangpang.profiles';
// 第一位成員沿用舊的存檔位置，原本的進度不會不見
const keyFor = (id) => (id === 'p1' ? 'pangpang.v1' : `pangpang.v1.${id}`);
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 私密模式等 */ } };

let profiles;
function loadProfiles() {
  profiles = readJSON(PKEY);
  if (!profiles || !Array.isArray(profiles.list) || !profiles.list.length) {
    const old = readJSON(keyFor('p1'));
    profiles = { active: 'p1', list: [{ id: 'p1', name: old?.name || '', avatar: '🐰' }] };
    writeJSON(PKEY, profiles);
  }
  if (!profiles.list.some((p) => p.id === profiles.active)) profiles.active = profiles.list[0].id;
}
loadProfiles();

const fresh = () => ({
  name: '',
  energy: 0,
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
  state = { ...fresh(), ...(readJSON(keyFor(profiles.active)) || {}) };
  state.settings = { ...fresh().settings, ...(state.settings || {}) };
}
load();

// 其他分頁（iPhone 每次碰貼紙都會開新分頁）改了進度或換了玩家時，重新讀取
export function reload() { loadProfiles(); load(); }

export function save() {
  writeJSON(keyFor(profiles.active), state);
  const me = profiles.list.find((p) => p.id === profiles.active);
  if (me && state.name && me.name !== state.name) { me.name = state.name; writeJSON(PKEY, profiles); }
}

// ---------- 家庭成員 ----------
export const AVATARS = ['🐰', '🐻', '🐱', '🐶', '🐼', '🦊', '🐯', '🐸', '🐨', '🐷', '🐵', '🦄'];
export const profileList = () => profiles.list.map((p) => ({ ...p }));
export const activeProfile = () => ({ ...profiles.list.find((p) => p.id === profiles.active) });
export const profileState = (id) => (id === profiles.active ? state : { ...fresh(), ...(readJSON(keyFor(id)) || {}) });

export function switchProfile(id) {
  if (!profiles.list.some((p) => p.id === id)) return;
  save();
  profiles.active = id;
  writeJSON(PKEY, profiles);
  load();
}

export function createProfile(name, avatar) {
  let n = 2;
  while (profiles.list.some((p) => p.id === `p${n}`)) n++;
  const id = `p${n}`;
  profiles.list.push({ id, name, avatar });
  writeJSON(keyFor(id), { ...fresh(), name });
  writeJSON(PKEY, profiles);
  switchProfile(id);
  return id;
}

export function updateProfile(id, patch) {
  const p = profiles.list.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  writeJSON(PKEY, profiles);
  if (id === profiles.active && patch.name) { state.name = patch.name; save(); }
}

export function deleteProfile(id) {
  if (profiles.list.length <= 1 || id === profiles.active) return false;
  profiles.list = profiles.list.filter((p) => p.id !== id);
  writeJSON(PKEY, profiles);
  try { localStorage.removeItem(keyFor(id)); } catch { /* */ }
  return true;
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
