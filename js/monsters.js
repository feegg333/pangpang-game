// 用 SVG 畫的可愛角色（漸層立體感 + 高光 + 眨眼），不需要任何圖檔
import { NESTS } from './config.js';

const INK = '#2B1B3D';
let seq = 0;
const uid = () => 'g' + (++seq).toString(36); // 每個 SVG 自己的漸層 id，避免互相干擾

// 把顏色調亮（amt>0）或調暗（amt<0）
function tint(hex, amt) {
  const c = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const ch = (v) => Math.round((t - v) * p + v).toString(16).padStart(2, '0');
  return '#' + ch(c >> 16) + ch((c >> 8) & 255) + ch(c & 255);
}

const defs = (u, color) => `<defs>
  <radialGradient id="${u}b" cx="36%" cy="28%" r="78%">
    <stop offset="0" stop-color="${tint(color, .6)}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${tint(color, -.28)}"/>
  </radialGradient>
  <radialGradient id="${u}k"><stop offset="0" stop-color="#FF6F9C" stop-opacity=".85"/><stop offset="1" stop-color="#FF6F9C" stop-opacity="0"/></radialGradient>
  <linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint(color, .1)}"/><stop offset="1" stop-color="${tint(color, -.3)}"/></linearGradient>
</defs>`;

// 胖嘟嘟的身體（下半部比較寬）
const BLOB = 'M100 46 C150 46 180 86 180 126 C180 164 148 180 100 180 C52 180 20 164 20 126 C20 86 50 46 100 46 Z';

function body(u, color, { arms = true } = {}) {
  return `
  <ellipse cx="100" cy="188" rx="66" ry="8" fill="${INK}" opacity=".14"/>
  <ellipse cx="70" cy="180" rx="19" ry="10" fill="url(#${u}f)" stroke="${INK}" stroke-width="4.5"/>
  <ellipse cx="130" cy="180" rx="19" ry="10" fill="url(#${u}f)" stroke="${INK}" stroke-width="4.5"/>
  ${arms ? `<ellipse cx="22" cy="132" rx="12" ry="17" transform="rotate(28 22 132)" fill="url(#${u}f)" stroke="${INK}" stroke-width="4.5"/>
  <ellipse cx="178" cy="132" rx="12" ry="17" transform="rotate(-28 178 132)" fill="url(#${u}f)" stroke="${INK}" stroke-width="4.5"/>` : ''}
  <path d="${BLOB}" fill="url(#${u}b)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="150" rx="48" ry="24" fill="#fff" opacity=".22"/>
  <path d="M164 104 C172 120 172 140 162 156" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35"/>
  <ellipse cx="66" cy="78" rx="18" ry="10" transform="rotate(-28 66 78)" fill="#fff" opacity=".85"/>
  <circle cx="88" cy="66" r="4.5" fill="#fff" opacity=".85"/>`;
}

const cheeks = (u, y = 128) => `
  <ellipse cx="60" cy="${y}" rx="14" ry="9" fill="url(#${u}k)"/>
  <ellipse cx="140" cy="${y}" rx="14" ry="9" fill="url(#${u}k)"/>`;

const shinyEye = (x, y) => `
  <ellipse cx="${x}" cy="${y}" rx="9.5" ry="12" fill="${INK}"/>
  <ellipse cx="${x}" cy="${y + 5}" rx="6" ry="4" fill="#6B4FA0" opacity=".7"/>
  <circle cx="${x + 3}" cy="${y - 4}" r="4" fill="#fff"/>
  <circle cx="${x - 3.5}" cy="${y + 5}" r="1.8" fill="#fff"/>`;

