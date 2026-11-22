// 「📅 運動紀錄」與「🏅 成就」頁面
import { render, on, $, $$, esc, bunny } from './ui.js';
import { today } from './store.js';
import { lastDays, totals, activeSec, kcal, dayLog, dateKey, ACHIEVEMENTS, ACH_REWARD, unlocked } from './progress.js';

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const fmtMin = (sec) => (sec >= 600 ? Math.round(sec / 60) : Math.round(sec / 6) / 10);

// 最近 7 天運動時間長條圖（單一系列：一個顏色、不需要圖例；點長條看細節）
function weekChart(days) {
  const W = 340, H = 190, L = 30, R = 8, T = 22, B = 30;
  const vals = days.map((d) => activeSec(d.log) / 60);
  const maxV = Math.max(...vals);
  const top = maxV <= 5 ? 5 : maxV <= 10 ? 10 : Math.ceil(maxV / 10) * 10;
  const ticks = [0, top / 2, top];
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L - R) / days.length, bw = Math.min(26, slot * 0.55);
  const maxIdx = maxV > 0 ? vals.indexOf(maxV) : -1;
  const bars = days.map((d, i) => {
    const v = vals[i], x = L + slot * i + (slot - bw) / 2, yy = y(v), h = (H - B) - yy;
    const isToday = d.key === today();
    const r = Math.min(4, h);
    const path = v > 0
      ? `M${x} ${H - B} V${yy + r} Q${x} ${yy} ${x + r} ${yy} H${x + bw - r} Q${x + bw} ${yy} ${x + bw} ${yy + r} V${H - B} Z`
      : '';
    return `<g class="bar" data-i="${i}">
      <rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T}" fill="transparent"/>
      ${path ? `<path d="${path}" fill="var(--purple)"/>` : `<rect x="${x}" y="${H - B - 2}" width="${bw}" height="2" rx="1" fill="#D9CCEA"/>`}
      ${i === maxIdx ? `<text x="${x + bw / 2}" y="${yy - 6}" text-anchor="middle" class="c-val">${fmtMin(v * 60)}</text>` : ''}
      <text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" class="c-axis ${isToday ? 'today' : ''}">${isToday ? '今天' : WD[d.date.getDay()]}</text>
    </g>`;
  }).join('');
  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="#E6DDF0" stroke-width="1"/>
    <text x="${L - 6}" y="${y(t) + 4}" text-anchor="end" class="c-axis">${t}</text>`).join('');
  return `<div class="chart-wrap">
    <svg viewBox="0 0 ${W} ${H}" class="week-chart" role="img" aria-label="最近 7 天每天的運動分鐘數">${grid}${bars}</svg>
    <div class="c-tip" id="ctip" hidden></div>
  </div>`;
}

function monthCalendar() {
  const now = new Date(today() + 'T12:00:00');
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1, 12), days = new Date(y, m + 1, 0).getDate();
  let active = 0;
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span class="cal-cell empty"></span>');
  for (let dd = 1; dd <= days; dd++) {
    const key = dateKey(new Date(y, m, dd, 12));
    const log = dayLog(key);
    const on = log && log.battles > 0;
    if (on) active++;
    cells.push(`<span class="cal-cell ${on ? 'on' : ''} ${key === today() ? 'today' : ''}" title="${key}">
      ${on ? '<i>🍩</i>' : ''}<b>${dd}</b></span>`);
  }
  return { html: `<div class="cal-head">${WD.map((w) => `<span>${w}</span>`).join('')}</div><div class="cal">${cells.join('')}</div>`, active, label: `${y} 年 ${m + 1} 月` };
}

export function recordsPage(goHome) {
  const days = lastDays(7);
  const wk = days.reduce((t, d) => {
    const l = d.log; if (!l) return t;
    t.battles += l.battles; t.hold += l.hold; t.reps += l.reps; t.kcal += kcal(l); t.sec += activeSec(l);
    return t;
  }, { battles: 0, hold: 0, reps: 0, kcal: 0, sec: 0 });
  const all = totals();
  const cal = monthCalendar();
  render(`<div class="screen">
    <h1 class="title stroke" style="text-align:center">📅 運動紀錄</h1>
    <div class="card">
      <div style="text-align:center"><div class="panel-head">最近 7 天</div></div>
      <div class="tiles">
        <div class="tile"><b>${wk.battles}</b><span>打怪次數</span></div>
        <div class="tile"><b>${fmtMin(wk.sec)}</b><span>運動分鐘</span></div>
        <div class="tile"><b>${Math.round(wk.hold)}</b><span>撐住秒數</span></div>
        <div class="tile"><b>${Math.round(wk.kcal)}</b><span>估計大卡</span></div>
      </div>
      <div class="c-title">每天運動分鐘數</div>
      ${weekChart(days)}
      <p class="c-note">點長條可以看當天細節</p>
    </div>
    <div class="card">
      <div style="text-align:center"><div class="panel-head">${cal.label}</div></div>
      <p class="sub" style="text-align:center;margin-bottom:8px">這個月運動了 <b style="color:var(--pink)">${cal.active}</b> 天</p>
      ${cal.html}
    </div>
    <div class="card">
      <div style="text-align:center"><div class="panel-head">全部累積</div></div>
      <div class="totals">
        <div><span>運動天數</span><b>${all.days} 天</b></div>
        <div><span>打怪次數</span><b>${all.battles} 次</b></div>
        <div><span>肌耐力撐住</span><b>${fmtMin(all.hold)} 分鐘</b></div>
        <div><span>次數運動</span><b>${all.reps} 下</b></div>
        <div><span>有氧</span><b>${fmtMin(all.cardio)} 分鐘</b></div>
        <div><span>完美姿勢</span><b>${all.perfect} 場</b></div>
      </div>
      <p class="c-note">運動分鐘與大卡都是粗略估算，當作鼓勵參考就好</p>
    </div>
    <button class="btn" id="home">回主畫面</button>
  </div>`);

  // 點長條顯示細節
  const tip = $('#ctip');
  $$('.week-chart .bar').forEach((g) => on(g, 'click', () => {
    const d = days[+g.dataset.i], l = d.log;
    $$('.week-chart .bar').forEach((x) => x.classList.toggle('sel', x === g));
    tip.hidden = false;
    tip.innerHTML = `<b>${d.date.getMonth() + 1}/${d.date.getDate()}（${WD[d.date.getDay()]}）</b>` + (l
      ? `運動 ${fmtMin(activeSec(l))} 分鐘・打怪 ${l.battles} 次<br>撐住 ${Math.round(l.hold)} 秒・次數 ${l.reps} 下${l.cardio ? `・有氧 ${Math.round(l.cardio)} 秒` : ''}`
      : '這天休息～');
  }));
  on('#home', 'click', goHome);
}

export function achievementsPage(goHome) {
  const list = ACHIEVEMENTS.map((a) => ({ ...a, at: unlocked(a.id), now: Math.min(a.goal, a.cur()) }));
  const got = list.filter((a) => a.at).length;
  render(`<div class="screen">
    <h1 class="title stroke" style="text-align:center">🏅 成就</h1>
    <div style="text-align:center"><span class="pill">解鎖 ${got} / ${list.length}</span></div>
    ${bunny(`每解鎖一個成就，再送 <b>${ACH_REWARD} 元氣值</b>！`)}
    <div class="ach-grid">
      ${list.map((a) => `<div class="ach ${a.at ? 'got' : ''}">
        <div class="ach-ico">${a.icon}</div>
        <div class="ach-name">${esc(a.name)}</div>
        <div class="ach-desc">${esc(a.desc)}</div>
        ${a.at ? `<div class="ach-date">${a.at.slice(5).replace('-', '/')} 解鎖</div>`
          : `<div class="ach-bar"><i style="width:${(a.now / a.goal) * 100}%"></i></div><div class="ach-date">${a.now} / ${a.goal}</div>`}
      </div>`).join('')}
    </div>
    <button class="btn" id="home">回主畫面</button>
  </div>`);
  on('#home', 'click', goHome);
}
