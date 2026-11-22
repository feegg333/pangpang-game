// 打倒胖胖怪！主流程
import { NESTS, NEST_ORDER, BOSS, EXERCISES, REWARD } from './config.js';
import {
  S, update, placeOf, fatNestToday, today, level, allCollected, recordWin, recordBossWin, resetAll, reload,
} from './store.js';
import { unlockAudio, say, sfx, vibrate } from './audio.js';
import { requestMotion } from './camera.js';
import { monsterSVG, spiritSVG, bossSVG, bunnySVG } from './monsters.js';
import { render, $, $$, on, onCleanup, esc, bunny, toast, confetti, params, DEBUG } from './ui.js';
import { arIntro, workout, collect } from './battle.js';
import { enableInAppNfc, setNfcHandler, webNfcSupported, nfcActive } from './nfc.js';

let busy = false; // 戰鬥中，忽略遊戲內感應

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
    <h1 class="title">這張貼紙<br>好像怪怪的…</h1>
    <p class="sub">可能是網址寫錯了，到「設定」可以看到正確的貼紙網址。</p>
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
}

// ================= 開場（第一次玩） =================
function onboarding() {
  render(`<div class="screen center">
    <h1 class="title">打倒<span class="accent">胖胖怪</span>！</h1>
    <div class="row" style="width:100%;max-width:360px">
      ${NEST_ORDER.map((id, i) => `<div class="wobble" style="animation-delay:${i * .3}s">${monsterSVG(id)}</div>`).join('')}
    </div>
    ${bunny('不好了！一群愛吃零食的<b>胖胖怪</b>偷偷住進你家了！快幫我用運動讓牠們消風，變回小精靈～')}
    <div class="card" style="width:100%">
      <label class="field">勇者，你叫什麼名字？
        <input class="text" id="name" maxlength="10" placeholder="元氣小勇者" />
      </label>
    </div>
    <button class="btn" id="start">開始冒險！</button>
    <p class="sub" style="font-size:13px">接下來會詢問相機和動作感測器權限，請按「允許」</p>
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
    <h1 class="title">先來練習一下！</h1>
    ${bunny('戰鬥的時候要把手機<b>放下來</b>，我才看得到你運動喔！')}
    <div class="card" style="text-align:left;width:100%;line-height:1.7">
      <b>📱 擺手機小撇步</b><br>
      ① 手機直立，靠著牆、書或椅腳<br>
      ② 鏡頭高度大約在膝蓋附近最好<br>
      ③ 往後退 2～3 步，<b>頭到腳</b>都要入鏡<br>
      ④ 虛線框變成<span style="color:#4CC38A;font-weight:800">綠色</span>就會開始倒數
    </div>
    <button class="btn" id="go">練習 3 下深蹲！</button>
    <button class="btn white small" id="skip">跳過練習</button>
  </div>`);
  on('#skip', 'click', afterTutorial);
  on('#go', 'click', async () => {
    await gesture();
    busy = true;
    const r = await workout({ exercise: 'squat', target: 3, monsterHTML: bunnySVG(), label: '練習', loseLine: '你好棒！' });
    busy = false;
    if (r === 'quit') return home();
    render(`<div class="screen center">
      <div style="width:150px">${bunnySVG()}</div>
      <h1 class="title">太厲害了！</h1>
      ${bunny('你已經學會了！現在去找胖胖怪吧！記得：<b>碰貼紙 → 看怪物 → 放下手機運動 → 拿起來收服</b>')}
      <button class="btn" id="next">出發！</button>
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

// ================= 主畫面 =================
function home() {
  const b = S().boss;
  if (b?.phase === 'run') return bossRun();
  if (b?.phase === 'final') return bossFinal();
  busy = false;
  const st = S();
  const lv = level();
  const pct = ((st.energy % REWARD.perLevel) / REWARD.perLevel) * 100;
  const fat = fatNestToday();
  const fatOpen = isFatToday(fat);
  const nextNew = NEST_ORDER.find((id) => !st.collected[id]);
  const tip = nextNew
    ? `快去 <b>${esc(placeOf(nextNew))}</b> 找 ${NESTS[nextNew].emoji} ${NESTS[nextNew].monster}！`
    : fatOpen
      ? `今天 <b>${NESTS[fat].monster}</b> 又偷吃東西變胖了！去 <b>${esc(placeOf(fat))}</b> 打倒牠拿<b>雙倍元氣值</b>！`
      : allCollected() && !st.bossWins
        ? '4 隻都收服了！<b>胖胖大王</b>出現了，快去挑戰牠！'
        : '今天的雙倍獎勵拿到了！想多賺元氣值，可以再去打任何一隻～';

  render(`<div class="screen">
    <div class="hud">
      <div class="pill">🦸 ${esc(st.name)}</div>
      <div class="pill">Lv.${lv}</div>
      <div class="pill">🔥 ${st.streak.count || 0} 天</div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-bottom:4px">
        <span>⚡ 元氣值 ${st.energy}</span><span>下一級 ${REWARD.perLevel - (st.energy % REWARD.perLevel)}</span>
      </div>
      <div class="energy-bar"><i style="width:${pct}%"></i></div>
    </div>
    ${bunny(tip)}
    <div class="nest-list">
      ${NEST_ORDER.map((id) => {
        const n = NESTS[id], ex = EXERCISES[n.exercise];
        const tag = isFatToday(id)
          ? '<span class="tag fat">😤 變胖了 ×2</span>'
          : st.collected[id]
            ? `<span class="tag ok">✨ 已收服 ×${st.wins[id] || 1}</span>`
            : '<span class="tag new">❓ 還沒遇到</span>';
        return `<div class="nest" data-id="${id}">
          <div class="ico">${st.collected[id] || isFatToday(id) ? monsterSVG(id) : `<div style="filter:brightness(0) opacity(.2)">${monsterSVG(id)}</div>`}</div>
          <div class="info"><div class="nm">${n.emoji} ${n.monster}</div>
            <div class="pl">📍 ${esc(placeOf(id))}・${ex.name} ${n.target}${ex.unit}</div></div>
          ${tag}
        </div>`;
      }).join('')}
    </div>
    <div class="card boss-card ${allCollected() ? '' : 'locked'}" style="display:flex;gap:12px;align-items:center">
      <div style="width:84px;flex:none">${bossSVG()}</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:19px">👑 ${BOSS.name}</div>
        <div class="sub" style="font-size:14px">${allCollected() ? `依序跑完 4 個窩＋波比跳 ${BOSS.target} 下・+${BOSS.reward}` : `收服 4 隻胖胖怪才會出現（${NEST_ORDER.filter((id) => st.collected[id]).length}/4）`}</div>
        ${allCollected() ? `<button class="btn small" id="boss" style="margin-top:8px">挑戰大王！</button>` : ''}
      </div>
    </div>
    ${webNfcSupported() && !nfcActive() ? `<button class="btn sky" id="nfc">📡 開啟遊戲內感應</button>` : ''}
    <div class="nav">
      <button class="btn yellow" id="dex">📖 精靈圖鑑</button>
      <button class="btn white" id="set">⚙️ 設定</button>
    </div>
    ${DEBUG ? '<p class="sub" style="text-align:center">🛠 除錯模式：點胖胖窩＝模擬感應</p>' : ''}
  </div>`);

  $$('.nest').forEach((el) => on(el, 'click', () => {
    const id = el.dataset.id;
    if (DEBUG) return handleScan(id, NESTS[id].key);
    toast(`走去 ${placeOf(id)}，用手機上緣碰 ${NESTS[id].emoji}${NESTS[id].nest} 的貼紙！`);
  }));
  on('#boss', 'click', async () => { await gesture(); bossIntro(); });
  on('#dex', 'click', dex);
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
  render(`<div class="screen center">
    <div class="pill">📍 ${esc(placeOf(id))}</div>
    <h1 class="title">咚咚！<br>你找到了 ${n.emoji} ${n.nest}！</h1>
    <div style="width:200px;filter:brightness(0) opacity(.25)" class="wobble">${monsterSVG(id)}</div>
    ${bunny(fat ? '窩裡有個<b>超級圓</b>的影子在動……今天牠變胖了，打倒牠有<b>雙倍元氣值</b>！' : '窩裡好像有東西在動……拿好手機，打開看看！')}
    <button class="btn" id="open">打開看看！</button>
    <button class="btn white small" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
  on('#open', 'click', async () => { await gesture(); encounter(id); });
}

async function encounter(id) {
  busy = true;
  const n = NESTS[id], ex = EXERCISES[n.exercise];
  const fat = isFatToday(id);
  say(n.taunt);
  await arIntro({
    monsterHTML: monsterSVG(id),
    speech: n.taunt,
    mission: `任務：${ex.name} ${n.target} ${ex.unit}`,
    missionSub: fat ? '😤 今天牠變胖了！打倒牠拿雙倍元氣值' : '讓牠消風，變回小精靈！',
  });
  const r = await workout({
    exercise: n.exercise, target: n.target, monsterHTML: monsterSVG(id, 'hurt'),
    label: n.monster, hurt: n.hurt, loseLine: n.lose,
  });
  if (r === 'quit') { busy = false; return home(); }
  await collect({ spiritHTML: spiritSVG(id), name: n.spirit });
  const res = recordWin(id);
  busy = false;
  rewardScreen({
    spiritHTML: spiritSVG(id),
    title: res.firstTime ? `收服 ${n.spirit}！` : `${n.monster} 又消風了！`,
    gained: res.gained, doubled: res.doubled,
    again: () => encounter(id),
  });
}

function nextHint() {
  const st = S();
  const nextNew = NEST_ORDER.find((id) => !st.collected[id]);
  if (nextNew) return `下一隻：去 <b>${esc(placeOf(nextNew))}</b> 找 ${NESTS[nextNew].emoji} ${NESTS[nextNew].monster}！`;
  if (!st.bossWins) return '4 隻都收服了！<b>胖胖大王</b>出現了，回主畫面挑戰牠！';
  const fat = fatNestToday();
  if (isFatToday(fat)) return `今天變胖的是 <b>${NESTS[fat].monster}</b>，在 <b>${esc(placeOf(fat))}</b>，去拿雙倍獎勵！`;
  return '今天的雙倍獎勵拿到了！還想運動的話，再打一次也有元氣值喔～';
}

function rewardScreen({ spiritHTML, title, gained, doubled, again }) {
  const lv = level();
  render(`<div class="screen center">
    <div style="width:190px">${spiritHTML}</div>
    <h1 class="title">${esc(title)}</h1>
    <div class="reward">+${gained} ⚡ ${doubled ? '<span class="x2">×2 變胖獎勵</span>' : ''}</div>
    <div class="pill">Lv.${lv}・總元氣值 ${S().energy}</div>
    ${bunny(nextHint())}
    <div class="row" style="width:100%">
      <button class="btn mint" id="again">再打一次</button>
      <button class="btn" id="home">回主畫面</button>
    </div>
  </div>`);
  confetti(); sfx.win();
  say(`收服成功！獲得${gained}元氣值${doubled ? '，雙倍獎勵！' : '！'}`);
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
  say('哼哼！想打我？先跑完我的路線！');
  await arIntro({
    monsterHTML: bossSVG(),
    speech: '哼哼！想打我？先跑完我的路線！',
    mission: '👑 胖胖大王出招！',
    missionSub: `依序跑去 4 個窩感應，限時 ${BOSS.timeLimit / 60} 分鐘`,
    button: '接受挑戰！',
  });
  const seq = shuffle(NEST_ORDER);
  render(`<div class="screen center">
    <div style="width:150px" class="wobble">${bossSVG()}</div>
    <h1 class="title">大王的路線</h1>
    <div class="card" style="width:100%;text-align:left;line-height:2">
      ${seq.map((id, i) => `<div><b>${i + 1}.</b> ${NESTS[id].emoji} ${NESTS[id].nest}・📍${esc(placeOf(id))}</div>`).join('')}
    </div>
    ${bunny(`每碰一個窩，大王的肚子就會消一圈！全部跑完再做 <b>${BOSS.target} 下波比跳</b> 給牠最後一擊！`)}
    <button class="btn" id="go">開始計時！</button>
    <button class="btn white small" id="home">先不要</button>
  </div>`);
  on('#home', 'click', () => { busy = false; home(); });
  on('#go', 'click', () => {
    gesture();
    update((s) => (s.boss = { seq, idx: 0, deadline: Date.now() + BOSS.timeLimit * 1000, phase: 'run' }));
    sfx.boing();
    say(`開始！第一站，${placeOf(seq[0])}！`);
    bossRun();
  });
}

function bossRun(msg = '', good = true) {
  busy = true;
  const b = S().boss;
  const next = b.seq[b.idx];
  const scale = 1 - b.idx * 0.15;
  render(`<div class="screen center">
    <div class="timer" id="timer">--</div>
    <div style="width:170px;transition:transform .4s;transform:scale(${scale})" class="wobble">${bossSVG(b.idx ? 'hurt' : 'smug')}</div>
    ${msg ? `<div class="coach ${good ? 'good' : 'warn'}" style="position:static;transform:none">${msg}</div>` : ''}
    <div class="seq">
      ${b.seq.map((id, i) => `<div class="s ${i < b.idx ? 'done' : i === b.idx ? 'next' : ''}">${NESTS[id].emoji}</div>`).join('')}
    </div>
    <h1 class="title" style="font-size:28px">快去 <span class="accent">${esc(placeOf(next))}</span><br>碰 ${NESTS[next].emoji} ${NESTS[next].nest}！</h1>
    <p class="sub">${webNfcSupported() && nfcActive() ? '直接碰貼紙就好' : 'iPhone：碰貼紙後點上方通知，會自動接續進度'}</p>
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
    say(`啵！大王肚子消一圈！下一站，${placeOf(nx)}！`);
    bossRun('啵！大王肚子消一圈！🎉', true);
  } else {
    sfx.oops();
    const want = b.seq[b.idx];
    say(`不是這裡喔，要去${placeOf(want)}！`);
    bossRun(`不是這裡喔～要先去 ${esc(placeOf(want))}！`, false);
  }
}

function bossFail() {
  update((s) => (s.boss = null));
  busy = false;
  render(`<div class="screen center">
    <div style="width:180px" class="wobble">${bossSVG('happy')}</div>
    <h1 class="title">時間到！</h1>
    ${bunny('大王趁機吃了一口洋芋片，回血一點點……沒關係，再來一次一定可以！')}
    <button class="btn" id="retry">再挑戰一次！</button>
    <button class="btn white small" id="home">回主畫面</button>
  </div>`);
  say('時間到了！大王回血一點點，再挑戰一次吧！');
  on('#home', 'click', home);
  on('#retry', 'click', async () => { await gesture(); bossIntro(); });
}

function bossFinal() {
  busy = true;
  render(`<div class="screen center">
    <div style="width:130px" class="wobble">${bossSVG('hurt')}</div>
    <h1 class="title">最後一擊！</h1>
    ${bunny(`大王只剩一口氣了！把手機放下來，<b>波比跳 ${BOSS.target} 下</b>打倒牠！`)}
    <div class="card" style="text-align:left;line-height:1.7;width:100%">
      <b>波比跳怎麼做：</b><br>蹲下 → 雙手撐地、腳往後跳成伏地挺身姿勢 → 收腳 → 站起來跳起、手舉過頭，算一下
    </div>
    <button class="btn" id="go">開始最後一擊！</button>
    <button class="btn white small" id="giveup">放棄挑戰</button>
  </div>`);
  on('#giveup', 'click', () => { update((s) => (s.boss = null)); busy = false; home(); });
  on('#go', 'click', async () => {
    await gesture();
    const r = await workout({
      exercise: BOSS.exercise, target: BOSS.target, monsterHTML: bossSVG('hurt'),
      label: BOSS.name, hurt: ['我的皇冠歪了！', '不要再跳了啦～', '肚子好扁…'], loseLine: '噗咻咻咻～～大王變小了！',
    });
    if (r === 'quit') return bossFinal();
    await collect({ spiritHTML: spiritSVG('boss'), name: BOSS.spirit });
    const first = !S().bossWins;
    recordBossWin(BOSS.reward);
    busy = false;
    rewardScreen({
      spiritHTML: spiritSVG('boss'),
      title: first ? '打倒胖胖大王！🏆' : '大王又被打倒了！',
      gained: BOSS.reward, doubled: false,
      again: bossIntro,
    });
  });
}

// ================= 圖鑑 =================
function dex() {
  const st = S();
  const items = [...NEST_ORDER.map((id) => ({ id, got: st.collected[id], name: NESTS[id].spirit, sub: `${NESTS[id].emoji} 打倒 ${st.wins[id] || 0} 次` })),
    { id: 'boss', got: st.bossWins > 0, name: BOSS.spirit, sub: `👑 打倒 ${st.bossWins} 次` }];
  render(`<div class="screen">
    <h1 class="title">📖 精靈圖鑑</h1>
    <p class="sub">收服 ${items.filter((i) => i.got).length} / ${items.length}</p>
    <div class="dex">
      ${items.map((i) => `<div class="card ${i.got ? '' : 'unk'}">${spiritSVG(i.id)}
        <div style="font-weight:800">${i.got ? i.name : '？？？'}</div><div class="sub" style="font-size:13px">${i.sub}</div></div>`).join('')}
    </div>
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', home);
}

// ================= 設定 =================
function settings() {
  const st = S();
  render(`<div class="screen">
    <h1 class="title">⚙️ 設定</h1>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <label class="field">勇者名字<input class="text" id="name" maxlength="10" value="${esc(st.name)}" /></label>
      <div class="toggle"><span>🔊 語音報數與提示</span><input type="checkbox" id="voice" ${st.settings.voice ? 'checked' : ''} style="width:26px;height:26px" /></div>
      <button class="btn small sky" id="test">測試語音</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <b>📍 胖胖窩放在哪裡？</b>
      ${NEST_ORDER.map((id) => `<label class="field">${NESTS[id].emoji} ${NESTS[id].nest}
        <input class="text place" data-id="${id}" maxlength="10" value="${esc(placeOf(id))}" style="font-size:17px;padding:8px" /></label>`).join('')}
    </div>
    <div class="card">
      <b>🏷️ 貼紙要寫入的網址</b>
      <p class="sub" style="font-size:13px;margin:4px 0 10px">用「NFC Tools」App →「寫」→「新增記錄」→「網址/URI」，每張貼紙寫一個。</p>
      <div class="urls">
        ${NEST_ORDER.map((id) => `<div><div style="font-weight:700">${NESTS[id].emoji} ${NESTS[id].nest}</div>
          <div class="url">${esc(tagUrl(id))}</div>
          <button class="btn small white copy" data-id="${id}" style="margin-top:4px">複製</button></div>`).join('')}
      </div>
    </div>
    <button class="btn" id="save">儲存並回主畫面</button>
    <button class="btn white small" id="reset" style="align-self:center">清除所有進度</button>
  </div>`);
  on('#test', 'click', () => { unlockAudio(); update((s) => (s.settings.voice = true)); $('#voice').checked = true; say('一！二！三！勇者加油！'); });
  $$('.copy').forEach((b) => on(b, 'click', async () => {
    try { await navigator.clipboard.writeText(tagUrl(b.dataset.id)); toast('已複製！'); } catch { toast('請長按網址手動複製'); }
  }));
  on('#save', 'click', () => {
    update((s) => {
      s.name = $('#name').value.trim() || s.name;
      s.settings.voice = $('#voice').checked;
      $$('.place').forEach((i) => { if (i.value.trim()) s.places[i.dataset.id] = i.value.trim(); });
    });
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
  if (document.querySelector('.nest-list') || document.querySelector('#timer')) home();
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
