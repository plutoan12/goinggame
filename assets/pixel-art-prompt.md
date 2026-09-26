# 열두 퍼즐 픽셀 아트 생성 기록

내장 `image_gen` 도구로 2026-09-26에 생성했습니다. 기존 그림은 동물 종과 구성만 참고했으며, 새 결과물은 중국풍 문자·문양·색조를 사용하지 않은 독립적인 16비트 픽셀 아트입니다. 생성본은 Sharp의 nearest-neighbor 리사이즈로 규격화했고, 수호동물 아틀라스의 마지막 두 셀은 완전 투명하게 비웠습니다.

## 수호동물 4×4 아틀라스

셀 순서: 쥐, 소, 호랑이, 토끼 / 용, 뱀, 말, 양 / 원숭이, 닭, 개, 돼지 / 고양이, 병아리, 빈 셀, 빈 셀.

```text
Use case: style-transfer
Asset type: production pixel-art sprite atlas for a cozy Korean mobile sorting puzzle
Input image: identity and exact species/order reference only
Primary request: redraw the fourteen animal guardians as true crisp 16-bit pixel art in one square 4 by 4 sprite sheet with equal square cells and no gutters.
Cell order, left-to-right and top-to-bottom: mouse, ox, tiger, rabbit; friendly fantasy dragon, snake, horse, sheep; monkey, rooster, dog, pig; orange tabby cat, yellow baby chick; transparent empty cell; transparent empty cell.
Style/medium: hand-pixeled 16-bit Korean indie game sprites, front-facing bust portraits, chunky 1-pixel dark olive outlines, limited warm pastel palette, simple readable silhouettes, subtle two-step shading, cozy and cheerful. Every animal uses the same scale and baseline and occupies about 72 percent of its cell. Distinguishable at 32 pixels.
Color palette: cream, apricot, muted leaf green, warm brown, butter yellow, soft coral accents.
Composition: exact 4x4 grid, centered one character per populated cell. No overlap across cells.
Constraints: genuinely transparent alpha background; cells 15 and 16 entirely transparent; no labels, no text, no card frames, no background blocks, no cast shadows outside silhouettes, no extra objects, no watermark. Preserve all fourteen species identities and exact order.
Avoid: Chinese motifs, red-and-gold festival palette, hanzi, zodiac medallions, scrollwork, glossy vector look, gradients, anti-aliased painterly edges, 3D rendering, realism.
```

## 특수 규칙 4×2 아틀라스

셀 순서: 물음표, 목표, 표식, 봉인 / 봉인 해제, 완성 반짝임, 선택 커서, 빈 열.

```text
Use case: stylized-concept
Asset type: production 16-bit pixel-art special-rule sprite atlas for a cozy Korean mobile sorting puzzle
Primary request: create one wide 2:1 transparent sprite sheet, exactly 4 columns by 2 rows of equal square cells with no gutters. One centered icon per cell, identical scale and crisp pixel density.
Cell order left-to-right, top-to-bottom:
1. mystery tile: a cream square tile with a large dark question mark;
2. goal: a small pennant flag with a star;
3. marked lane: a bold map-pin badge containing a tiny paw print;
4. sealed lane: a closed brass padlock;
5. unlocked seal: the same brass padlock opened;
6. success sparkle: three chunky four-point sparkles;
7. selection cursor: four separate pixel corner brackets forming an empty square;
8. empty lane: a simple downward arrow above three short horizontal pixel lines.
Style/medium: true hand-pixeled 16-bit game UI icons, chunky dark olive 1-pixel outlines, limited warm pastel palette, simple silhouettes, two-step shading, cozy Korean indie game look, readable at 20 to 32 pixels.
Color palette: cream, muted leaf green, apricot, butter yellow, warm brown, restrained coral and slate blue.
Composition: each symbol occupies 60 to 68 percent of its cell with generous equal transparent padding. Exact alignment to cell centers.
Constraints: genuinely transparent alpha background; no words, no letters except the single question-mark symbol in cell 1; no labels, no grid lines, no card backgrounds outside the mystery tile, no overlap between cells, no watermark. Each icon must remain distinguishable by shape without relying on color.
Avoid: Chinese motifs, hanzi, red-and-gold festival styling, zodiac medallions, scrollwork, gradients, glossy vector art, anti-aliased painterly edges, 3D rendering.
```

## 앱 아이콘

```text
Use case: style-transfer
Asset type: 1024x1024 mobile app icon source for the Korean puzzle game "열두 퍼즐"
Input image: composition and tiger identity reference only
Primary request: redraw the friendly orange tiger guardian as true polished 16-bit pixel art, peeking over and holding two cream square sorting tiles. On the two tiles, use a simple matching pair of muted leaf-green paw-shaped puzzle marks. The tiger is centered, large, cheerful and instantly readable at small app-icon sizes.
Style/medium: crisp hand-pixeled 16-bit Korean indie game art, chunky dark olive pixel outline, limited warm pastel palette, deliberate square pixel clusters, two-step highlights and shadows, no anti-aliased painterly brushwork.
Composition: square icon, tiger face and paws in upper two-thirds, two slightly overlapping cream tiles in lower third, generous safe margin around every edge.
Backdrop: simple solid muted leaf-green field with a subtle darker pixel checker pattern only; no scene and no decorative border.
Color palette: orange, cream, warm brown, muted leaf green, tiny soft coral accents.
Constraints: square RGBA PNG, full-bleed background, no text, no letters, no numbers, no watermark, no sharp details near the outer 12 percent safe zone. Keep the tiger and two-tile puzzle composition.
Avoid: Chinese motifs, hanzi, red-and-gold festival styling, zodiac medallions, scrollwork, gradients, glossy vector rendering, painterly texture, 3D, realism.
```
