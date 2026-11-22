// 精靈夥伴：選一隻收服的精靈陪你運動，累積親密度會進化，還有專屬加成
import { NESTS, BOSS } from './config.js';
import { S, update, today } from './store.js';

export const BUDDY_IDS = ['chips', 'tea', 'donut', 'lazy', 'boss'];
// 親密度門檻：Lv.1 → Lv.5
export const BUDDY_LEVELS = [0, 30, 80, 160, 300];
export const FORM_NAMES = ['', '寶寶形態', '圍巾形態', '勇者形態', '閃耀形態', '傳說形態'];

export const PERKS = {
  chips: '在 🍟 薯片窩打怪，獎勵 +50%',
  tea: '每日任務的獎勵 +20%',
  donut: '連續運動天數加成：每連續一天每場 +2（最多 +20）',
  lazy: '肌耐力撐住動作的獎勵 +30%',
  boss: '所有打怪獎勵 +15%',
};

export const LINES = {
  chips: ['咔滋咔滋～加油！', '蹲下去～站起來～', '洋芋片分你一片！', '你好帥喔！'],
  tea: ['咕嚕咕嚕～衝啊！', '珍珠能量注入！', 'QQ 的！繼續！', '我在幫你數喔～'],
  donut: ['糖粒噴射！加油～', '甜甜的汗水！', '轉圈圈～好厲害！', '再一下下就好！'],
  lazy: ['我…我醒著…加油…', '撐住撐住…呼…', '你比我有精神多了！', 'Zzz…啊！加油！'],
  boss: ['本王命令你：加油！', '這才配當本王的勇者！', '哼，表現不錯嘛！', '皇冠借你戴一下！'],
};
export const HOME_LINES = ['今天也一起運動吧！', '摸摸我的頭～', '我們去打胖胖怪！', '你今天好有精神！', '一起變更強吧！'];

export const buddyName = (id) => (id === 'boss' ? BOSS.spirit : NESTS[id].spirit);
export const isCollected = (id) => (id === 'boss' ? (S().bossWins || 0) > 0 : !!S().collected[id]);
export const buddyXP = (id) => (S().buddies || {})[id] || 0;
export function buddyLevel(id) {
  const xp = buddyXP(id);
  let lv = 1;
  BUDDY_LEVELS.forEach((t, i) => { if (xp >= t) lv = i + 1; });
  return lv;
}
// 這一級的進度 0~1，以及到下一級的門檻
export function buddyProgress(id) {
  const lv = buddyLevel(id), xp = buddyXP(id);
  if (lv >= BUDDY_LEVELS.length) return { pct: 1, next: null, xp };
  const a = BUDDY_LEVELS[lv - 1], b = BUDDY_LEVELS[lv];
  return { pct: (xp - a) / (b - a), next: b, xp };
}

export function buddyId() {
  const b = S().buddy;
  return b && isCollected(b) ? b : null;
}
export function setBuddy(id) { if (isCollected(id)) update((s) => (s.buddy = id)); }

// 第一次收服精靈時，自動成為夥伴
export function autoAssign(id) {
  if (buddyId()) return false;
  update((s) => (s.buddy = id));
  return true;
}

function addXP(id, amount) {
  const before = buddyLevel(id);
  update((s) => { s.buddies = s.buddies || {}; s.buddies[id] = (s.buddies[id] || 0) + amount; });
  const after = buddyLevel(id);
  return after > before ? after : null;
}

// 每天第一次摸摸頭 +5 親密度
export function petBuddy() {
  const id = buddyId();
  if (!id || S().petDate === today()) return null;
  update((s) => (s.petDate = today()));
  return { xp: 5, levelUp: addXP(id, 5) };
}

// 打完一場：計算夥伴加成、增加親密度
// base：這場的基本元氣值；daily：這場拿到的每日任務獎勵；kind：運動類型
export function buddyAfterBattle({ nest = null, kind = '', base = 0, daily = 0, perfect = false, boss = false }) {
  const id = buddyId();
  if (!id) return null;
  let extra = 0;
  if (id === 'chips' && nest === 'chips') extra = Math.round(base * 0.5);
  if (id === 'tea') extra = Math.round(daily * 0.2);
  if (id === 'donut') extra = Math.min(20, 2 * (S().streak?.count || 0));
  if (id === 'lazy' && kind === 'hold') extra = Math.round(base * 0.3);
  if (id === 'boss') extra = Math.round(base * 0.15);
  if (extra) update((s) => (s.energy += extra));
  const xp = 10 + (perfect ? 5 : 0) + (nest && nest === id ? 5 : 0) + (boss ? 20 : 0);
  const levelUp = addXP(id, xp);
  return { id, extra, xp, levelUp };
}
