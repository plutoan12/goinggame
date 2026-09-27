import { rankRecords, scoreLabel } from "./leaderboard.js?v=ranks-4";
import { STAGES } from "./engine.js";

const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
// All saved user text is rendered as text, never HTML.
export function renderLeaderboard(container, store, current) {
  container.replaceChildren();
  container.append(
    node(
      "p",
      "자유 쌓기 규칙의 기기 내 기록입니다. 이전 규칙의 순위와 분리되며, 온라인 전체 유저 순위가 아니에요.",
      "rank-scope",
    ),
  );
  const form = node("form", undefined, "rank-profile");
  const label = node("label", "기록에 남길 이름");
  const input = node("input");
  input.value = store.name;
  input.maxLength = 24;
  input.autocomplete = "off";
  label.append(input);
  const submit = node("button", "이름 저장");
  submit.type = "submit";
  const notice = node("p", "", "rank-notice");
  notice.setAttribute("role", "status");
  form.append(label, submit);
  container.append(form, notice);
  const warning = () => {
    if (store.storageError)
      notice.textContent =
        "저장 공간에 접근할 수 없어 이번 실행에서만 유지돼요. 앱을 닫으면 기록이 사라질 수 있어요.";
  };
  warning();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    input.value = store.rename(input.value);
    notice.textContent = `앞으로 완료한 기록은 '${store.name}' 이름으로 저장돼요. 기존 기록의 이름은 유지해요.`;
    warning();
  });
  const filters = node("div", undefined, "rank-filters");
  function select(title, options, selected) {
    const label = node("label", title),
      control = node("select");
    for (const [value, text] of options) {
      const option = node("option", text);
      option.value = value;
      control.append(option);
    }
    control.value = String(selected);
    label.append(control);
    filters.append(label);
    return control;
  }
  const stage = select(
    "단계",
    STAGES.map((s, i) => [i + 1, `${i + 1} ${s.name}`]),
    current.stage,
  );
  const rule = select(
    "도전 방식",
    [
      ["moves", "이동 제한"],
      ["timed", "타임어택"],
    ],
    current.rule,
  );
  const group = select(
    "아이템 구분",
    [
      ["solo", "아이템 없이"],
      ["assisted", "아이템 사용"],
    ],
    current.assisted ? "assisted" : "solo",
  );
  const scope = select(
    "비교 범위",
    [
      ["board", "같은 배치"],
      ["stage", "단계 전체 · 참고용"],
    ],
    "board",
  );
  const summary = node("p", "", "rank-summary");
  const results = node("div", undefined, "rank-results");
  container.append(
    filters,
    summary,
    results,
    node(
      "p",
      "같은 단계·배치·도전 방식·아이템 구분끼리 비교해요. 동점은 공동 순위(1, 1, 3위). 타임어택은 일시정지·광고·애니메이션 시간을 제외한 0.1초 단위 기록입니다. 연습·실패는 제외하며 최근 200개 클리어 기록을 보관해요.",
      "rank-help",
    ),
  );
  function draw() {
    const ranked = rankRecords(store.records, {
      stage: Number(stage.value),
      rule: rule.value,
      assisted: group.value === "assisted",
      seed: scope.value === "board" ? current.seed >>> 0 : null,
    });
    summary.textContent = `${scope.value === "board" ? `배치 #${current.seed >>> 0}` : "서로 다른 배치이므로 참고용 순위"} · ${ranked.length}개 기록`;
    results.replaceChildren();
    if (!ranked.length) {
      results.append(
        node(
          "p",
          "아직 클리어 기록이 없어요. 여정 모드에서 한 판을 완료하면 자동으로 등록됩니다.",
          "rank-empty",
        ),
      );
      return;
    }
    const best = ranked[0];
    results.append(
      node("p", `최고 기록 ${scoreLabel(best)} · ${best.name}`, "rank-best"),
    );
    const table = node("table"),
      caption = node(
        "caption",
        `${STAGES[Number(stage.value) - 1].name} · ${rule.value === "moves" ? "적은 이동 수" : "짧은 시간"} 순`,
      );
    const head = node("thead"),
      tr = node("tr");
    for (const text of ["순위", "이름", "기록"]) {
      const th = node("th", text);
      th.scope = "col";
      tr.append(th);
    }
    head.append(tr);
    const body = node("tbody");
    for (const entry of ranked.slice(0, 20)) {
      const row = node("tr");
      if (entry.id === current.id) row.className = "rank-current";
      const rank = node("td", `${entry.rank}위`),
        name = node("td"),
        score = node("td", scoreLabel(entry));
      name.append(
        node("strong", entry.name),
        node(
          "small",
          `${new Date(entry.createdAt).toLocaleDateString("ko-KR")} · 배치 #${entry.seed}${entry.id === current.id ? " · 이번 기록" : ""}`,
        ),
      );
      if (entry.assisted)
        score.append(node("small", `아이템 ${entry.itemsUsed}회`));
      row.append(rank, name, score);
      body.append(row);
    }
    table.append(caption, head, body);
    results.append(table);
    if (ranked.length > 20)
      results.append(node("p", "상위 20개 기록을 표시합니다.", "rank-help"));
  }
  [stage, rule, group, scope].forEach((select) =>
    select.addEventListener("change", draw),
  );
  draw();
}
