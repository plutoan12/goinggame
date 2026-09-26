export const PET_ORDER = Object.freeze([12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

const TIMES = [
  90, 110, 130, 150, 180, 210, 240, 270, 300, 330,
  360, 390, 420, 450, 480, 510, 540, 570, 600, 660,
];

const rows = [
  ["첫걸음", 4, 4, 0, 2, []],
  ["햇살길", 5, 4, 1, 2, []],
  ["꽃들판", 6, 5, 1, 2, []],
  ["솔숲길", 7, 5, 2, 2, []],
  ["별빛뜰", 8, 6, 2, 2, ["goal"]],
  ["달맞이", 9, 6, 3, 2, ["goal"]],
  ["구름재", 10, 7, 3, 2, ["goal"]],
  ["바람고개", 11, 7, 4, 2, ["goal"]],
  ["수호숲", 12, 8, 4, 2, ["marked"]],
  ["수호문", 13, 8, 4, 2, ["marked"]],
  ["푸른마루", 14, 9, 5, 2, ["marked"]],
  ["별마루", 14, 9, 5, 2, ["marked"]],
  ["새벽뜰", 14, 10, 5, 2, ["sealed"]],
  ["달그늘", 14, 10, 5, 2, ["sealed"]],
  ["구름마당", 14, 10, 6, 2, ["sealed"]],
  ["바람마루", 14, 10, 6, 2, ["sealed"]],
  ["수호길", 14, 11, 6, 2, ["goal", "marked"]],
  ["별길", 14, 11, 6, 2, ["goal", "sealed"]],
  ["마지막 고개", 14, 11, 6, 2, ["marked", "sealed"]],
  ["열두 퍼즐", 14, 12, 6, 1, ["goal", "marked", "sealed"]],
];

export const STAGES = Object.freeze(rows.map((row, index) => Object.freeze({
  name: row[0],
  colors: row[1],
  capacity: row[2],
  hiddenDepth: row[3],
  blanks: row[4],
  ruleKinds: Object.freeze([...row[5]]),
  timeLimitMs: TIMES[index] * 1000,
})));

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
    petIds: PET_ORDER.slice(0, stage.colors),
  };
}

export function stageColumns(config) {
  return config.colors + config.blanks;
}
