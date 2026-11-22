// 戰鬥三階段：① AR 登場（拿著手機）② 運動戰鬥（手機放下）③ 收服精靈（拿起手機）
import { EXERCISES } from './config.js';
import { startCamera, stopCamera, trackOrientation, keepAwake, releaseAwake } from './camera.js';
import { loadPose, detect, drawSkeleton, resetSmoothing } from './pose.js';
import { makeTracker } from './exercises.js';
import { say, sfx, cnNum, vibrate, stopSpeech } from './audio.js';
import { render, $, on, onCleanup, sleep, DEBUG, esc } from './ui.js';

// ---------- 共用：後鏡頭 AR 舞台 ----------
async function arStage(innerHTML, uiHTML) {
  const root = render(`<div class="stage">
    <video playsinline muted></video>
    <div class="overlay">
      <div class="ar-monster enter" id="arObj">${innerHTML}</div>
    </div>
    ${uiHTML}
  </div>`);
  const video = $('video', root);
  onCleanup(stopCamera);
  try {
    await startCamera(video, 'environment');
  } catch {
    video.remove();
    $('.stage', root).classList.add('nocam');
  }
  const obj = $('#arObj', root);
  const k = window.innerWidth / 55;
  const stop = trackOrientation((dyaw, dpitch) => {
    const x = Math.max(-400, Math.min(400, dyaw * k));
    const y = Math.max(-300, Math.min(300, dpitch * k));
    obj.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  });
  onCleanup(stop);
  return root;
}

// ① 胖胖怪登場
export async function arIntro({ monsterHTML, speech, mission, missionSub, tag = 'BATTLE', button = '我準備好了！' }) {
  const root = await arStage(
    `<div class="speech">${esc(speech)}</div><div class="inner wobble">${monsterHTML}</div>`,
    `<div class="ui bottom">
       <div class="mission"><span class="m-tag">${esc(tag)}</span><br>${mission}<small>${missionSub}</small></div>
       <button class="btn big pulse" id="go">${button}</button>
     </div>`,
  );
  return new Promise((res) => on($('#go', root), 'click', () => { sfx.boing(); res(); }));
}

// ③ 收服精靈
export async function collect({ spiritHTML, name }) {
  say('拿起我拿起我！把精靈收進來！');
  const root = await arStage(
    `<div class="speech">點我收服！</div><div class="inner">${spiritHTML}</div>`,
    `<div class="ui bottom"><div class="mission"><span class="m-tag" style="background:var(--mint)">CATCH!</span><br>${esc(name)} 出現了！<small>拿起手機，點一下精靈收服牠 ✨</small></div></div>`,
  );
  return new Promise((res) => on($('#arObj', root), 'click', () => { sfx.ding(); vibrate([40, 40, 80]); res(); }));
}

