# 게임 그림

현재는 `guardian-atlas-v3.png` 하나로 십이지신 12종 + 고양이·병아리 14종을 표시합니다. 내장 image_gen으로 전체를 같은 얼굴 중심 비율·선·파스텔 색감의 4×4 투명 아틀라스로 생성하고 여백을 보정했습니다. 순서: 쥐/소/호랑이/토끼, 용/뱀/말/양, 원숭이/닭/개/돼지, 고양이/병아리/빈 셀/빈 셀. [최종 프롬프트 및 생성 기록](./guardians-v3-prompt.md).

이전 `guardian-atlas-v2.png`(4×3 전신 12동물)와 `pet-atlas.png`(별도 고양이·병아리)는 보존하되 게임에서 더 이상 사용하지 않습니다. 이전 [생성·편집 프롬프트](./guardians-prompt.md)도 남겨둡니다. 아래는 이전 펫 테마 제작 기록입니다.

`pet-atlas.png`는 내장 image_gen 도구로 생성한 프로젝트용 단일 투명 스프라이트 시트입니다. 원작 영상의 에셋을 추출하거나 복제하지 않았습니다. 생성 이미지는 변경 없이 복사했고, CSS 배경 위치로 4 × 2 셀을 표시합니다.

순서: 강아지 / 고양이 / 젖소 / 곰 / 병아리 / 새싹 / 꽃 / 발바닥.

## 최종 생성 프롬프트

Use case: stylized-concept. Asset type: ONE production sprite atlas for a Korean cute pet sorting web game. Create a single wide 2:1 image, exactly 4 columns by 2 rows of equal square cells, no gutters. Each cell contains exactly one centered icon with equal scale, occupying about 78% of its cell, leaving clear padding. Top row left-to-right: cream puppy head with brown floppy ears; orange tabby kitten head; white cow head with black patches and pink muzzle; warm brown teddy bear head. Bottom row left-to-right: round yellow baby chick; fresh green two-leaf sprout; white daisy with golden center; lavender paw print with four toe pads. All eight are original unified charming hand-painted game sticker illustrations, bold soft dark-brown outlines, simple readable silhouettes, tiny friendly faces, subtle warm shading and highlights. Front view. Must remain distinguishable at 26px. Background genuinely transparent alpha across every cell; no squares, card frames, text, labels, shadows outside icon silhouettes, checkerboards, extra decoration or watermarks. Exact grid centers x=12.5%,37.5%,62.5%,87.5%, y=25%,75%. This is one sprite sheet asset, not a game mockup.