function face(u, mood) {
  const L = 78, R = 122, Y = 112;
  const S = `fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"`;
  switch (mood) {
    case 'open': // 閃亮大眼＋小虎牙
      return `<g class="eyes">${shinyEye(L, Y)}${shinyEye(R, Y)}</g>
        <path d="M91 130 q9 8 18 0" ${S}/><path d="M104 133 l2.5 5 l3 -5" fill="#fff" stroke="${INK}" stroke-width="2"/>${cheeks(u)}`;
    case 'smug': // 半瞇眼、得意笑
      return `<g class="eyes">
          <path d="M${L - 10} ${Y - 1} a10 10 0 0 0 20 0 z" fill="${INK}"/><circle cx="${L + 3}" cy="${Y + 3}" r="2.6" fill="#fff"/>
          <path d="M${R - 10} ${Y - 1} a10 10 0 0 0 20 0 z" fill="${INK}"/><circle cx="${R + 3}" cy="${Y + 3}" r="2.6" fill="#fff"/>
          <path d="M${L - 12} ${Y - 2} h24 M${R - 12} ${Y - 2} h24" ${S}/></g>
        <path d="M88 129 q10 9 22 -2" ${S}/><path d="M104 132 l2 5 l3 -5" fill="#fff" stroke="${INK}" stroke-width="2"/>${cheeks(u)}`;
    case 'hurt': // ＞＜ 眼、波浪嘴、冒汗
      return `<path d="M${L - 9} ${Y - 8} l16 8 l-16 8" ${S}/><path d="M${R + 9} ${Y - 8} l-16 8 l16 8" ${S}/>
        <path d="M86 134 q4 -6 8 0 q4 6 8 0 q4 -6 8 0 q4 6 8 0" ${S}/>
        <path d="M150 76 q8 12 0 18 q-8 -6 0 -18 z" fill="#9BE3FF" stroke="${INK}" stroke-width="3"/>${cheeks(u)}`;
    case 'sleep': // 閉眼＋口水泡泡
      return `<path d="M${L - 9} ${Y} q9 7 18 0" ${S}/><path d="M${R - 9} ${Y} q9 7 18 0" ${S}/>
        <ellipse cx="100" cy="132" rx="6" ry="5" fill="#B4385A" stroke="${INK}" stroke-width="3"/>
        <circle cx="116" cy="138" r="8" fill="#DFF6FF" stroke="${INK}" stroke-width="2.5" opacity=".9"/><circle cx="113" cy="135" r="2.4" fill="#fff"/>${cheeks(u, 124)}`;
    default: // happy：^^ 眼＋張嘴吐舌
      return `<path d="M${L - 9} ${Y + 3} q9 -12 18 0" ${S}/><path d="M${R - 9} ${Y + 3} q9 -12 18 0" ${S}/>
        <path d="M87 125 q13 18 26 0 z" fill="#8A2A45" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M93 132 q7 -6 14 0 q-7 6 -14 0 z" fill="#FF7A9A"/>${cheeks(u)}`;
  }
}

