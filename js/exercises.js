// 動作偵測：用骨架關節點的角度與位置判斷每個運動
// MediaPipe 關節編號：0 鼻 / 11,12 肩 / 13,14 肘 / 15,16 腕 / 23,24 髖 / 25,26 膝 / 27,28 踝

const V = (lm, i, t = 0.5) => (lm[i]?.visibility ?? 1) > t;
const inFrame = (p) => p.x > 0.01 && p.x < 0.99 && p.y > 0.01 && p.y < 0.99;

function angle(a, b, c, ar) {
  const abx = (a.x - b.x) * ar, aby = a.y - b.y;
  const cbx = (c.x - b.x) * ar, cby = c.y - b.y;
  const d = Math.atan2(aby, abx) - Math.atan2(cby, cbx);
  let deg = Math.abs((d * 180) / Math.PI);
  return deg > 180 ? 360 - deg : deg;
}
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// 正面運動：要看得到頭、肩、髖、腳踝
function frontReady(lm) {
  const need = [0, 11, 12, 23, 24, 27, 28];
  return need.every((i) => V(lm, i, 0.55) && inFrame(lm[i]));
}

// 側面（棒式）：任一側的肩、髖、膝或踝看得到就行
function bestSide(lm) {
  const L = [11, 23, 25, 27], R = [12, 24, 26, 28];
  const score = (s) => s.reduce((t, i) => t + (lm[i]?.visibility ?? 0), 0);
  return score(L) >= score(R) ? L : R;
}
function sideReady(lm) {
  const [s, h, k, a] = bestSide(lm);
  return V(lm, s) && V(lm, h) && (V(lm, a) || V(lm, k));
}

// ---------------- 深蹲 ----------------
function squat() {
  let down = false, minAng = 180, count = 0;
  return {
    ready: frontReady,
    update(lm, now, ar) {
      const angs = [];
      if (V(lm, 23) && V(lm, 25) && V(lm, 27)) angs.push(angle(lm[23], lm[25], lm[27], ar));
      if (V(lm, 24) && V(lm, 26) && V(lm, 28)) angs.push(angle(lm[24], lm[26], lm[28], ar));
      if (!angs.length) return { lost: true };
      const k = angs.reduce((a, b) => a + b) / angs.length;
      let rep = false, hint = null;
      if (!down) {
        minAng = Math.min(minAng, k);
        if (k < 105) down = true;
        else if (k > 160 && minAng < 150) { hint = '再蹲低一點喔！'; minAng = 180; }
        else if (k > 160) minAng = 180;
      } else if (k > 160) {
        down = false; minAng = 180; count++; rep = true;
      }
      return { rep, progress: count, hint, good: down };
    },
  };
}

// ---------------- 開合跳 ----------------
function jack() {
  let open = false, half = null, count = 0;
  return {
    ready: frontReady,
    update(lm, now, ar) {
      if (![0, 11, 12, 15, 16, 27, 28].every((i) => V(lm, i, 0.4))) return { lost: true };
      const sw = Math.abs(lm[11].x - lm[12].x) * ar || 0.001;
      const feet = Math.abs(lm[27].x - lm[28].x) * ar;
      const armsUp = lm[15].y < lm[0].y && lm[16].y < lm[0].y;
      const armsDown = lm[15].y > lm[11].y && lm[16].y > lm[12].y;
      const legsOpen = feet > 1.35 * sw;
      const legsClosed = feet < 1.05 * sw;
      let rep = false, hint = null;
      if (!open) {
        if (armsUp && legsOpen) { open = true; half = null; }
        else if (armsUp) half = 'legs';
        else if (legsOpen) half = 'arms';
        if (armsDown && legsClosed && half) {
          hint = half === 'legs' ? '腳也要打開喔！' : '手要舉過頭喔！';
          half = null;
        }
      } else if (armsDown && legsClosed) {
        open = false; count++; rep = true;
      }
      return { rep, progress: count, hint, good: open };
    },
  };
}

