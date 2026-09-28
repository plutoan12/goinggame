# 열두 퍼즐 · 동물 정렬 퍼즐

열두 수호동물과 고양이·병아리를 같은 종류끼리 한 줄씩 완성하는 한국어 정렬 퍼즐입니다. 원작 에셋을 복사하지 않았으며, 중국풍 문자·문양 없이 포근한 16비트 픽셀 그래픽과 한글 메뉴로 구성했습니다. iOS·Android 설치형 앱은 Capacitor로 패키징합니다.

- 운영·배포: **원웨이컴퍼니**
- 지원 문의: **qkdqor19@icloud.com**
- 앱 ID: `com.onewaycompany.twelveguardians`

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
- 공개된 맨 위 동물은 빈 보관칸에 한 마리씩 넣었다가 공간이 남은 열린 열로 꺼낼 수 있습니다. 보관칸끼리 이동할 수 없으며, 보관칸 이동도 1수로 계산됩니다.
- 여정에서는 이동 횟수 제한 또는 타임어택 중 하나를 선택합니다. 제한 소진이나 실제 이동 불가가 게임오버이며 마지막 수의 완성이 우선합니다.
- 되돌리기 3개, 한 열 공개 2개, `보관칸 +1` 1개를 판마다 제공합니다. 추가 칸은 한 판에 한 번만 만들고 제한 시간이나 이동 횟수를 늘리지 않으며, 사용 기록은 도움받음 순위로 분류됩니다.
- 첫 실행에는 메인 열→보관칸→메인 열 이동을 포함한 고양이·병아리 안내판이 열립니다. 튜토리얼 기록은 본게임·진행·순위와 분리됩니다.

## 60단계 여정

처음에는 1단계만 열리고 클리어할 때마다 다음 단계가 해제됩니다. 여섯 구간에 10단계씩 있으며, 4·8번째 단계는 완급을 조절하는 휴식 구간입니다.

| 구간 | 세로 길이·동물 | 기본 보관칸 | 목표 시간 |
| --- | --- | ---: | ---: |
| 1~10 | 4~6칸 · 4~8종 | 3개 | 2~4분 |
| 11~20 | 6~8칸 · 8~11종 | 3→2개 | 4~7분 |
| 21~30 | 8~10칸 · 10~12종, 30단계 14종 | 2개 | 5~9분 |
| 31~40 | 9~12칸 · 10~12종, 40단계 14종 | 2→1개 | 7~12분 |
| 41~50 | 10~14칸 · 10~12종, 50단계 14종 | 1개 | 8~15분 |
| 51~60 | 12~16칸 · 10~12종, 60단계 14종 | 1개, 60단계 0개 | 10~20분 |

목표·표식·봉인 규칙은 단계별로 조합됩니다. 60단계는 유일한 16칸·14종·기본 보관칸 0개 보드이며 빈 메인 열 하나를 유지합니다. 각 배치는 시드 기반으로 생성하고, 생성기가 반환한 압축 해법을 플레이어와 같은 규칙 엔진으로 재생해 완주 가능 여부와 숨김 비율을 확인합니다. `release:check`는 두 모드 × 60단계 × 20시드, 총 2,400개 보드를 결정론적으로 재검증합니다.

## 기기 안 순위와 저장

여정 클리어 기록만 현재 기기 안 순위에 등록됩니다. 온라인 전체 순위가 아니며 서버·로그인·결제가 없습니다.

- 이동 제한은 적은 이동 수, 타임어택은 짧은 실제 플레이 시간 순입니다.
- 단계·방식·같은 배치·도움받음 여부를 나눠 비교하고 동점은 공동 순위로 표시합니다.
- 최근 200개 기록을 보관하고, 동일한 시도의 중복 등록을 막습니다.
- 현재 키는 `twelve-puzzle-game-v4`, `twelve-puzzle-progress-v1`, `twelve-puzzle-rankings-v4`, `twelve-puzzle-tutorial-v2`입니다.
- 기존 v1 진행에서 20단계까지의 정상 해금은 보존해 21단계부터 이어집니다. 규칙이 다른 이전 활성 게임과 v3 순위는 새 판·새 순위에 섞지 않으며 기존 키를 삭제하거나 덮어쓰지 않습니다.

## 픽셀 그래픽

- `assets/pixel-guardian-atlas.png`: 4×4, 14종 동물 + 투명 셀 2개
- `assets/pixel-special-atlas.png`: 물음표·목표·표식·봉인·해제·완성·선택·빈 열
- `assets/pixel-app-icon-source.png`: iOS·Android 아이콘과 시작 화면 원본
- `assets/fonts/`: Galmuri11 Regular/Bold 및 OFL-1.1

생성 프롬프트와 셀 순서는 [assets/pixel-art-prompt.md](./assets/pixel-art-prompt.md)에 기록했습니다. 브라우저에서는 `image-rendering: pixelated`를 적용합니다.

## 광고·개인정보 현재 상태

광고 설정은 기본 비활성화이며 대상 연령도 아직 확정하지 않았습니다. 플레이어 화면에는 광고 위치나 광고 보상 약속을 표시하지 않습니다. 네이티브 프로젝트에 남아 있는 AdMob/UMP 코드는 향후 별도 검토 대상이며, 활성화 전 대상 연령·동의·스토어 개인정보 표시·실기기 통신을 다시 검증해야 합니다. 진행과 순위는 외부 서버로 전송하지 않습니다.

## 오픈소스 재사용 범위

[alliterhorst/decanta-water-sort](https://github.com/alliterhorst/decanta-water-sort)의 커밋 `4130d868bc5eeba65f5de8cf9aec3669c18c78cf`에서 상태 복사·완성 판정·이동 판정·난수 함수의 아이디어를 JavaScript로 이식했습니다. UI, 한 타일 이동, 숨김, 보관칸, 60단계 생성, 특수 규칙, 저장, 순위, 픽셀 자산은 이 프로젝트에서 작성했습니다. MIT 고지는 [LICENSE](./LICENSE)에 있습니다.

## 주요 명령

```sh
git diff --check && npm test && npm run build && npm run release:check
npm run native:sync && npm run native:doctor
npm run android:debug
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
```

Android 빌드는 JDK 21과 Android SDK Platform 36을 사용하며 결과물은 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다. iOS 실기기 빌드는 Xcode에 Bundle ID와 일치하는 Team·프로비저닝 프로파일이 필요합니다.

## 스토어 공개 전 남은 항목

기술 검증과 스토어 제출 준비는 구분합니다. 현재 광고는 비활성 상태이며 유료 Apple 등록이나 스토어 제출을 시도하지 않습니다. 공개 전에는 주 이용 연령 확정, 개인정보처리방침 검토 및 공개 HTTPS URL, Apple 배포 Team·프로비저닝, Android 운영자 업로드 키와 AAB, App Store Connect·Google Play 메타데이터/개인정보 표시/심사가 별도로 필요합니다.
