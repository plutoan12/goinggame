export const PET_ORDER = Object.freeze([12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

const NAMES = [
  "첫걸음", "햇살길", "꽃들판", "솔숲길", "별빛뜰",
  "달맞이", "구름재", "바람고개", "수호숲", "수호문",
  "푸른마루", "별마루", "새벽뜰", "달그늘", "구름마당",
  "바람마루", "수호길", "별길", "마지막 고개", "수호봉",
  "이슬숲", "봄샘길", "산새뜰", "풀잎고개", "개울빛",
  "연꽃못", "느티숲", "비구름길", "노을들판", "은하재",
  "솔바람", "달개울", "별무리", "안개숲", "푸른호수",
  "억새길", "산들재", "단풍뜰", "새벽고원", "하늘마루",
  "눈꽃길", "서리숲", "동백뜰", "겨울샘", "해오름",
  "솔눈고개", "별서리", "달빛호수", "바람설원", "백두마루",
  "깊은숲", "푸른협곡", "천둥재", "고요한샘", "은빛폭포",
  "구름봉", "별의계곡", "달의정원", "하늘끝", "열두 퍼즐",
];

const CAPACITIES = [
  [4, 4, 5, 4, 5, 5, 6, 5, 6, 6],
  [6, 6, 7, 6, 7, 7, 8, 7, 8, 8],
  [8, 8, 9, 8, 9, 9, 10, 9, 10, 10],
  [9, 10, 10, 9, 10, 11, 11, 10, 11, 12],
  [10, 11, 11, 10, 12, 12, 13, 11, 13, 14],
  [12, 12, 13, 12, 13, 13, 14, 12, 14, 16],
].flat();

const COLORS = [
  [4, 5, 6, 5, 6, 7, 8, 6, 8, 8],
  [8, 9, 10, 8, 9, 10, 11, 9, 11, 11],
  [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
  [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
  [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
  [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
].flat();

const HIDDEN_DEPTHS = [
  [1, 1, 2, 1, 2, 2, 2, 1, 2, 2],
  [2, 3, 3, 2, 3, 4, 4, 3, 4, 4],
  [4, 5, 5, 4, 5, 6, 6, 5, 7, 7],
  [6, 7, 8, 6, 8, 9, 9, 7, 10, 10],
  [8, 9, 10, 8, 10, 11, 11, 9, 12, 12],
  [11, 11, 12, 10, 12, 12, 13, 11, 13, 15],
].flat();

const HOLDING_SLOTS = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3, 3, 2, 3, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 1, 2, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
].flat();

const TIMES = [
  [120, 140, 160, 140, 180, 200, 220, 180, 240, 240],
  [240, 270, 300, 240, 300, 330, 360, 300, 390, 420],
  [300, 330, 360, 300, 390, 420, 450, 360, 480, 540],
  [420, 450, 480, 420, 510, 540, 600, 480, 660, 720],
  [480, 540, 600, 480, 660, 720, 780, 600, 840, 900],
  [600, 660, 720, 600, 780, 840, 900, 720, 900, 1200],
].flat();

const EARLY_RULES = [
  [], [], [], [], ["goal"], ["goal"], ["goal"], ["goal"],
  ["marked"], ["marked"], ["marked"], ["marked"],
  ["sealed"], ["sealed"], ["sealed"], ["sealed"],
  ["goal", "marked"], ["goal", "sealed"], ["marked", "sealed"],
  ["goal", "marked", "sealed"],
];

const CHAPTER_RULES = [
  [], [], [], [], ["goal"], ["marked"], ["sealed"], [],
  ["goal", "marked"], ["goal", "marked", "sealed"],
];

const MAX_SOLUTION_STEPS = [80, 120, 160, 200, 240, 280];
const MIN_HIDDEN_RATIOS = [0.10, 0.35, 0.55, 0.65, 0.75, 0.85];

export const STAGES = Object.freeze(NAMES.map((name, index) => {
  const stage = index + 1;
  const offset = index % 10;
  const chapter = Math.floor(index / 10);
  const ruleKinds = index < EARLY_RULES.length ? EARLY_RULES[index] : CHAPTER_RULES[offset];
  const hasMarkedRule = ruleKinds.includes("marked");
  const markedCount = !hasMarkedRule ? 0
    : stage === 11 || stage === 12 || (stage >= 30 && stage % 10 === 0) ? 2
      : 1;
  return Object.freeze({
    name,
    colors: COLORS[index],
    capacity: CAPACITIES[index],
    hiddenDepth: HIDDEN_DEPTHS[index],
    blanks: stage === 60 ? 1 : offset === 3 || offset === 7 ? 3 : 2,
    holdingSlots: HOLDING_SLOTS[index],
    petOffset: index % 12,
    ruleKinds: Object.freeze([...ruleKinds]),
    markedCount,
    timeLimitMs: TIMES[index] * 1000,
    maxSolutionSteps: stage === 60 ? 320 : MAX_SOLUTION_STEPS[chapter],
    minHiddenRatio: stage === 60 ? 0.90 : MIN_HIDDEN_RATIOS[chapter],
  });
}));

function petIdsFor(stage) {
  if (stage.colors === PET_ORDER.length) return [...PET_ORDER];
  const zodiac = PET_ORDER.slice(2);
  return [
    PET_ORDER[0],
    PET_ORDER[1],
    ...Array.from(
      { length: stage.colors - 2 },
      (_, index) => zodiac[(stage.petOffset + index) % zodiac.length],
    ),
  ];
}

export function levelConfig(mode = "blind", round = 1) {
  const tier = Math.min(
    STAGES.length,
    Math.max(1, Number.isSafeInteger(round) ? round : 1),
  );
  const stage = STAGES[tier - 1];
  return {
    ...stage,
    ruleKinds: [...stage.ruleKinds],
    tier,
    steps: Math.min(1200, 180 + tier * 60),
    hidden: mode !== "practice",
    petIds: petIdsFor(stage),
  };
}

export function stageColumns(config) {
  return config.colors + config.blanks;
}

export function stageGroups() {
  const size = 10;
  return Array.from({ length: Math.ceil(STAGES.length / size) }, (_, index) => {
    const start = index * size + 1;
    const end = Math.min(STAGES.length, start + size - 1);
    return { start, end, label: `${start}~${end}단계` };
  });
}
