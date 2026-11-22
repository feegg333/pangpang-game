// 每日變化：胖胖窩今天出哪一招、每日任務、漸進式訓練等級
import { NESTS, NEST_ORDER, EXERCISES, PER_LEVEL } from './config.js';
import { S, update, today, allCollected } from './store.js';

const dayNum = () => Math.floor(new Date(today() + 'T00:00:00').getTime() / 864e5);

// ---------- 今天每個窩出哪一招（每天輪流） ----------
export function nestExercise(id) {
  const pool = NESTS[id].pool;
  return pool[(dayNum() + NEST_ORDER.indexOf(id)) % pool.length];
}

// ---------- 漸進式訓練 ----------
const count = (ex) => (S().prog || {})[ex] || 0;
const maxStage = (ex) => { const p = EXERCISES[ex].prog; return Math.ceil((p.max - p.base) / p.step); };
export const stageOf = (ex) => Math.min(maxStage(ex), Math.floor(count(ex) / PER_LEVEL));
export const isMaxed = (ex) => stageOf(ex) >= maxStage(ex);
export function targetOf(ex, stage = stageOf(ex)) {
  const p = EXERCISES[ex].prog;
  return Math.min(p.max, p.base + stage * p.step);
}
// 還要完成幾次才升級（滿級回傳 0）
export const toNext = (ex) => (isMaxed(ex) ? 0 : PER_LEVEL - (count(ex) % PER_LEVEL));
export const timesDone = count;

// 完成一次運動；有升級就回傳 { ex, stage, target }
export function recordExercise(ex) {
  const before = stageOf(ex);
  update((s) => { s.prog = s.prog || {}; s.prog[ex] = (s.prog[ex] || 0) + 1; });
  const after = stageOf(ex);
  return after > before ? { ex, stage: after, target: targetOf(ex, after) } : null;
}

// ---------- 每日任務 ----------
function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

const TEMPLATES = {
  wins: (r) => { const n = 2 + Math.floor(r() * 3); return { text: `打倒 ${n} 次胖胖怪`, goal: n, reward: 50 }; },
  nests: () => ({ text: '去 3 個不同的窩打怪', goal: 3, reward: 60 }),
  hold: (r) => { const n = pick([60, 90, 120], r); return { text: `肌耐力：累積撐住 ${n} 秒`, goal: n, reward: 60 }; },
  reps: (r) => { const n = pick([30, 40, 50], r); return { text: `累積運動 ${n} 下`, goal: n, reward: 50 }; },
  perfect: () => ({ text: '完美姿勢：打完一場都沒被提醒', goal: 1, reward: 70 }),
  ex: (r) => {
    const ex = pick(NEST_ORDER.map(nestExercise), r);
    return { text: `完成一次「${EXERCISES[ex].name}」`, goal: 1, reward: 40, ex };
  },
  boss: () => ({ text: '打倒胖胖大王', goal: 1, reward: 100 }),
};
export const BONUS = 100; // 三個任務全部完成的寶箱

function statOf(m, st) {
  switch (m.type) {
    case 'wins': return st.wins;
    case 'nests': return st.nests.length;
    case 'hold': return Math.floor(st.hold);
    case 'reps': return st.reps;
    case 'perfect': return st.perfect;
    case 'ex': return st.ex.includes(m.ex) ? 1 : 0;
    case 'boss': return st.boss;
    default: return 0;
  }
}

function ensure() {
  const t = today();
  if (S().daily?.date === t) return;
  const r = rng(dayNum() * 7919 + 17);
  const types = ['wins', 'nests', 'hold', 'reps', 'perfect', 'ex', ...(allCollected() ? ['boss'] : [])];
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  const missions = types.slice(0, 3).map((type) => ({ type, ...TEMPLATES[type](r) }));
  update((s) => {
    s.daily = { date: t, missions, done: [], bonus: false,
      stats: { wins: 0, nests: [], hold: 0, reps: 0, perfect: 0, ex: [], boss: 0 } };
  });
}

export function daily() { ensure(); return S().daily; }
export const missionProgress = (m) => Math.min(m.goal, statOf(m, daily().stats));

// 打完一場後呼叫：更新今天的統計，回傳新完成的任務和獎勵
export function recordDaily({ nest = null, ex = null, reps = 0, hold = 0, perfect = false, boss = false }) {
  ensure();
  const newly = [];
  let bonus = false, gained = 0;
  update((s) => {
    const d = s.daily, st = d.stats;
    if (nest) { st.wins++; if (!st.nests.includes(nest)) st.nests.push(nest); }
    if (boss) st.boss++;
    st.reps += reps;
    st.hold += hold;
    if (perfect) st.perfect++;
    if (ex && !st.ex.includes(ex)) st.ex.push(ex);
    d.missions.forEach((m, i) => {
      if (!d.done.includes(i) && statOf(m, st) >= m.goal) { d.done.push(i); newly.push(m); gained += m.reward; }
    });
    if (!d.bonus && d.done.length === d.missions.length) { d.bonus = true; bonus = true; gained += BONUS; }
    s.energy += gained;
  });
  return { newly, bonus, gained };
}
