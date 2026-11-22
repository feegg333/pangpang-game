// 遊戲設定：胖胖怪、貼紙密碼、獎勵數值都在這裡調整

// 每張貼紙網址裡的 k 參數。想換密碼就改這裡，然後重新寫入貼紙。
export const NESTS = {
  chips: {
    id: 'chips',
    key: 'p7k2',
    nest: '薯片窩',
    emoji: '🍟',
    defaultPlace: '客廳',
    monster: '薯薯胖',
    spirit: '薯薯精靈',
    color: '#FFD86B',
    exercise: 'squat',
    target: 15,
    taunt: '嘿嘿～洋芋片是我的！你蹲得下去嗎？',
    hurt: ['噗！', '我的洋芋片～', '不要再蹲了啦！'],
    lose: '噗咻～～我變小了……',
  },
  tea: {
    id: 'tea',
    key: 'm4q9',
    nest: '奶茶窩',
    emoji: '🧋',
    defaultPlace: '走廊',
    monster: '珍珠胖',
    spirit: '珍珠精靈',
    color: '#E8B98A',
    exercise: 'jack',
    target: 20,
    taunt: '咕嚕咕嚕～你追不到我啦！',
    hurt: ['我的珍珠飛走了！', '啵！', '咕嚕…咕嚕…'],
    lose: '珍珠全飛走了……噗咻～',
  },
  donut: {
    id: 'donut',
    key: 'x3v8',
    nest: '甜甜圈窩',
    emoji: '🍩',
    defaultPlace: '臥室',
    monster: '圈圈胖',
    spirit: '圈圈精靈',
    color: '#FF9EC4',
    exercise: 'knees',
    target: 30, // 秒
    taunt: '我有游泳圈，誰都踢不走我！',
    hurt: ['游泳圈要掉了！', '哎喲！', '慢一點啦～'],
    lose: '我的游泳圈……噗咻～',
  },
  lazy: {
    id: 'lazy',
    key: 'b6n1',
    nest: '懶骨頭窩',
    emoji: '🛋️',
    defaultPlace: '陽台',
    monster: '躺躺胖',
    spirit: '躺躺精靈',
    color: '#A8D8F0',
    exercise: 'plank',
    target: 30, // 秒
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
  target: 10,
  reward: 300,
};

export const REWARD = {
  base: 50,      // 每次讓胖胖怪消風
  fatBonus: 2,   // 今日變胖的那隻：倍數（每天限一次）
  perLevel: 300, // 每多少元氣值升一級
};

export const EXERCISES = {
  squat: { name: '深蹲', unit: '下', timed: false, view: 'front',
    tip: '手機直立放好，面對手機，全身入鏡' },
  jack: { name: '開合跳', unit: '下', timed: false, view: 'front',
    tip: '手機直立放好，面對手機，全身入鏡' },
  knees: { name: '高抬腿', unit: '秒', timed: true, view: 'front',
    tip: '手機直立放好，面對手機，全身入鏡' },
  plank: { name: '棒式', unit: '秒', timed: true, view: 'side',
    tip: '手機橫向立在地上，側身對著手機，頭到腳都要入鏡' },
  burpee: { name: '波比跳', unit: '下', timed: false, view: 'front',
    tip: '手機直立放好，面對手機，退遠一點讓全身入鏡' },
};
