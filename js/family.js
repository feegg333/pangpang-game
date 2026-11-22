// 家庭成員：切換玩家、新增成員、本週家庭排行
import { render, on, $, $$, esc, bunny, toast } from './ui.js';
import {
  AVATARS, profileList, activeProfile, profileState, switchProfile, createProfile, deleteProfile, today,
} from './store.js';
import { REWARD } from './config.js';
import { activeSec, dateKey } from './progress.js';
import { sfx, say } from './audio.js';

// 最近 7 天（含今天）的運動統計
function weekStats(st) {
  const base = new Date(today() + 'T12:00:00');
  const t = { sec: 0, battles: 0, hold: 0, days: 0 };
  for (let i = 0; i < 7; i++) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    const l = (st.log || {})[dateKey(d)];
    if (!l) continue;
    t.sec += activeSec(l); t.battles += l.battles; t.hold += l.hold; if (l.battles) t.days++;
  }
  return t;
}

const fmtMin = (sec) => (sec >= 600 ? Math.round(sec / 60) : Math.round(sec / 6) / 10);

// 本週排行（依運動分鐘，同分比打怪次數）
export function ranking() {
  return profileList().map((p) => {
    const st = profileState(p.id);
    return { ...p, name: p.name || st.name || '勇者', lv: Math.floor((st.energy || 0) / REWARD.perLevel) + 1, streak: st.streak?.count || 0, week: weekStats(st) };
  }).sort((a, b) => b.week.sec - a.week.sec || b.week.battles - a.week.battles);
}

// 主畫面的小卡：家裡有 2 人以上才顯示
export function homeRankCard() {
  const list = ranking();
  if (list.length < 2) return '';
  const me = activeProfile();
  const i = list.findIndex((p) => p.id === me.id);
  const medal = ['🥇', '🥈', '🥉'][i] || `第 ${i + 1} 名`;
  const msg = i === 0
    ? (list[1].week.sec === list[0].week.sec ? '和大家平手，快去打一場拉開差距！' : `領先 ${esc(list[1].name)} ${fmtMin(list[0].week.sec - list[1].week.sec)} 分鐘，繼續保持！`)
    : `再 ${Math.max(0.1, fmtMin(list[i - 1].week.sec - list[i].week.sec))} 分鐘就追上 ${esc(list[i - 1].name)}！`;
  return `<button class="rank-card" id="rankCard">
    <span class="rc-medal">${medal}</span>
    <span class="rc-text"><b>本週家庭排行</b>${msg}</span>
    <span class="rc-faces">${list.slice(0, 4).map((p) => `<i class="${p.id === me.id ? 'me' : ''}">${p.avatar}</i>`).join('')}</span>
  </button>`;
}

// 家庭成員頁：onPicked(id) 在切換或新增後呼叫
export function familyPage({ onDone, onPicked, onNew }) {
  const me = activeProfile();
  const list = ranking();
  let armed = '';
  const draw = () => {
    render(`<div class="screen">
      <h1 class="title stroke" style="text-align:center">👨‍👩‍👧 家庭成員</h1>
      ${bunny('一支手機可以給全家人玩，每個人都有自己的進度。<b>點頭像換人</b>，碰貼紙時就會用目前的玩家。')}
      <div class="fam-list">
        ${list.map((p) => `<div class="fam ${p.id === me.id ? 'cur' : ''}">
          <button class="fam-main" data-id="${p.id}">
            <span class="fam-ava">${p.avatar}</span>
            <span class="fam-info"><b>${esc(p.name)}</b><small>Lv.${p.lv}・🔥 ${p.streak} 天・本週 ${fmtMin(p.week.sec)} 分鐘</small></span>
            <span class="fam-tag">${p.id === me.id ? '正在玩' : '換成他'}</span>
          </button>
          ${p.id !== me.id ? `<button class="fam-del ${armed === p.id ? 'armed' : ''}" data-del="${p.id}">${armed === p.id ? '確定刪除？' : '刪除'}</button>` : ''}
        </div>`).join('')}
      </div>
      <button class="btn mint" id="add">＋ 新增家庭成員</button>
      ${list.length >= 2 ? `<div class="card">
        <div style="text-align:center"><div class="panel-head">🏆 本週家庭排行</div></div>
        <div class="podium">${list.map((p, i) => `<div class="pod-row ${p.id === me.id ? 'me' : ''}">
          <span class="pod-rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
          <span class="pod-ava">${p.avatar}</span>
          <span class="pod-name">${esc(p.name)}</span>
          <span class="pod-val"><b>${fmtMin(p.week.sec)}</b> 分鐘<small>打怪 ${p.week.battles}・撐住 ${Math.round(p.week.hold)} 秒</small></span>
        </div>`).join('')}</div>
        <p class="c-note">依最近 7 天的運動分鐘排名（估算）</p>
      </div>` : ''}
      <button class="btn white" id="back">回去</button>
    </div>`);
    $$('.fam-main').forEach((b) => on(b, 'click', () => {
      const id = b.dataset.id;
      if (id !== me.id) { switchProfile(id); sfx.catch(); const p = activeProfile(); say(`${p.name}，換你囉！`); toast(`${p.avatar} ${p.name} 開始玩！`); }
      onPicked();
    }));
    $$('.fam-del').forEach((b) => on(b, 'click', () => {
      const id = b.dataset.del;
      if (armed !== id) { armed = id; sfx.warn(); return draw(); }
      deleteProfile(id); toast('已刪除'); familyPage({ onDone, onPicked, onNew });
    }));
    on('#add', 'click', () => newProfilePage({ onCreated: onNew, onCancel: () => familyPage({ onDone, onPicked, onNew }) }));
    on('#back', 'click', onDone);
  };
  draw();
}

export function newProfilePage({ onCreated, onCancel }) {
  const used = profileList().map((p) => p.avatar);
  let pick = AVATARS.find((a) => !used.includes(a)) || AVATARS[0];
  render(`<div class="screen center">
    <h1 class="title stroke">新增家庭成員</h1>
    <div class="card" style="width:100%;margin-top:14px">
      <div class="panel-head">選一個頭像</div>
      <div class="ava-grid">${AVATARS.map((a) => `<button class="ava ${a === pick ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
      <label class="field" style="margin-top:12px">名字
        <input class="text" id="pname" maxlength="10" placeholder="例如：媽媽、哥哥" />
      </label>
    </div>
    <button class="btn big" id="create">建立，開始冒險！</button>
    <button class="btn white small" id="cancel">取消</button>
  </div>`);
  $$('.ava').forEach((b) => on(b, 'click', () => {
    pick = b.dataset.a;
    $$('.ava').forEach((x) => x.classList.toggle('on', x === b));
    sfx.click();
  }));
  on('#create', 'click', () => {
    const name = $('#pname').value.trim();
    if (!name) { sfx.oops(); toast('先幫新成員取個名字吧！'); $('#pname').focus(); return; }
    createProfile(name, pick);
    sfx.catch();
    say(`${name}，歡迎加入！`);
    onCreated();
  });
  on('#cancel', 'click', onCancel);
}