// ---------- 各胖胖怪的配件 ----------
const ACC = {
  chips: {
    behind: `<g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
        <rect x="72" y="18" width="16" height="44" rx="6" transform="rotate(-16 80 40)" fill="#FFD34D"/>
        <rect x="92" y="10" width="16" height="48" rx="6" fill="#FFE07A"/>
        <rect x="112" y="18" width="16" height="44" rx="6" transform="rotate(16 120 40)" fill="#FFD34D"/></g>
      <g fill="#E8A92A" opacity=".8"><rect x="96" y="16" width="3" height="10" rx="1.5"/><rect x="78" y="26" width="3" height="8" rx="1.5" transform="rotate(-16 80 30)"/></g>`,
    front: `<g transform="translate(140 116) rotate(14)">
        <path d="M0 6 L44 6 L40 58 Q22 64 4 58 Z" fill="#FF5D6C" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M-2 6 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l2 8 z" fill="#FF8A95" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="22" cy="32" r="13" fill="#FFE07A" stroke="${INK}" stroke-width="3"/>
        <text x="22" y="38" text-anchor="middle" font-size="15" font-weight="900" fill="${INK}" font-family="sans-serif">薯</text>
        <path d="M6 14 h30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>
      <path d="M14 108 q6 -10 14 -4 q8 -6 12 4 q-4 10 -13 8 q-10 2 -13 -8 z" fill="#FFD34D" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <g fill="#E8A92A"><circle cx="58" cy="164" r="3"/><circle cx="142" cy="170" r="2.5"/><circle cx="48" cy="150" r="2"/></g>`,
    color: '#FFCB57',
  },
  tea: {
    behind: `<g transform="rotate(14 112 30)">
        <rect x="104" y="0" width="16" height="64" rx="6" fill="#FF8FB8" stroke="${INK}" stroke-width="4"/>
        <path d="M104 14 l16 -8 M104 30 l16 -8 M104 46 l16 -8" stroke="#fff" stroke-width="4" opacity=".8"/></g>`,
    front: `<path d="M24 136 Q100 152 176 136 L174 150 Q100 166 26 150 Z" fill="#FFF3E2" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <text x="100" y="155" text-anchor="middle" font-size="12" font-weight="900" fill="#C27A4A" font-family="sans-serif">QQ</text>
      <g stroke="${INK}" stroke-width="3">${[[52, 166], [72, 172], [92, 175], [112, 174], [132, 171], [150, 165], [64, 160], [140, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#3B2430"/>`).join('')}</g>
      <g fill="#fff" opacity=".8">${[[50, 163], [70, 169], [90, 172], [110, 171], [130, 168], [148, 162], [62, 157], [138, 157]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>
      <g fill="#fff" stroke="#BDE6FF" stroke-width="2.5" opacity=".9"><circle cx="30" cy="70" r="7"/><circle cx="20" cy="50" r="4"/><circle cx="176" cy="66" r="5"/></g>`,
    color: '#E5B48A',
  },
  donut: {
    behind: '',
    top: `<path d="M48 76 C60 50 140 50 152 76 C150 86 140 80 136 92 C130 82 122 90 116 84 C108 96 100 86 92 92 C84 82 76 94 70 86 C64 92 54 84 48 76 Z" fill="#FFF0F6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <g stroke-width="4" stroke-linecap="round"><path d="M74 68 l6 -3" stroke="#59C7FF"/><path d="M100 60 l5 3" stroke="#FFC93C"/><path d="M124 68 l6 2" stroke="#7BE495"/><path d="M90 74 l2 5" stroke="#B48CFF"/></g>`,
    front: `<ellipse cx="100" cy="152" rx="92" ry="26" fill="#FF8DBA" stroke="${INK}" stroke-width="5"/>
      <ellipse cx="100" cy="146" rx="78" ry="14" fill="#FFC1D9"/>
      <path d="M22 146 Q100 120 178 146" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
      <g stroke-width="5" stroke-linecap="round"><path d="M36 150 l9 -3" stroke="#59C7FF"/><path d="M64 160 l8 3" stroke="#FFC93C"/><path d="M96 164 l9 0" stroke="#7BE495"/><path d="M128 160 l8 -3" stroke="#fff"/><path d="M158 150 l8 4" stroke="#B48CFF"/><path d="M140 140 l6 -4" stroke="#FFC93C"/><path d="M52 140 l-6 -4" stroke="#7BE495"/></g>`,
    color: '#FF9EC4',
  },
  lazy: {
    behind: `<path d="M4 186 C-4 132 30 112 60 118 C90 104 120 104 146 116 C176 110 206 132 196 186 Z" fill="#7B9CFF" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M30 140 q20 -14 40 -8 M132 128 q22 -4 40 12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>`,
    top: `<path d="M56 70 C70 34 120 28 146 58 C160 74 178 72 186 92" fill="none" stroke="${INK}" stroke-width="5"/>
      <path d="M52 74 C66 32 124 26 148 60 C162 76 176 76 184 94 L178 98 C166 84 150 86 140 74 C120 62 80 66 52 74 Z" fill="#5E7CFF" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M50 76 Q100 60 146 72" fill="none" stroke="#FFE07A" stroke-width="9" stroke-linecap="round"/>
      <path d="M50 76 Q100 60 146 72" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".3"/>
      <circle cx="184" cy="98" r="10" fill="#FFE07A" stroke="${INK}" stroke-width="4"/>`,
    front: `<g font-family="sans-serif" font-weight="900" fill="#fff" stroke="${INK}" stroke-width="2.5" paint-order="stroke">
        <text x="150" y="40" font-size="24">Z</text><text x="170" y="22" font-size="17">z</text><text x="184" y="10" font-size="12">z</text></g>`,
    color: '#A8D8F0',
  },
};