// ---------------- 高抬腿（計時） ----------------
function knees() {
  const raised = { L: false, R: false };
  let lastRaise = 0, lastSide = '', time = 0, prev = 0, idleSince = 0;
  return {
    ready: frontReady,
    update(lm, now) {
      if (![11, 12, 23, 24, 25, 26].every((i) => V(lm, i, 0.4))) { prev = now; return { lost: true }; }
      const torso = Math.abs(mid(lm[23], lm[24]).y - mid(lm[11], lm[12]).y) || 0.2;
      let rep = false;
      for (const [side, h, k] of [['L', 23, 25], ['R', 24, 26]]) {
        const up = lm[k].y - lm[h].y < 0.42 * torso;
        if (up && !raised[side]) {
          raised[side] = true;
          if (side !== lastSide) { lastRaise = now; lastSide = side; rep = true; }
        } else if (!up && lm[k].y - lm[h].y > 0.6 * torso) raised[side] = false;
      }
      const dt = prev ? Math.min(now - prev, 200) : 0;
      prev = now;
      const active = now - lastRaise < 900;
      let hint = null;
      if (active) { time += dt / 1000; idleSince = 0; }
      else {
        if (!idleSince) idleSince = now;
        if (now - idleSince > 1500) { hint = '膝蓋抬高，繼續跑！'; idleSince = now; }
      }
      return { rep, progress: time, hint, good: active };
    },
  };
}

// ---------------- 棒式（計時，側面） ----------------
function plank() {
  let time = 0, prev = 0, badSince = 0, badType = '';
  return {
    ready: sideReady,
    update(lm, now, ar) {
      const [si, hi, ki, ai] = bestSide(lm);
      if (!V(lm, si, 0.4) || !V(lm, hi, 0.4)) { prev = now; return { lost: true }; }
      const s = lm[si], h = lm[hi];
      const a = V(lm, ai, 0.4) ? lm[ai] : lm[ki];
      const dx = Math.abs(s.x - a.x) * ar, dy = Math.abs(s.y - a.y);
      const horizontal = dx > 0.2 && dy < 0.6 * dx;
      // 髖部偏離「肩—踝」直線的程度：正值＝塌腰，負值＝屁股太高
      const t = (h.x - s.x) / ((a.x - s.x) || 0.0001);
      const lineY = s.y + (a.y - s.y) * t;
      const dev = (h.y - lineY) / (dx || 0.001);
      let type = '';
      if (!horizontal) type = 'up';
      else if (dev > 0.09) type = 'sag';
      else if (dev < -0.12) type = 'pike';
      const dt = prev ? Math.min(now - prev, 200) : 0;
      prev = now;
      let hint = null;
      if (!type) { time += dt / 1000; badSince = 0; badType = ''; }
      else {
        if (type !== badType) { badType = type; badSince = now; }
        if (now - badSince > 700) {
          hint = { up: '趴下來，手肘撐地～', sag: '腰塌了！肚子收緊！', pike: '屁股放低一點！' }[type];
          badSince = now + 1800; // 提醒後隔一下再講
        }
      }
      return { rep: false, progress: time, hint, good: !type };
    },
  };
}

// ---------------- 波比跳 ----------------
function burpee() {
  let refT = 0, phase = 'up', count = 0;
  return {
    ready: frontReady,
    update(lm, now) {
      if (![11, 12, 23, 24].every((i) => V(lm, i, 0.4))) return { lost: true };
      const tv = mid(lm[23], lm[24]).y - mid(lm[11], lm[12]).y; // 軀幹在畫面上的直立高度
      refT = Math.max(refT * 0.998, tv);
      const armsUp = V(lm, 15, 0.4) && V(lm, 16, 0.4) && lm[15].y < lm[0].y && lm[16].y < lm[0].y;
      let rep = false, hint = null;
      if (phase === 'up' && tv < 0.45 * refT) phase = 'down';
      else if (phase === 'down' && tv > 0.8 * refT) phase = 'stand';
      else if (phase === 'stand') {
        if (armsUp) { phase = 'up'; count++; rep = true; }
        else if (tv < 0.45 * refT) { hint = '起來要跳起來、手舉高喔！'; phase = 'down'; }
      }
      return { rep, progress: count, hint, good: phase !== 'up' };
    },
  };
}

const MAKERS = { squat, jack, knees, plank, burpee };
export function makeTracker(type) { return MAKERS[type](); }
