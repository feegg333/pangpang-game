// 遊戲設定：胖胖怪、貼紙密碼、獎勵數值都在這裡調整

// 每張貼紙網址裡的 k 參數。想換密碼就改這裡，然後重新寫入貼紙。
export const NESTS = {
  chips: {
    id: 'chips',
    key: 'p7k2',
    nest: '薯片窩',
    emoji: '🍟',
    monster: '薯薯胖',
    spirit: '薯薯精靈',
    color: '#FFD86B',
    pool: ['squat', 'squatHold'], // 每天輪流換招
    taunt: '嘿嘿～洋芋片是我的！你蹲得下去嗎？',
    hurt: ['噗！', '我的洋芋片～', '不要再蹲了啦！'],
    lose: '噗咻～～我變小了……',
  },
  tea: {
    id: 'tea',
    key: 'm4q9',
    nest: '奶茶窩',
    emoji: '🧋',
    monster: '珍珠胖',
    spirit: '珍珠精靈',
    color: '#E8B98A',
    pool: ['jack', 'armHold'],
    taunt: '咕嚕咕嚕～你追不到我啦！',
    hurt: ['我的珍珠飛走了！', '啵！', '咕嚕…咕嚕…'],
    lose: '珍珠全飛走了……噗咻～',
  },
  donut: {
    id: 'donut',
    key: 'x3v8',
    nest: '甜甜圈窩',
    emoji: '🍩',
    monster: '圈圈胖',
    spirit: '圈圈精靈',
    color: '#FF9EC4',
    pool: ['knees', 'balance'],
    taunt: '我有游泳圈，誰都踢不走我！',
    hurt: ['游泳圈要掉了！', '哎喲！', '慢一點啦～'],
    lose: '我的游泳圈……噗咻～',
  },
  lazy: {
    id: 'lazy',
    key: 'b6n1',
    nest: '懶骨頭窩',
    emoji: '🛋️',
    monster: '躺躺胖',
    spirit: '躺躺精靈',
    color: '#A8D8F0',
    pool: ['plank', 'bridge'],
    taunt: 'Zzz…再讓我躺五分鐘…',
    hurt: ['嗯？誰在吵…', '好啦好啦要起來了…', '呼…呼…'],
    lose: '睡飽了！噗咻～',
  },
};

export const NEST_ORDER = ['chips', 'tea', 'donut', 'lazy'];

export const BOSS = {
  name: '胖胖大王',
  spirit: '丸子大王精靈',
  timeLimit: 120, // 秒：依序跑完 4 個窩
  exercise: 'burpee',
  reward: 300,
};

// 漸進式訓練：每完成幾次同一種運動，就升一級、目標變多
export const PER_LEVEL = 2;

export const REWARD = {
  base: 50,      // 每次讓胖胖怪消風
  fatBonus: 2,   // 今日變胖的那隻：倍數（每天限一次）
  perLevel: 300, // 每多少元氣值升一級
};

// kind：reps＝算次數、hold＝肌耐力撐住（計時）、cardio＝有氧（計時）
// prog：起始目標 base，每升一級加 step，最多到 max
const FRONT = '手機直立放好，面對手機，全身入鏡';
const SIDE = '手機橫向立在地上，側身對著手機，頭到腳都要入鏡';
export const EXERCISES = {
  squat: { name: '深蹲', unit: '下', timed: false, kind: 'reps', view: 'front', tip: FRONT,
    how: '雙腳與肩同寬，屁股往後坐，蹲到大腿接近水平再站起來', prog: { base: 12, step: 2, max: 30 } },
  jack: { name: '開合跳', unit: '下', timed: false, kind: 'reps', view: 'front', tip: FRONT,
    how: '跳起來時雙手舉過頭、雙腳打開，再跳回併攏', prog: { base: 16, step: 3, max: 45 } },
  burpee: { name: '波比跳', unit: '下', timed: false, kind: 'reps', view: 'front', tip: '手機直立放好，面對手機，退遠一點讓全身入鏡',
    how: '蹲下 → 雙手撐地、腳往後跳 → 收腳 → 跳起來手舉高', prog: { base: 8, step: 1, max: 15 } },
  knees: { name: '高抬腿', unit: '秒', timed: true, kind: 'cardio', view: 'front', tip: FRONT,
    how: '原地跑步，膝蓋輪流抬到腰的高度', prog: { base: 20, step: 5, max: 60 } },
  plank: { name: '棒式', unit: '秒', timed: true, kind: 'hold', view: 'side', tip: SIDE,
    how: '手肘撐地，肩膀到腳踝保持一直線，肚子收緊', prog: { base: 20, step: 5, max: 90 } },
  squatHold: { name: '深蹲停留', unit: '秒', timed: true, kind: 'hold', view: 'front', tip: FRONT,
    how: '蹲下到大腿接近水平後停住，膝蓋不要超過腳尖太多', prog: { base: 15, step: 5, max: 60 } },
  armHold: { name: '側平舉撐住', unit: '秒', timed: true, kind: 'hold', view: 'front', tip: FRONT,
    how: '雙手往兩側打直平舉，和肩膀一樣高，撐住不要放下', prog: { base: 20, step: 5, max: 60 } },
  balance: { name: '單腳平衡', unit: '秒', timed: true, kind: 'hold', view: 'front', tip: FRONT,
    how: '抬起一隻腳站穩，時間過一半會提醒你換腳', prog: { base: 20, step: 5, max: 60 } },
  bridge: { name: '臀橋', unit: '秒', timed: true, kind: 'hold', view: 'side', tip: SIDE,
    how: '躺下、膝蓋彎曲腳踩地，把屁股抬高到肩膀和膝蓋成一直線', prog: { base: 15, step: 5, max: 60 } },
};