// ② 運動戰鬥：回傳 'done' 或 'quit'
export function workout({ exercise, target, monsterHTML, label, hurt = [], loseLine = '' }) {
  const ex = EXERCISES[exercise];
  const timed = ex.timed;
  const root = render(`<div class="stage">
    <video class="mirror" playsinline muted></video>
    <canvas class="cam mirror"></canvas>
    <div class="guide-frame ${ex.view === 'side' ? 'side' : ''}"></div>
    <div class="ui top"><div class="battle-top">
      <div class="mini-monster"><div class="inner">${monsterHTML}</div></div>
      <div class="hp"><div class="lbl"><span>${esc(label)}</span><em>${ex.name} ${target}${ex.unit}</em></div><div class="bar"><i style="width:100%"></i></div></div>
    </div></div>
    <div class="coach" id="coach">小跳跳正在戴眼鏡… 🔍</div>
    <div class="big-count" id="count" hidden></div>
    <div class="ui bottom"><div class="row">
      <button class="btn white small" id="quit">離開</button>
      <button class="btn yellow small" id="skipGuide" hidden>直接開始</button>
      <button class="btn mint small" id="manual" hidden>${timed ? '開始計時' : '+1 下'}</button>
    </div></div>
  </div>`);
  const video = $('video', root), canvas = $('canvas', root);
  const coachEl = $('#coach', root), countEl = $('#count', root);
  const guideEl = $('.guide-frame', root), hpBar = $('.hp .bar > i', root);
  const mini = $('.mini-monster .inner', root);
  const manualBtn = $('#manual', root), skipBtn = $('#skipGuide', root);

  let state = 'loading', manual = false, manualRunning = false;
  let progress = 0, lastWhole = -1, readySince = 0, guideStart = 0, lostSince = 0, lostSaid = false;
  let raf = 0, alive = true, coachTimer = 0;
  const tracker = makeTracker(exercise);

  keepAwake();
  onCleanup(() => { alive = false; cancelAnimationFrame(raf); stopCamera(); releaseAwake(); stopSpeech(); });

  const coach = (text, cls = '', ms = 0) => {
    coachEl.hidden = false;
    coachEl.className = 'coach ' + cls;
    coachEl.textContent = text;
    clearTimeout(coachTimer);
    if (ms) coachTimer = setTimeout(() => { if (state === 'go') coachEl.hidden = true; }, ms);
  };

  const showProgress = () => {
    const p = Math.min(1, progress / target);
    hpBar.style.width = (1 - p) * 100 + '%';
    mini.style.transform = `scale(${1 - 0.5 * p})`;
    countEl.hidden = false;
    countEl.innerHTML = timed
      ? `${Math.max(0, Math.ceil(target - progress))}<small> 秒</small>`
      : `${Math.floor(progress)}<small> / ${target}</small>`;
  };

  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const POPS = ['POP!', '啵！', 'HIT!', 'NICE!', '噗！', 'GOOD!'];
  const stageEl = $('.stage', root);
  const bump = (big = true) => {
    restart(countEl, 'bump');
    restart(mini.firstElementChild, 'squash');
    restart(mini.parentElement, 'shake');
    if (!big) return;
    // 跳出打擊字 + 閃一下
    const pop = document.createElement('div');
    pop.className = 'hitpop';
    pop.textContent = POPS[(Math.random() * POPS.length) | 0];
    pop.style.left = 30 + Math.random() * 40 + '%';
    pop.style.top = 30 + Math.random() * 18 + '%';
    pop.style.color = ['#FFC93C', '#FF9CC2', '#8BF0BE', '#93CCFF'][(Math.random() * 4) | 0];
    stageEl.appendChild(pop);
    setTimeout(() => pop.remove(), 850);
    const fl = document.createElement('div');
    fl.className = 'flash';
    stageEl.appendChild(fl);
    setTimeout(() => fl.remove(), 300);
  };

  let resolveFn;
  const finished = new Promise((r) => (resolveFn = r));

  const onRep = () => {
    sfx.pop(); vibrate(30); bump();
    if (!timed) {
      const n = Math.floor(progress);
      say(cnNum(n), { interrupt: true, rate: 1.3 });
      if (n === target - 3) coach('最後三下！加油加油～', 'good', 1500);
      else if (n > 0 && n % 5 === 0 && hurt.length) coach(hurt[(n / 5) % hurt.length | 0], '', 1400);
    }
  };

  const onSecond = (remain) => {
    if (remain <= 0) return;
    sfx.tick();
    if ([20, 10].includes(remain)) say(`還有${cnNum(remain)}秒`, { interrupt: true });
    else if (remain <= 5) say(cnNum(remain), { interrupt: true, rate: 1.3 });
    if (remain === 15 && hurt.length) coach(hurt[0], '', 1400);
  };

  const finish = async () => {
    state = 'done';
    cancelAnimationFrame(raf);
    hpBar.style.width = '0%';
    mini.style.transform = 'scale(.35)';
    sfx.deflate(); vibrate([60, 60, 160]);
    countEl.hidden = true;
    const ko = document.createElement('div');
    ko.className = 'ko';
    ko.textContent = '消風啦！';
    $('.stage', root).appendChild(ko);
    coach(loseLine || '噗咻～～', 'good');
    coachEl.style.top = '58%';
    stopSpeech();
    say('成功了！' + (loseLine || ''));
    await sleep(2200);
    if (alive) resolveFn('done');
  };

  const startCountdown = async () => {
    state = 'countdown';
    skipBtn.hidden = true;
    guideEl.classList.add('ok');
    coachEl.hidden = true;
    const cd = document.createElement('div');
    cd.className = 'countdown';
    $('.stage', root).appendChild(cd);
    for (const n of [3, 2, 1]) {
      if (!alive) return;
      cd.innerHTML = `<span>${n}</span>`; sfx.tick(); say(cnNum(n), { interrupt: true, rate: 1.2 });
      await sleep(900);
    }
    cd.innerHTML = '<span>GO!</span>'; sfx.boing(); say('開始！', { interrupt: true });
    await sleep(500);
    cd.remove();
    guideEl.remove();
    state = 'go';
    showProgress();
    if (manual && timed) manualBtn.hidden = false;
  };

  const loop = (now) => {
    if (!alive || state === 'done') return;
    raf = requestAnimationFrame(loop);
    if (manual) {
      if (state === 'go' && timed && manualRunning) {
        const dt = loop.prev ? Math.min(now - loop.prev, 200) : 0;
        progress += dt / 1000;
        tickTimed();
      }
      loop.prev = now;
      return;
    }
    const lm = detect(video, now);
    drawSkeleton(canvas, video, lm, state === 'go' && loop.good ? '#8EE3C8' : '#FFD86B');
    const ar = video.videoWidth / (video.videoHeight || 1);

    if (state === 'guide') {
      if (lm && tracker.ready(lm)) {
        guideEl.classList.add('ok');
        if (!readySince) { readySince = now; sfx.ding(); coach('很好！不要動喔～', 'good'); }
        if (now - readySince > 1000) startCountdown();
      } else {
        guideEl.classList.remove('ok');
        readySince = 0;
        if (now - guideStart > 7000) {
          guideStart = now;
          say(ex.view === 'side' ? '側身對著手機，讓我看到你的頭和腳～' : '再退後一點，讓我看到你的腳～');
          coach(ex.view === 'side' ? '側身，頭到腳都要入鏡 📏' : '退後一點，腳也要入鏡 👣');
          skipBtn.hidden = false;
        }
      }
      return;
    }
    if (state !== 'go') return;

    const r = lm ? tracker.update(lm, now, ar) : { lost: true };
    if (r.lost) {
      if (!lostSince) lostSince = now;
      if (now - lostSince > 1500 && !lostSaid) {
        lostSaid = true; coach('勇者你去哪了？👀', 'warn'); say('勇者你去哪了？');
      }
      return;
    }
    if (lostSaid) coachEl.hidden = true;
    lostSince = 0; lostSaid = false;
    loop.good = r.good;
    if (r.hint) { coach(r.hint, 'warn', 1600); sfx.oops(); say(r.hint, { interrupt: true }); }
    if (timed) { progress = r.progress; tickTimed(); }
    else if (r.rep) { progress = r.progress; showProgress(); onRep(); if (progress >= target) finish(); }
  };

  function tickTimed() {
    showProgress();
    const whole = Math.floor(progress);
    if (whole !== lastWhole) { lastWhole = whole; if (whole > 0) { bump(whole % 3 === 0); onSecond(target - whole); } }
    if (progress >= target) finish();
  }

  // 手動 / 除錯：+1 或計時開關
  on(manualBtn, 'click', () => {
    if (state !== 'go') return;
    if (timed) {
      manualRunning = !manualRunning;
      manualBtn.textContent = manualRunning ? '暫停計時' : '繼續計時';
    } else {
      progress += 1; showProgress(); onRep(); if (progress >= target) finish();
    }
  });
  on(skipBtn, 'click', () => state === 'guide' && startCountdown());
  on($('#quit', root), 'click', () => { alive = false; resolveFn('quit'); });

  if (DEBUG) {
    const pad = document.createElement('div');
    pad.className = 'debug-pad';
    pad.innerHTML = `<button id="dbgRep">模擬 +${timed ? '5 秒' : '1 下'}</button><button id="dbgStart">跳過擺位</button>`;
    $('.stage', root).appendChild(pad);
    on('#dbgRep', 'click', () => {
      if (state !== 'go') return;
      progress += timed ? 5 : 1;
      if (timed) tickTimed(); else { showProgress(); onRep(); if (progress >= target) finish(); }
    });
    on('#dbgStart', 'click', () => state === 'guide' && startCountdown());
  }

  // 啟動：相機 + 模型同時載入
  (async () => {
    resetSmoothing();
    try {
      await startCamera(video, 'user');
    } catch {
      coach('打不開相機 😢 請到瀏覽器設定允許相機', 'warn');
      manual = true;
    }
    if (!manual) {
      try { await loadPose(); } catch { manual = true; }
    }
    if (!alive) return;
    if (manual) {
      coach(timed ? '偵測不到骨架，改用手動計時模式' : '偵測不到骨架，做完一下就按「+1 下」', 'warn', 2500);
      manualBtn.hidden = false;
      guideEl.remove();
      state = 'go';
      showProgress();
      raf = requestAnimationFrame(loop);
      return;
    }
    state = 'guide';
    guideStart = performance.now();
    coach(`📱 ${ex.tip}`);
    say(`把我放好，${ex.tip}`);
    raf = requestAnimationFrame(loop);
  })();

  return finished;
}
