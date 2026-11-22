// 用 SVG 畫的可愛角色，不需要任何圖檔
import { NESTS } from './config.js';

const face = (mood = 'smug') => {
  const eyes = {
    smug: `<path d="M70 92 q10 -10 20 0" /><path d="M110 92 q10 -10 20 0" />`,
    happy: `<path d="M70 95 q10 -12 20 0" /><path d="M110 95 q10 -12 20 0" />`,
    hurt: `<path d="M70 86 l18 10 M70 98 l18 -10" /><path d="M112 86 l18 10 M112 98 l18 -10" />`,
    sleep: `<path d="M70 95 q10 8 20 0" /><path d="M110 95 q10 8 20 0" />`,
    open: `<circle cx="80" cy="92" r="7" fill="#3b2a2a"/><circle cx="120" cy="92" r="7" fill="#3b2a2a"/><circle cx="83" cy="89" r="2.4" fill="#fff"/><circle cx="123" cy="89" r="2.4" fill="#fff"/>`,
  }[mood];
  const mouth = {
    smug: `<path d="M88 114 q12 10 24 0" />`,
    happy: `<path d="M86 112 q14 16 28 0 z" fill="#ff7a8a"/>`,
    hurt: `<ellipse cx="100" cy="118" rx="7" ry="9" fill="#ff7a8a"/>`,
    sleep: `<ellipse cx="100" cy="116" rx="5" ry="4" fill="#ff7a8a"/>`,
    open: `<path d="M90 112 q10 10 20 0" />`,
  }[mood];
  return `
    <g fill="none" stroke="#3b2a2a" stroke-width="4" stroke-linecap="round">${eyes}${mouth}</g>
    <ellipse cx="66" cy="110" rx="9" ry="6" fill="#ff8fa8" opacity=".55"/>
    <ellipse cx="134" cy="110" rx="9" ry="6" fill="#ff8fa8" opacity=".55"/>`;
};

const body = (color, w = 78, h = 70) => `
  <ellipse cx="100" cy="178" rx="${w * 0.8}" ry="8" fill="#000" opacity=".12"/>
  <ellipse cx="100" cy="${172 - h}" rx="${w}" ry="${h}" fill="${color}" stroke="#3b2a2a" stroke-width="4"/>
  <ellipse cx="74" cy="${150 - h * 1.4}" rx="16" ry="10" fill="#fff" opacity=".5"/>
  <ellipse cx="70" cy="174" rx="16" ry="8" fill="${color}" stroke="#3b2a2a" stroke-width="4"/>
  <ellipse cx="130" cy="174" rx="16" ry="8" fill="${color}" stroke="#3b2a2a" stroke-width="4"/>`;

const accessories = {
  chips: `
    <g transform="translate(138 110) rotate(18)">
      <path d="M0 0 h34 l-4 44 h-26 z" fill="#ff5d5d" stroke="#3b2a2a" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="5" y="14" width="24" height="12" rx="3" fill="#ffe66b"/>
      <path d="M4 0 q4 -12 10 -4 q6 -12 10 0 q6 -10 8 0" fill="#ffd36b" stroke="#3b2a2a" stroke-width="3"/>
    </g>
    <path d="M86 128 q-6 8 2 12 q8 -2 4 -10" fill="#ffd36b" stroke="#3b2a2a" stroke-width="2.5"/>`,
  tea: `
    <g transform="translate(140 96)">
      <rect x="0" y="10" width="30" height="46" rx="6" fill="#f3dcc2" stroke="#3b2a2a" stroke-width="3.5"/>
      <circle cx="9" cy="46" r="4" fill="#3b2a2a"/><circle cx="20" cy="49" r="4" fill="#3b2a2a"/><circle cx="14" cy="38" r="4" fill="#3b2a2a"/>
      <rect x="-2" y="4" width="34" height="8" rx="3" fill="#fff" stroke="#3b2a2a" stroke-width="3"/>
      <path d="M18 4 l8 -26" stroke="#ff7aa8" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g fill="#3b2a2a"><circle cx="58" cy="130" r="5"/><circle cx="120" cy="146" r="5"/><circle cx="76" cy="154" r="5"/><circle cx="132" cy="70" r="4"/></g>`,
  donut: `
    <ellipse cx="100" cy="146" rx="84" ry="22" fill="#ff9ec4" stroke="#3b2a2a" stroke-width="4"/>
    <ellipse cx="100" cy="142" rx="70" ry="12" fill="#ffc7dd"/>
    <g stroke-width="4" stroke-linecap="round"><path d="M40 140 l8 -3" stroke="#7ad0ff"/><path d="M70 152 l8 2" stroke="#ffe66b"/><path d="M120 154 l8 -2" stroke="#8ee08e"/><path d="M152 138 l7 4" stroke="#fff"/></g>`,
  lazy: `
    <path d="M14 170 q-6 -40 30 -44 q56 -6 112 0 q36 4 30 44 z" fill="#7b9cff" stroke="#3b2a2a" stroke-width="4"/>
    <text x="150" y="44" font-size="22" font-weight="700" fill="#7b9cff" font-family="sans-serif">Z</text>
    <text x="166" y="26" font-size="15" font-weight="700" fill="#7b9cff" font-family="sans-serif">z</text>
    <path d="M60 50 q40 -34 80 0" fill="#ffe66b" stroke="#3b2a2a" stroke-width="3.5"/>
    <circle cx="100" cy="28" r="7" fill="#fff" stroke="#3b2a2a" stroke-width="3"/>`,
};

