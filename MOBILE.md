# 열두 퍼즐 · iOS / Android

## 현재 상태 · 2026-09-29

- 앱명: **열두 퍼즐**
- 운영자: **원웨이컴퍼니**
- 문의: **qkdqor19@icloud.com**
- 앱 ID: `com.onewaycompany.twelveguardians`
- 클라이언트: Capacitor 8.5.2, iOS/Android 네이티브 프로젝트 포함
- 게임: 60단계, 자유 보관칸, 14종 픽셀 동물, 목표·표식·봉인 규칙, 기기 로컬 순위

60단계 릴리스 검증은 웹 자동 검사, 2,400개 생성 보드 재생, Capacitor 동기화, Android Debug APK·미서명 Release AAB와 미서명 iOS 기기/시뮬레이터 빌드를 대상으로 합니다. 현재 릴리스에서는 광고를 켜지 않으며 App Store Connect/Google Play 등록·업로드·심사 제출을 진행하지 않습니다. 실제 결과와 산출물은 [IOS-VALIDATION.md](IOS-VALIDATION.md)에 기록합니다.

## 진행·보관칸·저장

- 1단계부터 60단계까지 순차 해제되며 여섯 구간을 10단계씩 표시합니다.
- 공개된 맨 위 동물 한 마리를 메인 열↔보관칸으로 옮길 수 있고, 새 맨 위 물음표는 추가 이동 수 없이 즉시 공개됩니다.
- `보관칸 +1`은 기본 칸이 0개인 60단계에서도 한 판에 한 번만 빈 칸 하나를 추가합니다. 제한을 연장하지 않고 사용 전 되돌리기 기록을 초기화하며 완료 기록은 도움받음으로 분류됩니다.
- 활성 게임은 `twelve-puzzle-game-v4`, 순위는 `twelve-puzzle-rankings-v4`와 규칙 버전 `twelve-puzzle-rules-v4`를 사용합니다. 이전 활성 게임과 v3 순위는 읽거나 덮어쓰지 않습니다.
- `twelve-puzzle-progress-v1`의 정상 1~20단계 해금은 보존됩니다. 순위는 서버 없이 기기 안에서 단계·시드·제한 방식·도움받음 여부가 같은 기록끼리만 비교합니다.

## 아이폰 실행

```sh
npm ci
git diff --check && npm test && npm run build && npm run release:check
npm run native:sync && npm run native:doctor
npm run native:ios
```

Xcode에서 본인 Team과 연결된 아이폰을 선택해 실행합니다. 비밀번호·인증서 개인키·프로비저닝 정보는 저장소나 채팅에 기록하지 않습니다. Personal Team 설치본은 테스트용이며 App Store 배포본이 아닙니다.

## Android 준비

Android Studio, JDK 21, SDK Platform 36과 테스트 기기 또는 에뮬레이터가 필요합니다.

```sh
npm run android:debug
cd android && ./gradlew bundleRelease
```

로컬 SDK 경로는 Git에서 제외되는 `android/local.properties`의 `sdk.dir` 또는 `ANDROID_HOME`으로 지정합니다. `bundleRelease`는 기술 검증용 미서명 AAB를 만들며, Play 제출본은 운영자 업로드 키로 서명해야 합니다. 키와 암호는 저장소에 넣지 않습니다.

## 픽셀 자산

`assets/pixel-app-icon-source.png`에서 웹·iOS·Android 아이콘과 시작 화면을 생성합니다. 게임은 Galmuri11 글꼴, 14종 4×4 동물 아틀라스, 8종 4×2 특수 규칙 아틀라스를 오프라인 번들에 포함합니다. 생성 기록은 [assets/pixel-art-prompt.md](assets/pixel-art-prompt.md)에 있습니다.

## 광고와 대상 연령

현재 `release-config.js`는 `enabled=false`, `audience="14-plus"`, `audienceReviewed=false`입니다. 주 이용 대상은 만 14세 이상이고 개인정보처리방침 주소는 `https://plutoan12.github.io/goinggame/privacy.html`입니다. 플레이 화면에는 광고나 광고 보상 버튼이 없습니다. AdMob/UMP 플러그인 코드는 비활성 상태로 남아 있으므로 활성화 전 실제 통신과 SDK 개인정보 보고서를 확인해야 합니다.

광고를 향후 별도 버전에서 검토하려면 대상 연령, UMP/ATT, 플랫폼 App ID, 광고 단위, 스토어 개인정보 표시, 아동 정책, 실패·중복 보상 방어를 함께 검증해야 합니다. 현재 버전의 완료 조건에는 포함하지 않습니다.

## 재현 가능한 네이티브 검증

```sh
npm run native:sync && npm run native:doctor
npm run android:debug
cd android && ./gradlew bundleRelease && cd ..
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
```

`release:check` 통과는 60단계·v4 키·보관칸·광고 비활성·Bundle ID·운영자 정보와 생성기 스트레스를 확인했다는 뜻입니다. 서명·실기기·SDK 통신·스토어 심사 완료를 뜻하지 않습니다.

## 스토어 차단 항목

- Apple 배포 Team·프로비저닝 및 App Store Connect 권한
- Android 운영자 업로드 키·서명된 릴리스 AAB 및 Google Play 권한
- 광고를 별도 버전에서 켤 경우 UMP/ATT, 플랫폼 App ID·광고 단위와 스토어 개인정보 표시 재검증

유료 Apple 등록, 운영 계정 변경, 광고 활성화와 스토어 제출은 이번 작업 범위가 아닙니다.
