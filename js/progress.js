// 運動紀錄（每天的運動量）＋ 成就徽章
import { EXERCISES, NEST_ORDER } from './config.js';
import { S, update, today, level } from './store.js';
import { stageOf } from './daily.js';

// ---------- 運動紀錄 ----------
// log['YYYY-MM-DD'] = { battles, reps, hold, cardio, perfect, boss }
const emptyDay = () => ({ battles: 0, reps: 0, hold: 0, cardio: 0, perfect: 0, boss: 0 });

export function recordLog({ ex, amount, perfect = false, boss = false }) {
  const kind = EXERCISES[ex].kind;
  update((s) => {
    s.log = s.log || {};
    const d = (s.log[today()] = { ...emptyDay(), ...(s.log[today()] || {}) });
    d.battles++;
    if (kind === 'reps') d.reps += amount;
    else if (kind === 'hold') d.hold += amount;
    else d.cardio += amount;
    if (perfect) d.perfect++;
    if (boss) d.boss++;
    s.best = s.best || {};
    s.best[ex] = Math.max(s.best[ex] || 0, amount);
  });
}

// 估算運動時間（秒）：每下約 3 秒，撐住和有氧照實際秒數
export const activeSec = (d) => (d ? d.reps * 3 + d.hold + d.cardio : 0);
// 很粗略的熱量估算（大卡），只當作鼓勵用
export const kcal = (d) => (d ? d.reps * 0.4 + d.hold * 0.08 + d.cardio * 0.15 : 0);

export const dayLog = (key) => (S().log || {})[key] || null;

export function dateKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 最近 n 天（舊 → 新）
export function lastDays(n = 7) {
  const out = [];
  const base = new Date(today() + 'T12:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const key = dateKey(d);
    out.push({ key, date: d, log: dayLog(key) });
  }
  return out;
}

export function totals() {
  const t = { ...emptyDay(), days: 0 };
  for (const d of Object.values(S().log || {})) {
    for (const k of Object.keys(emptyDay())) t[k] += d[k] || 0;
    if (d.battles) t.days++;
  }
  return t;
}

// ---------- 成就 ----------
const sumWins = () => Object.values(S().wins || {}).reduce((a, b) => a + b, 0) + (S().bossWins || 0);
const best = (ex) => (S().best || {})[ex] || 0;

// cur()：目前進度，goal：達成門檻
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🐣', name: '第一次消風', desc: '打倒第一隻胖胖怪', goal: 1, cur: sumWins },
  { id: 'dex', icon: '📖', name: '收服全部', desc: '4 隻胖胖怪都收進圖鑑', goal: 4, cur: () => NEST_ORDER.filter((k) => S().collected[k]).length },
  { id: 'boss1', icon: '👑', name: '大王倒下了', desc: '第一次打倒胖胖大王', goal: 1, cur: () => S().bossWins || 0 },
  { id: 'boss5', icon: '🏰', name: '大王剋星', desc: '打倒胖胖大王 5 次', goal: 5, cur: () => S().bossWins || 0 },
  { id: 'streak3', icon: '🔥', name: '三天不間斷', desc: '連續 3 天都有運動', goal: 3, cur: () => S().streak?.count || 0 },
  { id: 'streak7', icon: '🌟', name: '一週全勤', desc: '連續 7 天都有運動', goal: 7, cur: () => S().streak?.count || 0 },
  { id: 'wins30', icon: '⚔️', name: '打怪 30 次', desc: '累積打倒 30 次胖胖怪', goal: 30, cur: sumWins },
  { id: 'wins100', icon: '🏆', name: '百戰勇者', desc: '累積打倒 100 次胖胖怪', goal: 100, cur: sumWins },
  { id: 'perfect1', icon: '✨', name: '完美姿勢', desc: '一場戰鬥都沒被提醒', goal: 1, cur: () => totals().perfect },
  { id: 'perfect10', icon: '💎', name: '姿勢大師', desc: '完美姿勢 10 場', goal: 10, cur: () => totals().perfect },
  { id: 'hold5m', icon: '🧱', name: '撐住 5 分鐘', desc: '肌耐力動作累積撐住 300 秒', goal: 300, cur: () => Math.floor(totals().hold) },
  { id: 'hold30m', icon: '🗿', name: '鋼鐵核心', desc: '肌耐力動作累積撐住 30 分鐘', goal: 1800, cur: () => Math.floor(totals().hold) },
  { id: 'reps500', icon: '💥', name: '五百下', desc: '深蹲、開合跳、波比跳累積 500 下', goal: 500, cur: () => totals().reps },
  { id: 'plank60', icon: '🛡️', name: '棒式一分鐘', desc: '完成一次 60 秒以上的棒式', goal: 60, cur: () => best('plank') },
  { id: 'allround', icon: '🌈', name: '全能選手', desc: '9 種運動都練到 Lv.3', goal: Object.keys(EXERCISES).length, cur: () => Object.keys(EXERCISES).filter((e) => stageOf(e) >= 2).length },
  { id: 'chest7', icon: '🎁', name: '寶箱收集者', desc: '打開 7 次每日寶箱', goal: 7, cur: () => S().chests || 0 },
  { id: 'lv10', icon: '⭐', name: '等級 10', desc: '勇者等級達到 Lv.10', goal: 10, cur: level },
  { id: 'all4', icon: '🗺️', name: '環遊胖胖窩', desc: '同一天去過 4 個不同的窩', goal: 4, cur: () => S().daily?.stats?.nests?.length || 0 },
];
export const ACH_REWARD = 30;

// 檢查新達成的成就，自動發獎勵，回傳新解鎖的清單
export function checkAchievements() {
  const got = S().ach || {};
  const newly = ACHIEVEMENTS.filter((a) => !got[a.id] && a.cur() >= a.goal);
  if (newly.length) {
    update((s) => {
      s.ach = s.ach || {};
      newly.forEach((a) => { s.ach[a.id] = today(); });
      s.energy += newly.length * ACH_REWARD;
    });
  }
  return newly;
}

export const unlocked = (id) => (S().ach || {})[id] || null;
