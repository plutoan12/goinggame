// Unified 4x4 atlas: twelve animals, then cat/chick; final two cells are empty.
export const GUARDIANS = [
  ["mouse", "쥐", "#ede8df"],
  ["ox", "소", "#efe2cb"],
  ["tiger", "호랑이", "#f6e3c0"],
  ["rabbit", "토끼", "#f5ebe6"],
  ["dragon", "용", "#dfece2"],
  ["snake", "뱀", "#e8efd9"],
  ["horse", "말", "#ece0d5"],
  ["sheep", "양", "#f5f0db"],
  ["monkey", "원숭이", "#eddfce"],
  ["rooster", "닭", "#f4e9d7"],
  ["dog", "개", "#eee9da"],
  ["pig", "돼지", "#f3e1dd"],
  ["cat", "고양이", "#f6e5d1"],
  ["chick", "병아리", "#f6efc8"],
];

// Fixed 4x2 atlas order. Keep this mapping stable for saved UI state and CSS.
export const SPECIAL_SPRITES = Object.freeze({
  question: 0,
  goal: 1,
  marked: 2,
  sealed: 3,
  unlocked: 4,
  sparkle: 5,
  selection: 6,
  empty: 7,
});