// 胖胖怪本體（mood: smug / open / hurt / sleep / happy）
export function monsterSVG(id, mood) {
  const n = NESTS[id], a = ACC[id];
  const u = uid();
  const m = mood || (id === 'lazy' ? 'sleep' : id === 'tea' ? 'open' : 'smug');
  return `<svg viewBox="-6 -6 212 202" class="monster-svg" role="img" aria-label="${n.monster}">
    ${defs(u, a.color)}${a.behind || ''}${body(u, a.color, { arms: id !== 'donut' })}${a.top || ''}${face(u, m)}${a.front || ''}</svg>`;
}

// 收服後的迷你精靈（小翅膀＋小配件）
const MINI = {
  chips: `<rect x="94" y="30" width="12" height="30" rx="5" fill="#FFE07A" stroke="${INK}" stroke-width="3.5"/>`,
  tea: `<path d="M100 56 v-20" stroke="${INK}" stroke-width="3.5"/><circle cx="100" cy="32" r="9" fill="#3B2430" stroke="${INK}" stroke-width="3"/><circle cx="97" cy="29" r="2.5" fill="#fff"/>`,
  donut: `<path d="M66 70 Q100 44 134 70" fill="none" stroke="#FFF0F6" stroke-width="12" stroke-linecap="round"/><path d="M66 70 Q100 44 134 70" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="1 0" opacity=".25"/><g stroke-width="4" stroke-linecap="round"><path d="M82 58 l5 -2" stroke="#59C7FF"/><path d="M104 52 l5 2" stroke="#FFC93C"/><path d="M120 60 l4 3" stroke="#7BE495"/></g>`,
  lazy: `<path d="M64 70 C74 38 120 36 136 62 L146 80 L136 82 C126 66 96 64 64 70 Z" fill="#5E7CFF" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="146" cy="84" r="7" fill="#FFE07A" stroke="${INK}" stroke-width="3"/>`,
  boss: `<path d="M72 64 l6 -26 l14 14 l8 -18 l8 18 l14 -14 l6 26 z" fill="#FFD34D" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="48" r="4" fill="#FF4D7A"/>`,
};
export function spiritSVG(id) {
  const color = id === 'boss' ? '#FFD86B' : ACC[id].color;
  const u = uid();
  return `<svg viewBox="0 0 200 190" class="spirit-svg" role="img" aria-label="精靈">
    ${defs(u, color)}
    <defs><linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#CFE9FF"/></linearGradient></defs>
    <g class="wings">
      <path d="M62 100 C30 60 6 80 14 104 C20 124 46 124 62 112 Z" fill="url(#${u}w)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M138 100 C170 60 194 80 186 104 C180 124 154 124 138 112 Z" fill="url(#${u}w)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M30 96 q12 -8 24 6 M170 96 q-12 -8 -24 6" fill="none" stroke="#9FD3FF" stroke-width="3" stroke-linecap="round"/>
    </g>
    <circle cx="100" cy="108" r="50" fill="url(#${u}b)" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="80" cy="84" rx="13" ry="7" transform="rotate(-25 80 84)" fill="#fff" opacity=".85"/>
    ${MINI[id] || ''}
    <g transform="translate(0 -6)">${face(u, 'happy')}</g>
    <g fill="#FFE07A" stroke="${INK}" stroke-width="2" stroke-linejoin="round">
      <path d="M28 34 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z"/>
      <path d="M170 146 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z"/>
      <path d="M176 30 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 z"/>
    </g>
  </svg>`;
}