// 胖胖怪本體（mood: smug / hurt / sleep / happy）
export function monsterSVG(id, mood) {
  const n = NESTS[id];
  const m = mood || (id === 'lazy' ? 'sleep' : 'smug');
  const behind = id === 'lazy' ? accessories.lazy : '';
  const front = id === 'lazy' ? '' : accessories[id];
  return `<svg viewBox="0 0 200 190" class="monster-svg" aria-label="${n.monster}">
    ${behind}${body(n.color)}${face(m)}${front}</svg>`;
}

// 收服後的迷你精靈（有小翅膀）
export function spiritSVG(id) {
  const color = id === 'boss' ? '#ffd86b' : NESTS[id].color;
  const crown = id === 'boss'
    ? `<path d="M76 58 l8 -22 l16 14 l16 -14 l8 22 z" fill="#ffd34d" stroke="#3b2a2a" stroke-width="3.5" stroke-linejoin="round"/>`
    : '';
  return `<svg viewBox="0 0 200 190" class="spirit-svg">
    <g opacity=".9"><ellipse cx="46" cy="96" rx="30" ry="18" fill="#fff" stroke="#bde3ff" stroke-width="4" transform="rotate(-25 46 96)"/>
    <ellipse cx="154" cy="96" rx="30" ry="18" fill="#fff" stroke="#bde3ff" stroke-width="4" transform="rotate(25 154 96)"/></g>
    <circle cx="100" cy="104" r="48" fill="${color}" stroke="#3b2a2a" stroke-width="4"/>
    <ellipse cx="82" cy="80" rx="12" ry="7" fill="#fff" opacity=".6"/>
    ${crown}
    <g transform="translate(0 4) scale(1)">${face('happy').replace(/cy="110"/g, 'cy="112"')}</g>
    <g fill="#ffe66b"><path d="M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z"/><path d="M168 150 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z"/></g>
  </svg>`;
}

// 胖胖大王
export function bossSVG(mood = 'smug') {
  return `<svg viewBox="0 0 200 200" class="monster-svg boss">
    <path d="M10 196 q20 -40 50 -30 q20 -30 50 -10 q30 -26 60 6 q24 4 22 34 z" fill="#ffd36b" stroke="#3b2a2a" stroke-width="3.5"/>
    <ellipse cx="100" cy="112" rx="82" ry="74" fill="#c8a2ff" stroke="#3b2a2a" stroke-width="4"/>
    <ellipse cx="100" cy="140" rx="46" ry="34" fill="#e6d6ff"/>
    <ellipse cx="66" cy="70" rx="16" ry="10" fill="#fff" opacity=".5"/>
    <path d="M66 46 l10 -30 l24 20 l24 -20 l10 30 z" fill="#ffd34d" stroke="#3b2a2a" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="100" cy="34" r="6" fill="#ff5d8a"/>
    <g transform="translate(0 -6)">${face(mood)}</g>
  </svg>`;
}

// 兔子小跳跳（引導角色）
export function bunnySVG() {
  return `<svg viewBox="0 0 120 130" class="bunny-svg">
    <ellipse cx="42" cy="30" rx="13" ry="30" fill="#fff" stroke="#3b2a2a" stroke-width="3.5"/>
    <ellipse cx="42" cy="32" rx="6" ry="20" fill="#ffc2d4"/>
    <ellipse cx="78" cy="30" rx="13" ry="30" fill="#fff" stroke="#3b2a2a" stroke-width="3.5" transform="rotate(12 78 30)"/>
    <ellipse cx="78" cy="32" rx="6" ry="20" fill="#ffc2d4" transform="rotate(12 78 30)"/>
    <ellipse cx="60" cy="88" rx="44" ry="38" fill="#fff" stroke="#3b2a2a" stroke-width="3.5"/>
    <circle cx="46" cy="82" r="5" fill="#3b2a2a"/><circle cx="74" cy="82" r="5" fill="#3b2a2a"/>
    <circle cx="48" cy="80" r="1.8" fill="#fff"/><circle cx="76" cy="80" r="1.8" fill="#fff"/>
    <path d="M55 94 q5 6 10 0" fill="none" stroke="#3b2a2a" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="34" cy="96" rx="7" ry="4.5" fill="#ff8fa8" opacity=".6"/>
    <ellipse cx="86" cy="96" rx="7" ry="4.5" fill="#ff8fa8" opacity=".6"/>
    <path d="M24 64 q-14 -8 -10 6" fill="none" stroke="#ffb34d" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
