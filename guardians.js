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

export function createPetArtElement(document, pets, id) {
  const art = document.createElement("span");
  art.className = "pet-art";
  art.style.setProperty("--sprite-x", `${((id % 4) * 100) / 3}%`);
  art.style.setProperty("--sprite-y", `${(Math.floor(id / 4) * 100) / 3}%`);
  art.setAttribute("aria-hidden", "true");
  const fallback = document.createElement("span");
  fallback.className = "pet-fallback";
  fallback.textContent = Array.from(pets[id]?.[1] || "동물")[0];
  art.append(fallback);
  return art;
}

export function watchPetAtlas(ImageConstructor, root, src) {
  const probe = new ImageConstructor();
  probe.onload = () => {
    root.classList.remove("pet-atlas-failed");
    root.classList.add("pet-atlas-ready");
  };
  probe.onerror = () => {
    root.classList.remove("pet-atlas-ready");
    root.classList.add("pet-atlas-failed");
  };
  probe.src = src;
  return probe;
}