// 胖胖大王：皇冠、披風、棒棒糖權杖、坐在零食山上
export function bossSVG(mood = 'smug') {
  const u = uid();
  const c = '#B992FF';
  return `<svg viewBox="-10 -14 220 230" class="monster-svg boss" role="img" aria-label="胖胖大王">
    ${defs(u, c)}
    <defs><linearGradient id="${u}cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5D7A"/><stop offset="1" stop-color="#C2304F"/></linearGradient>
      <linearGradient id="${u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE68A"/><stop offset="1" stop-color="#FFB800"/></linearGradient></defs>
    <path d="M30 80 C10 120 0 170 14 206 L186 206 C200 170 190 120 170 80 Z" fill="url(#${u}cape)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M-4 214 C6 182 30 176 48 188 C58 168 86 166 100 182 C116 164 146 168 154 188 C172 176 198 184 206 214 Z" fill="#FFD34D" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <g stroke="${INK}" stroke-width="3.5"><circle cx="30" cy="196" r="12" fill="#FF8DBA"/><circle cx="30" cy="196" r="4" fill="#FFD34D"/>
      <rect x="150" y="180" width="22" height="26" rx="4" fill="#FFF3E2"/><path d="M160 180 l4 -16" stroke="#FF8FB8" stroke-width="5"/></g>
    <g transform="translate(0 6)">${body(u, c)}</g>
    <path d="M60 46 L66 4 L86 28 L100 -4 L114 28 L134 4 L140 46 Z" fill="url(#${u}gold)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 46 h80" stroke="${INK}" stroke-width="5"/><rect x="60" y="38" width="80" height="10" fill="#FFB800" stroke="${INK}" stroke-width="4"/>
    <circle cx="100" cy="24" r="7" fill="#FF4D7A" stroke="${INK}" stroke-width="3"/><circle cx="76" cy="34" r="4.5" fill="#59C7FF" stroke="${INK}" stroke-width="2.5"/><circle cx="124" cy="34" r="4.5" fill="#7BE495" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="98" cy="21" r="2.2" fill="#fff"/>
    <g transform="translate(0 10)">
      ${mood === 'smug' ? `<path d="M64 92 l22 6 M136 92 l-22 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` : ''}
      ${face(u, mood)}
    </g>
    <g transform="translate(176 92) rotate(18)">
      <rect x="-4" y="10" width="8" height="70" rx="4" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="0" cy="0" r="20" fill="#FF8DBA" stroke="${INK}" stroke-width="4"/>
      <path d="M0 0 m-12 0 a12 12 0 0 1 24 0 a8 8 0 0 1 -16 0 a4 4 0 0 1 8 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// 兔子小跳跳（引導角色）
export function bunnySVG() {
  const u = uid();
  return `<svg viewBox="0 0 120 130" class="bunny-svg" role="img" aria-label="小跳跳">
    <defs><radialGradient id="${u}h" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#FFF8FB"/><stop offset="1" stop-color="#F1DDE8"/></radialGradient>
      <radialGradient id="${u}k"><stop offset="0" stop-color="#FF6F9C" stop-opacity=".8"/><stop offset="1" stop-color="#FF6F9C" stop-opacity="0"/></radialGradient></defs>
    <g class="ears">
      <ellipse cx="42" cy="30" rx="13" ry="30" transform="rotate(-8 42 30)" fill="url(#${u}h)" stroke="${INK}" stroke-width="3.5"/>
      <ellipse cx="42" cy="33" rx="6" ry="20" transform="rotate(-8 42 33)" fill="#FFB3CB"/>
      <ellipse cx="80" cy="30" rx="13" ry="30" transform="rotate(14 80 30)" fill="url(#${u}h)" stroke="${INK}" stroke-width="3.5"/>
      <ellipse cx="80" cy="33" rx="6" ry="20" transform="rotate(14 80 33)" fill="#FFB3CB"/>
    </g>
    <ellipse cx="60" cy="88" rx="45" ry="38" fill="url(#${u}h)" stroke="${INK}" stroke-width="3.5"/>
    <ellipse cx="42" cy="68" rx="10" ry="5" transform="rotate(-25 42 68)" fill="#fff"/>
    <g class="eyes"><ellipse cx="45" cy="84" rx="5.5" ry="7" fill="${INK}"/><ellipse cx="75" cy="84" rx="5.5" ry="7" fill="${INK}"/>
      <circle cx="47" cy="81" r="2.3" fill="#fff"/><circle cx="77" cy="81" r="2.3" fill="#fff"/></g>
    <path d="M57 93 l3 3 l3 -3" fill="#FF8FB1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M52 99 q4 4 8 0 q4 4 8 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="32" cy="96" rx="9" ry="6" fill="url(#${u}k)"/><ellipse cx="88" cy="96" rx="9" ry="6" fill="url(#${u}k)"/>
    <path d="M22 62 q-12 -10 -8 6 q2 6 8 2" fill="#FFB34D" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M16 56 l-4 -6 M20 54 l0 -7" stroke="#5CC870" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}
