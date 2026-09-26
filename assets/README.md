# 게임 그림

현재 게임은 `pixel-guardian-atlas.png`로 십이지신 12종 + 고양이·병아리 14종을 표시합니다. 순서는 쥐/소/호랑이/토끼, 용/뱀/말/양, 원숭이/닭/개/돼지, 고양이/병아리/빈 셀/빈 셀입니다. 물음표·목표·표식·봉인·해제·완성·선택·빈 열은 `pixel-special-atlas.png`의 고정 4×2 셀을 사용합니다. 앱 아이콘 원본은 `pixel-app-icon-source.png`입니다. 세 자산은 중국풍 장식 없이 포근한 16비트 픽셀 방향으로 제작했습니다. [최종 프롬프트 및 생성 기록](./pixel-art-prompt.md).

이전 `guardian-atlas-v3.png`와 `app-icon-source.png`는 생성 이력 보존용이며 현재 게임과 네이티브 아이콘 빌드에서는 사용하지 않습니다.

이전 `guardian-atlas-v2.png`(4×3 전신 12동물)와 `pet-atlas.png`(별도 고양이·병아리)는 보존하되 게임에서 더 이상 사용하지 않습니다. 이전 [생성·편집 프롬프트](./guardians-prompt.md)도 남겨둡니다. 아래는 이전 펫 테마 제작 기록입니다.

`pet-atlas.png`는 내장 image_gen 도구로 생성한 프로젝트용 단일 투명 스프라이트 시트입니다. 원작 영상의 에셋을 추출하거나 복제하지 않았습니다. 생성 이미지는 변경 없이 복사했고, CSS 배경 위치로 4 × 2 셀을 표시합니다.

순서: 강아지 / 고양이 / 젖소 / 곰 / 병아리 / 새싹 / 꽃 / 발바닥.

## 최종 생성 프롬프트

Use case: stylized-concept. Asset type: ONE production sprite atlas for a Korean cute pet sorting web game. Create a single wide 2:1 image, exactly 4 columns by 2 rows of equal square cells, no gutters. Each cell contains exactly one centered icon with equal scale, occupying about 78% of its cell, leaving clear padding. Top row left-to-right: cream puppy head with brown floppy ears; orange tabby kitten head; white cow head with black patches and pink muzzle; warm brown teddy bear head. Bottom row left-to-right: round yellow baby chick; fresh green two-leaf sprout; white daisy with golden center; lavender paw print with four toe pads. All eight are original unified charming hand-painted game sticker illustrations, bold soft dark-brown outlines, simple readable silhouettes, tiny friendly faces, subtle warm shading and highlights. Front view. Must remain distinguishable at 26px. Background genuinely transparent alpha across every cell; no squares, card frames, text, labels, shadows outside icon silhouettes, checkerboards, extra decoration or watermarks. Exact grid centers x=12.5%,37.5%,62.5%,87.5%, y=25%,75%. This is one sprite sheet asset, not a game mockup.
