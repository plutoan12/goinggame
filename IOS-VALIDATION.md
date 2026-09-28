# iOS·Android 빌드 검증 · 2026-09-29

## 릴리스 대상

- 앱명: **열두 퍼즐**
- 운영자: **원웨이컴퍼니**
- 문의: **qkdqor19@icloud.com**
- Bundle/Application ID: `com.onewaycompany.twelveguardians`
- 내용: 60단계, 자유 보관칸, `보관칸 +1`, v4 활성 게임·로컬 순위
- 광고: `release-config.js`의 `enabled=false` 유지. 실제 광고 송출·보상·SDK 통신은 검증하거나 활성화하지 않음.

## 자동 검증

`git diff --check && npm test && npm run build && npm run release:check`가 통과했다.

- Node 테스트: 158/158 통과(수정 라운드의 릴리스 실패 프로브 3개 포함).
- 릴리스 정적 검사: 60단계, `twelve-puzzle-game-v4`, `twelve-puzzle-rankings-v4`, `twelve-puzzle-rules-v4`, 보관칸 마크업, 이전 아이템 문구 제거, 광고 비활성, 앱 ID·운영자·문의 정보 확인.
- 생성기 스트레스: 고정 시드 1~20, 여정/연습 두 모드, 1~60단계의 총 2,400개 보드를 모두 생성하고 반환된 해답을 재생했다.
  - 여정: 1,200/1,200, 약 7.6초, 해답 13~203수(평균 84.8), 숨김 20.00~93.30%.
  - 연습: 1,200/1,200, 약 7.3초, 해답 13~194수(평균 83.6), 숨김 0%.
  - 두 모드 모두 설정 범위·압축 해답 길이·단계별 최소 숨김 비율·최종 승리를 통과했고 대체 시드 사용과 재시도 고갈은 0건이었다.

`release:check`는 광고가 꺼진 기술 릴리스 조건과 스토어 공개 조건을 분리한다. 아래 연령·개인정보 항목은 `STORE-BLOCKED`로 표시하지만 기술 빌드를 실패시키지는 않는다.

## 네이티브 동기화와 환경

`npm run native:sync`가 웹 번들을 iOS·Android 프로젝트에 복사하고 Capacitor 8.5.2 및 AdMob 8.1.0 플러그인 구성을 동기화했다. 동기화 결과 추적 중인 네이티브 파일의 추가 차이는 없었다.

API 36 에뮬레이터를 기동한 뒤 `npm run native:doctor`가 다음 항목을 모두 통과했다.

- Xcode 27.0 (27A266a)
- Temurin JDK 21.0.12.1
- Android SDK Platform 36
- Android 16 / API 36 에뮬레이터 연결

## Android Debug

`npm run android:debug`는 `BUILD SUCCESSFUL`로 끝났다.

- APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- 크기: 약 15MB
- SHA-256: `ef2b16eb2ba4bd75d3147f757ba2d3b82149717e1b80cf563adec14a83e1b1ab`
- 패키지: `com.onewaycompany.twelveguardians`, 버전 1.0 (1), compile SDK 36
- 표시 이름: `열두 퍼즐`
- `apksigner verify`: v2 서명 통과

이 Debug APK는 Google Play 제출용 AAB가 아니며 운영자 업로드 키로 서명한 배포본도 아니다.

## iOS 미서명 빌드와 시뮬레이터

요구된 두 명령 모두 `** BUILD SUCCEEDED **`로 끝났다.

- generic iOS: `release-artifacts/ios-derived/Build/Products/Debug-iphoneos/App.app` (약 14MB)
- generic iOS Simulator: `release-artifacts/ios-derived/Build/Products/Debug-iphonesimulator/App.app` (약 21MB)

iPhone 18 Pro / iOS 27.0 Simulator에 시뮬레이터 앱을 설치하고 `com.onewaycompany.twelveguardians`를 실행했다. 최초 3초 캡처는 배경만 표시했지만 약 18초 뒤 메인 열→보관칸 이동을 안내하는 새 튜토리얼, 보관칸과 60단계 구간 UI가 렌더링됐다. 증거 이미지는 Git에서 제외되는 `.superpowers/sdd/2026-09-28-holding-slots-60-stages/task-7-ios-simulator.png`에 보관했다.

## 실제 iPhone 상태

추가 계정 등록이나 결제 없이 이미 설치된 자격만 사용했다.

- 연결 기기: iPhone / iOS 26.6.2
- 기존 Apple Development 인증서와 해당 Bundle ID·기기용 프로비저닝 프로파일 일치 확인
- 프로파일 만료: 2026-10-03 17:22:26 KST
- 자동 프로비저닝 갱신 옵션 없이 서명된 Debug 빌드 성공
- 서명 앱: `$HOME/Library/Developer/Xcode/DerivedData/GoingGame-task7-device/Build/Products/Debug-iphoneos/App.app`
- `codesign --verify --deep --strict` 통과
- 앱 데이터를 삭제하지 않고 설치 성공, Bundle ID로 실행 성공, 기기 프로세스 경로 확인

남은 단일 실기기 차단 항목은 사람이 화면을 보며 손가락으로 수행해야 하는 상호작용 점검이다. 이 실행 환경은 실제 iPhone 화면을 관찰하거나 터치를 입력할 수 없으므로 1·10·30단계와 디버그 해제 60단계에서 메인 열↔보관칸 탭/드래그, 자동 공개, +1 칸, 되돌리기, 저장/재개, 교착 복구, 단계 해제와 순위 분류를 확인하지 않았다. 서명·빌드·설치·실행은 완료됐지만 이 항목을 실기기 플레이 완료로 간주하지 않는다.

## 재현 명령

```sh
git diff --check && npm test && npm run build && npm run release:check
npm run native:sync && npm run native:doctor
npm run android:debug
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
```

실기기 빌드는 저장소에 Team ID·기기 UDID를 고정하지 않는다. Xcode에 이미 연결된 본인 Team과 기기를 사용하며 인증서 개인키·프로비저닝 자료를 저장소나 문서에 복사하지 않는다.

## 스토어 공개 전 차단 항목

- 주 이용 연령 및 스토어 대상 연령 확정
- 개인정보처리방침 검토 완료와 공개 HTTPS URL
- Apple 배포용 Team·프로비저닝 및 App Store Connect 권한
- Android 운영자 업로드 키·릴리스 AAB 및 Google Play 권한
- 스토어 메타데이터, 개인정보 표시와 심사
- 광고를 별도 릴리스에서 켤 경우 UMP/ATT, 운영 AdMob App ID·광고 단위와 실제 SDK 통신 재검증

유료 Apple 등록, 광고 활성화, TestFlight/App Store/Google Play 업로드와 제출은 시도하지 않았다.
