// 打倒胖胖怪！主流程
import { NESTS, NEST_ORDER, BOSS, EXERCISES, REWARD } from './config.js';
import {
  S, update, fatNestToday, today, level, allCollected, recordWin, recordBossWin, resetAll, reload,
} from './store.js';
import { unlockAudio, say, sfx, vibrate, cnNum } from './audio.js';
import { requestMotion } from './camera.js';
import { monsterSVG, spiritSVG, bossSVG, bunnySVG } from './monsters.js';
import { render, $, $$, on, onCleanup, esc, bunny, toast, confetti, params, DEBUG } from './ui.js';
import { arIntro, workout, collect } from './battle.js';
import { enableInAppNfc, setNfcHandler, webNfcSupported, nfcActive } from './nfc.js';
import { playMusic, stopMusic, setMusicEnabled } from './music.js';
import {
  nestExercise, stageOf, targetOf, toNext, isMaxed, timesDone, recordExercise, daily, missionProgress, recordDaily, BONUS,
} from './daily.js';

let busy = false; // 戰鬥中，忽略遊戲內感應

// 所有糖果按鈕都有「嗶」的按鍵音
// 第一次點畫面任何地方，就解鎖聲音並開始播背景音樂（手機瀏覽器規定）
document.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (e.target.closest('.btn, .node, .quest')) sfx.click();
}, true);

// 在使用者點擊時解鎖：聲音、陀螺儀、（Android）遊戲內感應
function gesture() {
  unlockAudio();
  const p = requestMotion();
  enableInAppNfc();
  return p;
}

const isFatToday = (id) => fatNestToday() === id && S().fatClaimed !== today();
const tagUrl = (id) => `${location.origin}${location.pathname}?n=${id}&k=${NESTS[id].key}`;

// ================= 感應貼紙 =================
function handleScan(n, k) {
  const nest = NESTS[n];
  if (!nest || nest.key !== k) return badTag();
  sfx.scan(); vibrate(80);
  if (!S().name) { update((s) => (s.pendingNest = n)); return onboarding(); }
  const b = S().boss;
  if (b && b.phase === 'run') return bossScan(n);
  if (b && b.phase === 'final') return bossFinal();
  if (busy) return;
  encounterGate(n);
}

setNfcHandler((n, k) => {
  if (busy && S().boss?.phase !== 'run') return;
  handleScan(n, k);
});

