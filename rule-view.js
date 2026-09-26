function petName(pets, color) {
  const pet = pets[color];
  if (typeof pet === "string") return pet;
  return pet?.[1] ?? `동물 ${color + 1}`;
}

export function ruleSummary(rules, progress, pets) {
  const parts = [];
  if (rules.goalColor !== null) {
    parts.push(progress.goalAchieved
      ? `수호 목표 ${petName(pets, rules.goalColor)} 완료`
      : `수호 목표: ${petName(pets, rules.goalColor)}를 먼저 완성`);
  }
  if (rules.marked.length) {
    const labels = rules.marked.map(({ lane, color }) =>
      `${lane + 1}번 ${petName(pets, color)} 전용`
    );
    parts.push(`표식 열: ${labels.join(", ")}`);
  }
  if (rules.sealedLane !== null) {
    parts.push(progress.sealOpened
      ? `봉인 해제: ${rules.sealedLane + 1}번 열 사용 가능`
      : `봉인: ${petName(pets, rules.unlockColor)} 완성 후 ${rules.sealedLane + 1}번 열 해제`);
  }
  return parts.length ? parts.join(" · ") : "기본 정렬 규칙";
}

export function laneRuleView(lane, rules, progress, pets) {
  const classes = [];
  const labels = [];
  const mark = rules.marked.find((entry) => entry.lane === lane);
  if (mark) {
    classes.push("marked-lane");
    labels.push(`${petName(pets, mark.color)} 전용 표식 열`);
  }
  const sealed = rules.sealedLane === lane;
  if (sealed) {
    classes.push(progress.sealOpened ? "seal-open" : "sealed-lane");
    labels.push(progress.sealOpened
      ? "봉인 해제"
      : `${petName(pets, rules.unlockColor)} 완성 전 잠김`);
  }
  return {
    classes,
    label: labels.join(", ") || "일반 열",
    locked: sealed && !progress.sealOpened,
    markedColor: mark?.color ?? null,
  };
}
