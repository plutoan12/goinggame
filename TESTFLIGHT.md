# 열두 퍼즐 · 광고 비활성화 베타 준비

## 현재 20단계 픽셀 빌드 · 2026-09-28

- 앱: 열두 퍼즐 / 원웨이컴퍼니 / `com.onewaycompany.twelveguardians`
- 전체 20단계(4단계씩 5개 구간), 14종 픽셀 동물, 목표·표식·봉인 규칙, 기기 로컬 순위
- 광고 `enabled=false`, 대상 연령 미정, 플레이어용 광고 UI 없음
- 웹 자동 테스트 121/121·번들 검증과 iOS·Android 네이티브 동기화 완료
- iOS Simulator Debug 빌드·설치·실행과 앱 이름·Bundle ID·첫 실행 픽셀 튜토리얼 화면 확인 완료
- Android Debug APK 빌드와 v2 서명·패키지 ID·앱 이름 확인 완료. Android 16 / API 36 일반 에뮬레이터에서 설치·실행하고 첫 실행 튜토리얼과 20단계 선택 화면을 확인
- iPhone 15 Pro 연결은 확인했지만 현재 실기기 서명은 개발 인증서와 프로비저닝 프로파일의 Team 불일치 및 Xcode 계정 세션 부재로 차단됨
- Xcode에 올바른 Team 계정을 다시 연결한 뒤 실기기 업데이트 설치·손가락 플레이를 수행해야 함
- App Store Connect 등록·Validate·업로드·TestFlight 설치는 미완료

## 이전 빌드에서 확인한 사실

아래는 현재 20단계 빌드의 검증 결과가 아니라, 같은 Bundle ID의 이전 5단계 빌드에서 확인한 이력입니다.

- Xcode 27.0에서 generic iOS arm64 Release 미서명 아카이브 명령 성공
- Debug Personal Team 서명, 코드 서명 검증, 아이폰 15 Pro 설치와 프로세스 실행 성공
- Capacitor·Cordova·GoogleMobileAds·UserMessagingPlatform의 `PrivacyInfo.xcprivacy` 포함 확인
- Apple Validate, 배포 서명, TestFlight 업로드와 실제 TestFlight 설치는 수행하지 않음

이전 아카이브는 현재 게임 내용과 다르며 배포용으로 재사용하지 않습니다.

## 업로드 전 확인

1. Apple Developer Program, 배포 Team, App Store Connect 접근 권한을 운영자가 확인합니다.
2. 기존 앱 레코드와 빌드 번호를 확인하고 중복 등록을 피합니다.
3. 공개 HTTPS 개인정보 URL, 대상 연령, 암호화 수출 규정, SDK 개인정보 표시를 확정합니다.
4. 현재 소스로 Archive → Validate를 실행하고 실제 오류에 따라 수정합니다.
5. 내부/외부 테스터 범위를 정하고 운영자 확인 후 업로드합니다.

## 베타 설명 초안

열두 수호동물과 고양이·병아리를 같은 종류끼리 한 줄씩 완성하는 16비트 픽셀 정렬 퍼즐입니다. 20단계가 순서대로 열리고 후반에는 목표·표식·봉인 규칙이 조합됩니다. 이동 제한·타임어택·연습 모드와 기기 안 순위를 제공합니다.

현재 버전은 로그인·결제·온라인 순위·플레이어용 광고 기능이 없습니다. 테스트 중 난이도와 저장 형식이 바뀔 수 있습니다.

문의: qkdqor19@icloud.com

## 테스트할 내용

- 첫 실행 3수 튜토리얼과 본게임 진입
- 1·5·13·17·20단계 규칙과 순차 해제
- 손가락 드래그, 두 번 터치, 긴 보드 가로·세로 스크롤
- 목표·표식·봉인·해제 아이콘과 색상 없이도 구분되는 문구
- 이동 제한·타임어택·연습, 마지막 수 우선 처리와 게임오버
- 아이템 차감, 저장·복원, 기기 로컬 순위 중복 방지
- 320/390px 화면, 회전, 잠금·앱 전환, 픽셀 글자 가독성
- 광고 또는 가짜 광고 보상 UI가 나타나지 않음

제보에는 기종/iOS, 앱 버전, 단계·모드, 재현 순서, 기대 결과와 실제 결과를 포함합니다. 화면의 개인정보는 가립니다.

## 공식 참고

- [Apple TestFlight 개요](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [내부 테스터 추가](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)