function badTag() {
  render(`<div class="screen center">
    <div style="width:140px">${bunnySVG()}</div>
    <h1 class="title stroke">這張貼紙<br>好像怪怪的…</h1>
    <div class="card"><p class="sub">可能是網址寫錯了，到「設定」可以看到正確的貼紙網址。</p></div>
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
}

// ================= 開場（第一次玩） =================
function onboarding() {
  playMusic('home');
  render(`<div class="screen center">
    <div class="logo">
      <h1 class="title stroke">打倒<span class="accent">胖胖怪</span>！</h1>
      <div class="tag-line">居家運動大冒險</div>
    </div>
    <div class="monster-parade">
      ${NEST_ORDER.map((id, i) => `<div class="wobble" style="animation-delay:${i * .3}s">${monsterSVG(id)}</div>`).join('')}
    </div>
    ${bunny('不好了！一群愛吃零食的<b>胖胖怪</b>偷偷住進你家了！快幫我用運動讓牠們消風，變回小精靈～')}
    <div class="card" style="width:100%;margin-top:14px">
      <div class="panel-head">勇者登錄</div>
      <label class="field">你叫什麼名字？
        <input class="text" id="name" maxlength="10" placeholder="元氣小勇者" />
      </label>
    </div>
    <button class="btn big pulse" id="start">開始冒險！</button>
    <p class="sub" style="font-size:13px;color:var(--ink);opacity:.7">接下來會詢問相機和動作感測器權限，請按「允許」</p>
  </div>`);
  on('#start', 'click', async () => {
    await gesture();
    const name = $('#name').value.trim() || '元氣小勇者';
    update((s) => (s.name = name));
    sfx.boing();
    say(`${name}，歡迎你！我是小跳跳！`);
    tutorial();
  });
}

function tutorial() {
  render(`<div class="screen center">
    <h1 class="title stroke">新手教學</h1>
    ${bunny('戰鬥的時候要把手機<b>放下來</b>，我才看得到你運動喔！')}
    <div class="card" style="text-align:left;width:100%;line-height:1.8;margin-top:14px">
      <div style="text-align:center"><div class="panel-head">擺手機小撇步</div></div>
      ① 手機直立，靠著牆、書或椅腳<br>
      ② 鏡頭高度大約在膝蓋附近最好<br>
      ③ 往後退 2～3 步，<b>頭到腳</b>都要入鏡<br>
      ④ 虛線框變成<span style="color:var(--mint);font-weight:900">綠色</span>就會開始倒數
    </div>
    <button class="btn big" id="go">練習 3 下深蹲！</button>
    <button class="btn white small" id="skip">跳過練習</button>
  </div>`);
  on('#skip', 'click', afterTutorial);
  on('#go', 'click', async () => {
    await gesture();
    busy = true;
    const r = await workout({ exercise: 'squat', target: 3, monsterHTML: bunnySVG(), label: '練習', loseLine: '你好棒！' });
    busy = false;
    if (r.status === 'quit') return home();
    render(`<div class="screen center">
      <div class="clear-wrap"><div class="sunburst"></div><div style="width:150px;position:relative">${bunnySVG()}</div></div>
      <div class="ribbon stroke">教學完成！</div>
      ${bunny('你已經學會了！現在去找胖胖怪吧！<br><b>碰貼紙 → 看怪物 → 放下手機運動 → 拿起來收服</b>')}
      <button class="btn big" id="next">出發！</button>
    </div>`);
    confetti(40); sfx.win();
    on('#next', 'click', afterTutorial);
  });
}

function afterTutorial() {
  const p = S().pendingNest;
  update((s) => delete s.pendingNest);
  if (p) encounterGate(p); else home();
}

// ================= 主畫面：關卡地圖 =================
// 由下往上走：薯片窩 → 奶茶窩 → 甜甜圈窩 → 懶骨頭窩 → 大王城堡
const MAP_POS = { chips: [28, 640], tea: [72, 515], donut: [28, 390], lazy: [72, 265], boss: [50, 100] };

function home() {
  const b = S().boss;
  if (b?.phase === 'run') return bossRun();
  if (b?.phase === 'final') return bossFinal();
  busy = false;
  playMusic('home');
  const st = S();
  const lv = level();
  const inLv = st.energy % REWARD.perLevel;
  const fat = fatNestToday();
  const fatOpen = isFatToday(fat);
  const got = NEST_ORDER.filter((id) => st.collected[id]).length;
  const nextNew = NEST_ORDER.find((id) => !st.collected[id]);
  const bossOpen = allCollected();

  // 今日任務：變胖的胖胖怪（雙倍）＋ 3 個每天不同的任務 ＋ 全部完成寶箱
  const d = daily();
  const mRows = d.missions.map((m, i) => {
    const p = missionProgress(m), done = d.done.includes(i);
    return `<div class="mrow ${done ? 'done' : ''}">
      <span class="mcheck">${done ? '✓' : ''}</span>
      <div class="mtext">${esc(m.text)}<div class="mbar"><i style="width:${(p / m.goal) * 100}%"></i><span>${p}/${m.goal}</span></div></div>
      <span class="mrew">${done ? '完成' : `+${m.reward}`}</span>
    </div>`;
  }).join('');
  const quest = `<div class="quest-panel" id="quest">
    <div class="qp-head"><span class="q-tag">📜 今日任務</span><span class="qp-count">${d.done.length}/${d.missions.length}</span></div>
    <div class="mrow fat ${fatOpen ? '' : 'done'}">
      <span class="mico">${fatOpen ? monsterSVG(fat) : spiritSVG(fat)}</span>
      <div class="mtext">${fatOpen ? `${NESTS[fat].monster} 變胖了！去 ${NESTS[fat].emoji}${NESTS[fat].nest} 打倒牠` : `${NESTS[fat].monster} 的雙倍獎勵拿到了`}</div>
      <span class="mrew x2s">${fatOpen ? '×2' : '完成'}</span>
    </div>
    ${mRows}
    <div class="mrow chest ${d.bonus ? 'done' : ''}"><span class="mico chest-ico">🎁</span>
      <div class="mtext">${d.bonus ? '今天的寶箱打開了！明天會有新任務' : '3 個任務全部完成，再送寶箱'}</div>
      <span class="mrew">${d.bonus ? '已領' : `+${BONUS}`}</span></div>
  </div>`;

  const tip = nextNew
    ? bunny(`快去 <b>${NESTS[nextNew].emoji} ${NESTS[nextNew].nest}</b> 找 ${NESTS[nextNew].monster}！`)
    : bossOpen && !st.bossWins ? bunny('4 隻都收服了！<b>胖胖大王</b>的城堡開了，點城堡挑戰牠！') : '';

  const node = (id) => {
    const n = NESTS[id], exId = nestExercise(id), ex = EXERCISES[exId];
    const [x, y] = MAP_POS[id];
    const isFat = isFatToday(id);
    const cls = isFat ? 'fat' : st.collected[id] ? 'cleared' : 'unknown';
    const wins = st.wins[id] || 0;
    const badge = isFat ? '<span class="node-badge fat">×2</span>'
      : st.collected[id] ? '<span class="node-badge ok">✓</span>' : '';
    const stars = [0, 1, 2].map((i) => `<span style="opacity:${i < Math.min(3, wins) ? 1 : .3}">⭐</span>`).join('');
    return `<div class="node ${cls}" data-id="${id}" style="left:${x}%;top:${y}px">
      <div class="node-ring">${badge}${isFat || st.collected[id] ? monsterSVG(id) : monsterSVG(id)}</div>
      <div class="node-stars">${stars}</div>
      <div class="node-label">${n.emoji} ${n.monster}<small>${n.nest}・${ex.name}${targetOf(exId)}${ex.unit}</small></div>
    </div>`;
  };
  const [bx, by] = MAP_POS.boss;
  const pts = ['chips', 'tea', 'donut', 'lazy', 'boss'].map((k) => MAP_POS[k].join(',')).join(' ');

  render(`<div class="screen">
    <div class="hud">
      <div class="avatar">${bunnySVG()}<span class="lv-badge">Lv${lv}</span></div>
      <div class="hud-main">
        <div class="hud-name">${esc(st.name)}</div>
        <div class="xpbar"><i style="width:${(inLv / REWARD.perLevel) * 100}%"></i><span>⚡ ${inLv} / ${REWARD.perLevel}</span></div>
      </div>
      <div class="chips">
        <span class="chip">🔥 ${st.streak.count || 0}</span>
        <span class="chip">✨ ${got}/4</span>
      </div>
      <button class="mute" id="mute" aria-label="背景音樂開關">${st.settings.music !== false ? '🎵' : '🔇'}</button>
    </div>
    ${quest}
    ${tip}
    <div class="map">
      <svg class="map-path" viewBox="0 0 100 720" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${pts}" fill="none" stroke="#2B1B3D" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".25"/>
        <polyline points="${pts}" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="2 14" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="node castle ${bossOpen ? '' : 'locked'}" id="castle" style="left:${bx}%;top:${by}px">
        <div class="node-ring">${st.bossWins ? '<span class="node-badge ok">✓</span>' : ''}${bossSVG()}</div>
        <div class="node-label">👑 ${BOSS.name}<small>${bossOpen ? `跑關＋波比跳・+${BOSS.reward}` : `收服 4 隻才會開門（${got}/4）`}</small></div>
      </div>
      ${NEST_ORDER.map(node).join('')}
    </div>
    ${webNfcSupported() && !nfcActive() ? `<button class="btn sky" id="nfc">📡 開啟遊戲內感應</button>` : ''}
    <div class="dock">
      <button class="btn mint" id="train">💪 訓練</button>
      <button class="btn yellow" id="dex">📖 圖鑑</button>
      <button class="btn purple" id="set">⚙️ 設定</button>
    </div>
    ${DEBUG ? '<p class="sub" style="text-align:center;color:var(--ink)">🛠 除錯模式：點關卡＝模擬感應</p>' : ''}
  </div>`);

  $$('.node[data-id]').forEach((el) => on(el, 'click', () => {
    const id = el.dataset.id;
    sfx.boing();
    if (DEBUG) return handleScan(id, NESTS[id].key);
    toast(`去 ${NESTS[id].emoji}${NESTS[id].nest}，用手機上緣碰貼紙！`);
  }));
  on('#castle', 'click', async () => {
    if (!bossOpen) { sfx.oops(); return toast(`還要收服 ${4 - got} 隻胖胖怪，城堡才會開門！`); }
    await gesture(); bossIntro();
  });
  on('#mute', 'click', () => {
    unlockAudio();
    const onNow = S().settings.music === false;
    update((s) => (s.settings.music = onNow));
    setMusicEnabled(onNow);
    if (onNow) playMusic('home');
    $('#mute').textContent = onNow ? '🎵' : '🔇';
    toast(onNow ? '背景音樂：開' : '背景音樂：關', 1200);
  });
  on('#dex', 'click', dex);
  on('#train', 'click', training);
  on('#set', 'click', settings);
  on('#nfc', 'click', async () => {
    gesture();
    const ok = await enableInAppNfc();
    toast(ok ? '開好了！現在直接碰貼紙就能玩～' : '沒辦法開啟，請確認手機 NFC 有打開');
    if (ok) home();
  });
}

// ================= 遇到胖胖怪 =================
function encounterGate(id) {
  const n = NESTS[id];
  const fat = isFatToday(id);
  playMusic('home');
  sfx.alert();
  render(`<div class="screen center">
    <h1 class="title stroke">發現${n.emoji}${n.nest}！</h1>
    <div class="alert-mark">!</div>
    <div class="silhouette wobble">${monsterSVG(id)}</div>
    ${bunny(fat ? '窩裡有個<b>超級圓</b>的影子在動……今天牠變胖了，打倒牠有<b>雙倍元氣值</b>！' : '窩裡好像有東西在動……拿好手機，打開看看！')}
    <button class="btn big pulse" id="open">打開看看！</button>
    <button class="btn white small" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
  on('#open', 'click', async () => { await gesture(); encounter(id); });
}

async function encounter(id) {
  busy = true;
  const n = NESTS[id], exId = nestExercise(id), ex = EXERCISES[exId];
  const target = targetOf(exId), stage = stageOf(exId);
  const fat = isFatToday(id);
  playMusic('battle');
  say(n.taunt);
  const nextTxt = isMaxed(exId) ? '已經練到最高級！' : `再完成 ${toNext(exId)} 次升級 → ${targetOf(exId, stage + 1)}${ex.unit}`;
  await arIntro({
    monsterHTML: monsterSVG(id),
    speech: n.taunt,
    tag: fat ? '變胖了！×2' : ex.kind === 'hold' ? '肌耐力' : 'BATTLE',
    mission: `${ex.name} ${target} ${ex.unit}`,
    missionSub: `💪 Lv.${stage + 1}・${nextTxt}<br>${esc(ex.how)}`,
  });
  const r = await workout({
    exercise: exId, target, monsterHTML: monsterSVG(id, 'hurt'), level: stage + 1,
    label: n.monster, hurt: n.hurt, loseLine: n.lose,
  });
  if (r.status === 'quit') { busy = false; return home(); }
  await collect({ spiritHTML: spiritSVG(id), name: n.spirit });
  const lvBefore = level();
  const res = recordWin(id);
  const trainUp = recordExercise(exId);
  const perfect = !r.manual && r.hints === 0;
  const dres = recordDaily({
    nest: id, ex: exId, perfect,
    reps: ex.kind === 'reps' ? target : 0, hold: ex.kind === 'hold' ? target : 0,
  });
  busy = false;
  rewardScreen({
    spiritHTML: spiritSVG(id),
    banner: res.firstTime ? '收服成功！' : '再次消風！',
    title: res.firstTime ? `${n.spirit} 加入圖鑑` : `${n.monster} 又被打扁了`,
    gained: res.gained, doubled: res.doubled, levelUp: level() > lvBefore,
    trainUp, daily: dres, perfect,
    again: () => encounter(id),
  });
}

function nextHint() {
  const st = S();
  const nextNew = NEST_ORDER.find((id) => !st.collected[id]);
  if (nextNew) return `下一隻：去 <b>${NESTS[nextNew].emoji} ${NESTS[nextNew].nest}</b> 找 ${NESTS[nextNew].monster}！`;
  if (!st.bossWins) return '4 隻都收服了！<b>胖胖大王</b>出現了，回主畫面挑戰牠！';
  const fat = fatNestToday();
  if (isFatToday(fat)) return `今天變胖的是 <b>${NESTS[fat].monster}</b>，在 <b>${NESTS[fat].emoji} ${NESTS[fat].nest}</b>，去拿雙倍獎勵！`;
  return '今天的雙倍獎勵拿到了！還想運動的話，再打一次也有元氣值喔～';
}

function rewardScreen({ spiritHTML, banner, title, gained, doubled, levelUp = false, trainUp = null, daily: dres = null, perfect = false, again }) {
  const lv = level();
  stopMusic(0.2);
  const extra = [];
  if (perfect) extra.push('<div class="gain-row perfect">✨ 完美姿勢！一次都沒被提醒</div>');
  if (trainUp) {
    const e = EXERCISES[trainUp.ex];
    extra.push(`<div class="gain-row train"><span>💪 ${e.name} 升到 Lv.${trainUp.stage + 1}！</span><b>下次 ${trainUp.target}${e.unit}</b></div>`);
  }
  (dres?.newly || []).forEach((m) => extra.push(`<div class="gain-row mission"><span>📜 任務完成：${esc(m.text)}</span><b>+${m.reward}</b></div>`));
  if (dres?.bonus) extra.push(`<div class="gain-row chest"><span>🎁 今日任務全部完成！寶箱</span><b>+${BONUS}</b></div>`);
  render(`<div class="screen center">
    ${levelUp ? `<div class="lvup stroke">LEVEL UP! Lv.${lv}</div>` : ''}
    <div class="ribbon stroke">${esc(banner)}</div>
    <div class="clear-wrap"><div class="sunburst"></div>${spiritHTML}</div>
    <div class="stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
    <h1 class="title stroke" style="font-size:28px">${esc(title)}</h1>
    <div class="reward"><span id="gain">+0</span> ⚡</div>
    ${doubled ? '<span class="x2">×2 變胖獎勵</span>' : ''}
    ${extra.length ? `<div class="gain-list">${extra.join('')}</div>` : ''}
    <div class="pill">Lv.${lv}・總元氣值 ${S().energy}</div>
    ${bunny(nextHint())}
    <div class="row" style="width:100%">
      <button class="btn mint" id="again">再打一次</button>
      <button class="btn" id="home">回主畫面</button>
    </div>
  </div>`);
  confetti(); sfx.win();
  // 星星依序彈出（配合 CSS 動畫的延遲）
  const timers = [0, 1, 2].map((i) => setTimeout(() => sfx.star(i), 250 + i * 150));
  if (levelUp) timers.push(setTimeout(() => { sfx.levelUp(); say(`升級了！等級${cnNum(lv)}！`); }, 1900));
  else if (trainUp) timers.push(setTimeout(() => { sfx.levelUp(); say(`${EXERCISES[trainUp.ex].name}升級了！`); }, 1900));
  if (dres?.newly?.length) timers.push(setTimeout(() => sfx.catch(), 2600));
  timers.push(setTimeout(() => playMusic('home'), 3500));
  onCleanup(() => timers.forEach(clearTimeout));
  say(`收服成功！獲得${gained}元氣值${doubled ? '，雙倍獎勵！' : '！'}`);
  // 數字往上跳，配上投幣聲
  const el = $('#gain');
  let t0 = 0, raf = 0, lastCoin = 0;
  const step = (t) => {
    if (!t0) t0 = t + 700;
    const p = Math.max(0, Math.min(1, (t - t0) / 900));
    el.textContent = '+' + Math.round(gained * (1 - Math.pow(1 - p, 3)));
    if (p > 0 && p < 1 && t - lastCoin > 90) { sfx.coin(); lastCoin = t; }
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  onCleanup(() => cancelAnimationFrame(raf));
  on('#home', 'click', home);
  on('#again', 'click', async () => { await gesture(); again(); });
}

// ================= 胖胖大王 =================
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

async function bossIntro() {
  busy = true;
  playMusic('boss');
  say('哼哼！想打我？先跑完我的路線！');
  await arIntro({
    monsterHTML: bossSVG(),
    speech: '哼哼！想打我？先跑完我的路線！',
    tag: 'BOSS', boss: true,
    mission: '胖胖大王出招！',
    missionSub: `依序跑去 4 個窩感應，限時 ${BOSS.timeLimit / 60} 分鐘`,
    button: '接受挑戰！',
  });
  const seq = shuffle(NEST_ORDER);
  render(`<div class="screen center">
    <div style="width:150px" class="wobble">${bossSVG()}</div>
    <h1 class="title stroke">大王的路線</h1>
    <div class="seq">${seq.map((id, i) => `${i ? '<span class="arrow">▶</span>' : ''}<div class="s">${NESTS[id].emoji}</div>`).join('')}</div>
    <div class="card" style="width:100%;text-align:left;line-height:2;margin-top:14px">
      <div style="text-align:center"><div class="panel-head">限時 ${BOSS.timeLimit / 60} 分鐘</div></div>
      ${seq.map((id, i) => `<div><b>${i + 1}.</b> ${NESTS[id].emoji} ${NESTS[id].nest}</div>`).join('')}
    </div>
    ${bunny(`每碰一個窩，大王的肚子就會消一圈！全部跑完再做 <b>${targetOf(BOSS.exercise)} 下波比跳</b> 給牠最後一擊！`)}
    <button class="btn big pulse" id="go">開始計時！</button>
    <button class="btn white small" id="home">先不要</button>
  </div>`);
  on('#home', 'click', () => { busy = false; home(); });
  on('#go', 'click', () => {
    gesture();
    update((s) => (s.boss = { seq, idx: 0, deadline: Date.now() + BOSS.timeLimit * 1000, phase: 'run' }));
    sfx.boing();
    say(`開始！第一站，${NESTS[seq[0]].nest}！`);
    bossRun();
  });
}

function bossRun(msg = '', good = true) {
  busy = true;
  playMusic('boss');
  const b = S().boss;
  const next = b.seq[b.idx];
  const scale = 1 - b.idx * 0.15;
  render(`<div class="screen center">
    <div class="timer-box"><span style="font-size:28px">⏱️</span><span class="timer" id="timer">--</span></div>
    <div style="width:170px;transition:transform .4s;transform:scale(${scale})" class="wobble ${msg && good ? 'shake' : ''}">${bossSVG(b.idx ? 'hurt' : 'smug')}</div>
    <div class="hp boss-hp"><div class="lbl" style="color:#fff;text-shadow:0 2px 0 var(--ink)">👑 ${BOSS.name}<em>${b.seq.length - b.idx}/${b.seq.length}</em></div>
      <div class="bar"><i style="width:${((b.seq.length - b.idx) / b.seq.length) * 100}%"></i></div></div>
    ${msg ? `<div class="coach ${good ? 'good' : 'warn'}" style="position:static;transform:none">${msg}</div>` : ''}
    <div class="seq">
      ${b.seq.map((id, i) => `${i ? '<span class="arrow">▶</span>' : ''}<div class="s ${i < b.idx ? 'done' : i === b.idx ? 'next' : ''}">${NESTS[id].emoji}</div>`).join('')}
    </div>
    <h1 class="title stroke" style="font-size:28px">快去碰<br><span class="accent">${NESTS[next].emoji} ${NESTS[next].nest}</span>！</h1>
    <div class="card" style="padding:10px 14px"><p class="sub">${webNfcSupported() && nfcActive() ? '直接碰貼紙就好' : 'iPhone：碰貼紙後點上方通知，會自動接續進度'}</p></div>
    <button class="btn white small" id="giveup">放棄挑戰</button>
    ${DEBUG ? `<button class="btn sky small" id="dbg">模擬感應 ${NESTS[next].emoji}</button>` : ''}
  </div>`);
  const t = $('#timer');
  const tick = () => {
    if (S().boss?.phase !== 'run') { clearInterval(iv); return home(); }
    const left = Math.ceil((S().boss.deadline - Date.now()) / 1000);
    if (left <= 0) { clearInterval(iv); return bossFail(); }
    t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    t.classList.toggle('low', left <= 20);
    if (left === 30 || left === 10) say(`還有${left}秒！`);
  };
  const iv = setInterval(tick, 1000);
  tick();
  onCleanup(() => clearInterval(iv));
  on('#giveup', 'click', () => { update((s) => (s.boss = null)); busy = false; home(); });
  on('#dbg', 'click', () => bossScan(next));
}

function bossScan(id) {
  const b = S().boss;
  if (Date.now() > b.deadline) return bossFail();
  if (id === b.seq[b.idx]) {
    update((s) => (s.boss.idx += 1));
    sfx.pop(); vibrate([50, 30, 50]);
    if (S().boss.idx >= b.seq.length) {
      update((s) => (s.boss.phase = 'final'));
      say('路線跑完了！大王只剩一口氣！');
      return bossFinal();
    }
    const nx = S().boss.seq[S().boss.idx];
    say(`啵！大王肚子消一圈！下一站，${NESTS[nx].nest}！`);
    bossRun('啵！大王肚子消一圈！🎉', true);
  } else {
    sfx.oops();
    const want = b.seq[b.idx];
    say(`不是這裡喔，要先去${NESTS[want].nest}！`);
    bossRun(`不是這裡喔～要先去 ${NESTS[want].emoji} ${NESTS[want].nest}！`, false);
  }
}

function bossFail() {
  update((s) => (s.boss = null));
  busy = false;
  render(`<div class="screen center">
    <div class="ribbon stroke" style="background:linear-gradient(180deg,#9AA3C7,#6C7499)">TIME UP</div>
    <div style="width:180px" class="wobble">${bossSVG('happy')}</div>
    <h1 class="title stroke">時間到！</h1>
    ${bunny('大王趁機吃了一口洋芋片，回血一點點……沒關係，再來一次一定可以！')}
    <button class="btn big" id="retry">再挑戰一次！</button>
    <button class="btn white small" id="home">回主畫面</button>
  </div>`);
  stopMusic(0.2);
  sfx.fail();
  say('時間到了！大王回血一點點，再挑戰一次吧！');
  on('#home', 'click', home);
  on('#retry', 'click', async () => { await gesture(); bossIntro(); });
}

function bossFinal() {
  busy = true;
  playMusic('boss');
  render(`<div class="screen center">
    <div class="ribbon stroke" style="background:linear-gradient(180deg,#FF8A7A,#FF4D5E)">FINAL</div>
    <div style="width:140px" class="wobble shake">${bossSVG('hurt')}</div>
    <h1 class="title stroke">最後一擊！</h1>
    ${bunny(`大王只剩一口氣了！把手機放下來，<b>波比跳 ${targetOf(BOSS.exercise)} 下</b>打倒牠！`)}
    <div class="card" style="text-align:left;line-height:1.7;width:100%;margin-top:14px">
      <div style="text-align:center"><div class="panel-head">波比跳怎麼做</div></div>
      蹲下 → 雙手撐地、腳往後跳成伏地挺身姿勢 → 收腳 → 站起來跳起、手舉過頭，算一下
    </div>
    <button class="btn big pulse" id="go">開始最後一擊！</button>
    <button class="btn white small" id="giveup">放棄挑戰</button>
  </div>`);
  on('#giveup', 'click', () => { update((s) => (s.boss = null)); busy = false; home(); });
  on('#go', 'click', async () => {
    await gesture();
    const target = targetOf(BOSS.exercise);
    const r = await workout({
      exercise: BOSS.exercise, target, monsterHTML: bossSVG('hurt'), level: stageOf(BOSS.exercise) + 1,
      label: BOSS.name, hurt: ['我的皇冠歪了！', '不要再跳了啦～', '肚子好扁…'], loseLine: '噗咻咻咻～～大王變小了！',
    });
    if (r.status === 'quit') return bossFinal();
    await collect({ spiritHTML: spiritSVG('boss'), name: BOSS.spirit });
    const first = !S().bossWins;
    const lvBefore = level();
    recordBossWin(BOSS.reward);
    const trainUp = recordExercise(BOSS.exercise);
    const perfect = !r.manual && r.hints === 0;
    const dres = recordDaily({ boss: true, ex: BOSS.exercise, reps: target, perfect });
    busy = false;
    rewardScreen({
      spiritHTML: spiritSVG('boss'),
      banner: first ? 'BOSS CLEAR!' : '大王又倒了！',
      title: first ? '打倒胖胖大王！🏆' : `${BOSS.name} 第 ${S().bossWins} 次被打倒`,
      gained: BOSS.reward, doubled: false, levelUp: level() > lvBefore,
      trainUp, daily: dres, perfect,
      again: bossIntro,
    });
  });
}

// ================= 訓練等級（漸進式） =================
function training() {
  const where = (ex) => {
    if (ex === BOSS.exercise) return '👑 大王最後一擊';
    const id = NEST_ORDER.find((k) => NESTS[k].pool.includes(ex));
    return `${NESTS[id].emoji} ${NESTS[id].nest}${nestExercise(id) === ex ? '・<b>今天出這招</b>' : ''}`;
  };
  const card = (ex) => {
    const e = EXERCISES[ex], st = stageOf(ex), maxed = isMaxed(ex);
    const per = maxed ? 2 : 2 - toNext(ex);
    return `<div class="tcard ${timesDone(ex) ? '' : 'fresh'}">
      <div class="t-top"><span class="t-name">${e.name}</span><span class="t-lv">Lv.${st + 1}${maxed ? ' MAX' : ''}</span></div>
      <div class="t-target">${targetOf(ex)}<small>${e.unit}</small></div>
      <div class="t-pips">${[0, 1].map((i) => `<i class="${i < per ? 'on' : ''}"></i>`).join('')}
        <span>${maxed ? '已練到最高級' : `再 ${toNext(ex)} 次 → ${targetOf(ex, st + 1)}${e.unit}`}</span></div>
      <div class="t-where">${where(ex)}</div>
      <div class="t-how">${esc(e.how)}</div>
    </div>`;
  };
  const group = (title, kinds) => {
    const list = Object.keys(EXERCISES).filter((k) => kinds.includes(EXERCISES[k].kind));
    return `<h2 class="t-group stroke">${title}</h2><div class="tgrid">${list.map(card).join('')}</div>`;
  };
  render(`<div class="screen">
    <h1 class="title stroke" style="text-align:center">💪 訓練等級</h1>
    ${bunny('每種運動完成 <b>2 次</b>就會升一級，目標會慢慢變多，肌耐力一點一點練起來！')}
    ${group('肌耐力・撐住', ['hold'])}
    ${group('次數挑戰', ['reps'])}
    ${group('有氧', ['cardio'])}
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
}

// ================= 圖鑑 =================
function dex() {
  const st = S();
  const items = [...NEST_ORDER.map((id) => ({ id, got: st.collected[id], name: NESTS[id].spirit, sub: `${NESTS[id].emoji} 打倒 ${st.wins[id] || 0} 次` })),
    { id: 'boss', got: st.bossWins > 0, name: BOSS.spirit, sub: `👑 打倒 ${st.bossWins} 次` }];
  render(`<div class="screen">
    <h1 class="title stroke" style="text-align:center">📖 精靈圖鑑</h1>
    <div style="text-align:center"><span class="pill">收服 ${items.filter((i) => i.got).length} / ${items.length}</span></div>
    <div class="dex">
      ${items.map((i) => `<div class="card ${i.got ? '' : 'unk'} ${i.id === 'boss' ? 'boss' : ''}">${spiritSVG(i.id)}
        <div style="font-weight:900">${i.got ? i.name : '？？？'}</div><div class="sub" style="font-size:13px">${i.sub}</div></div>`).join('')}
    </div>
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
}

// ================= 設定 =================
function settings() {
  const st = S();
  render(`<div class="screen">
    <h1 class="title stroke" style="text-align:center">⚙️ 設定</h1>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <label class="field">勇者名字<input class="text" id="name" maxlength="10" value="${esc(st.name)}" /></label>
      <div class="toggle"><span>🎵 背景音樂</span><input type="checkbox" id="music" ${st.settings.music !== false ? 'checked' : ''} style="width:26px;height:26px" /></div>
      <div class="toggle"><span>💥 遊戲音效</span><input type="checkbox" id="sfx" ${st.settings.sfx !== false ? 'checked' : ''} style="width:26px;height:26px" /></div>
      <div class="toggle"><span>🔊 語音報數與提示</span><input type="checkbox" id="voice" ${st.settings.voice ? 'checked' : ''} style="width:26px;height:26px" /></div>
      <button class="btn small sky" id="test">測試語音</button>
    </div>
    <div class="card">
      <b>🏷️ 貼紙要寫入的網址</b>
      <p class="sub" style="font-size:13px;margin:4px 0 10px">用「NFC Tools」App →「寫」→「新增記錄」→「網址/URI」，每張貼紙寫一個。</p>
      <div class="urls">
        ${NEST_ORDER.map((id) => `<div><div style="font-weight:900">${NESTS[id].emoji} ${NESTS[id].nest}</div>
          <div class="url">${esc(tagUrl(id))}</div>
          <button class="btn small white copy" data-id="${id}" style="margin-top:8px">複製</button></div>`).join('')}
      </div>
    </div>
    <button class="btn" id="save">儲存並回主畫面</button>
    <button class="btn white small" id="reset" style="align-self:center">清除所有進度</button>
  </div>`);
  on('#music', 'change', (e) => { unlockAudio(); setMusicEnabled(e.target.checked); if (e.target.checked) playMusic('home'); });
  on('#test', 'click', () => { unlockAudio(); update((s) => (s.settings.voice = true)); $('#voice').checked = true; say('一！二！三！勇者加油！'); });
  $$('.copy').forEach((b) => on(b, 'click', async () => {
    try { await navigator.clipboard.writeText(tagUrl(b.dataset.id)); toast('已複製！'); } catch { toast('請長按網址手動複製'); }
  }));
  on('#save', 'click', () => {
    update((s) => {
      s.name = $('#name').value.trim() || s.name;
      s.settings.voice = $('#voice').checked;
      s.settings.music = $('#music').checked;
      s.settings.sfx = $('#sfx').checked;
    });
    setMusicEnabled(S().settings.music !== false);
    toast('儲存好了！');
    home();
  });
  on('#reset', 'click', () => {
    if (confirm('確定要清除所有進度嗎？元氣值和圖鑑都會歸零。')) { resetAll(); onboarding(); }
  });
}

// ================= 多分頁同步 =================
// 回到舊分頁、或別的分頁存了進度時：重新讀取存檔。
// 正在主畫面或大王跑關畫面的話，重新整理畫面（戰鬥中不打斷）。
function resync() {
  reload();
  if (document.querySelector('.map') || document.querySelector('#timer')) home();
}
window.addEventListener('storage', resync);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && resync());
window.addEventListener('pageshow', (e) => e.persisted && resync());

// ================= 啟動 =================
const n0 = params.get('n'), k0 = params.get('k');
if (n0) {
  history.replaceState(null, '', location.pathname + (DEBUG ? '?debug=1' : ''));
  handleScan(n0, k0);
} else if (!S().name) onboarding();
else home();
