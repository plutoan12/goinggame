# 열두 퍼즐 · 동물 정렬 퍼즐

열두 수호동물과 고양이·병아리를 같은 종류끼리 한 줄씩 완성하는 한국어 정렬 퍼즐입니다. 원작 에셋을 복사하지 않았으며, 중국풍 문자·문양 없이 포근한 16비트 픽셀 그래픽과 한글 메뉴로 구성했습니다. iOS·Android 설치형 앱은 Capacitor로 패키징합니다.

## 실행

```sh
npm ci
npm test
npm run build
python3 -m http.server 4173 -d dist
```

`http://localhost:4173`에서 실행합니다. 모바일 준비와 배포 상태는 [MOBILE.md](./MOBILE.md), [RELEASE.md](./RELEASE.md)를 참고하세요.

## 게임 규칙

- 맨 위 동물 한 마리를 공간이 남은 다른 열로 옮깁니다. 다른 동물 위에도 임시로 쌓을 수 있습니다.
- 비어 있지 않은 모든 열을 한 종류로 가득 채우면 클리어합니다. 같은 동물 3개가 모여도 사라지지 않습니다.
- 숨겨진 타일은 위 타일을 치우면 공개됩니다. 연습 모드는 같은 보드를 모두 공개하고 제한 없이 진행합니다.
- 여정에서는 이동 횟수 제한 또는 타임어택 중 하나를 선택합니다. 제한 소진이나 실제 이동 불가가 게임오버이며 마지막 수의 완성이 우선합니다.
- 되돌리기 3개, 한 열 공개 2개, 보조 칸 1개를 판마다 제공합니다. 현재 플레이 화면에는 광고나 광고 보상 버튼이 없습니다.
- 첫 실행에는 고양이·병아리 4열 × 3칸 안내판이 열립니다. 튜토리얼 기록은 본게임·진행·순위와 분리됩니다.

## 20단계 여정

처음에는 1단계만 열리고 클리어할 때마다 다음 단계가 해제됩니다. 다섯 장에 각 네 단계가 있습니다.

| 구간 | 보드 변화 | 특수 규칙 |
| --- | --- | --- |
| 1~4 첫걸음–솔숲길 | 6~9열, 세로 4~5칸, 4~7종 | 기본 정렬 |
| 5~8 별빛뜰–바람고개 | 10~13열, 세로 6~7칸, 8~11종 | 지정 동물을 먼저 완성하는 목표 |
| 9~12 수호숲–별마루 | 14~16열, 세로 8~9칸, 12~14종 | 지정 동물 전용 표식 열 |
| 13~16 새벽뜰–바람마루 | 16열, 세로 10칸, 14종 | 해제 동물 완성 전 봉인 열 |
| 17~20 수호길–열두 퍼즐 | 16열, 세로 11~12칸, 14종 | 목표·표식·봉인 조합, 마지막은 빈 열 1개 |

각 단계는 시드 기반으로 생성되며, 생성기가 함께 만든 해법을 동일한 규칙 엔진으로 재생해 풀 수 있는지 검증합니다. 자동 테스트는 2,000개의 특수 규칙 보드를 재생합니다.

## 기기 안 순위와 저장

여정 클리어 기록만 현재 기기 안 순위에 등록됩니다. 온라인 전체 순위가 아니며 서버·로그인·결제가 없습니다.

- 이동 제한은 적은 이동 수, 타임어택은 짧은 실제 플레이 시간 순입니다.
- 단계·방식·같은 배치·아이템 사용 여부를 나눠 비교하고 동점은 공동 순위로 표시합니다.
- 최근 200개 기록을 보관하고, 동일한 시도의 중복 등록을 막습니다.
- 저장 키는 `twelve-puzzle-game-v3`, `twelve-puzzle-progress-v1`, `twelve-puzzle-rankings-v3`, `twelve-puzzle-tutorial-v1`입니다. 이전 버전 키는 읽거나 덮어쓰지 않습니다.

## 픽셀 그래픽

- `assets/pixel-guardian-atlas.png`: 4×4, 14종 동물 + 투명 셀 2개
- `assets/pixel-special-atlas.png`: 물음표·목표·표식·봉인·해제·완성·선택·빈 열
- `assets/pixel-app-icon-source.png`: iOS·Android 아이콘과 시작 화면 원본
- `assets/fonts/`: Galmuri11 Regular/Bold 및 OFL-1.1

생성 프롬프트와 셀 순서는 [assets/pixel-art-prompt.md](./assets/pixel-art-prompt.md)에 기록했습니다. 브라우저에서는 `image-rendering: pixelated`를 적용합니다.

## 광고·개인정보 현재 상태

광고 설정은 기본 비활성화이며 대상 연령도 아직 확정하지 않았습니다. 플레이어 화면에는 광고 위치나 광고 보상 약속을 표시하지 않습니다. 네이티브 프로젝트에 남아 있는 AdMob/UMP 코드는 향후 별도 검토 대상이며, 활성화 전 대상 연령·동의·스토어 개인정보 표시·실기기 통신을 다시 검증해야 합니다. 진행과 순위는 외부 서버로 전송하지 않습니다.

## 오픈소스 재사용 범위

[alliterhorst/decanta-water-sort](https://github.com/alliterhorst/decanta-water-sort)의 커밋 `4130d868bc5eeba65f5de8cf9aec3669c18c78cf`에서 상태 복사·완성 판정·이동 판정·난수 함수의 아이디어를 JavaScript로 이식했습니다. UI, 한 타일 이동, 숨김, 20단계 생성, 특수 규칙, 저장, 순위, 픽셀 자산은 이 프로젝트에서 작성했습니다. MIT 고지는 [LICENSE](./LICENSE)에 있습니다.

## 주요 명령

```sh
npm test              # 전체 자동 테스트
npm run build         # dist 웹 번들 생성
npm run icons         # 픽셀 원본으로 네이티브 아이콘/시작 화면 생성
npm run native:sync   # iOS·Android 프로젝트 동기화
npm run native:doctor # 로컬 네이티브 환경 점검
npm run android:debug # Android Debug APK 빌드
npm run release:check # 출시 차단 항목 정적 검사
```

Android 빌드는 JDK 21과 Android SDK Platform 36을 사용하며 결과물은 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다. iOS 실기기 빌드는 Xcode에 Bundle ID와 일치하는 Team·프로비저닝 프로파일이 필요합니다.
