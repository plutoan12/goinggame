# 열두 퍼즐 · iOS / Android

## 현재 상태 · 2026-09-26

- 앱명: **열두 퍼즐**
- 운영자: **원웨이컴퍼니**
- 문의: **qkdqor19@icloud.com**
- 앱 ID: `com.onewaycompany.twelveguardians`
- 클라이언트: Capacitor 8.5.2, iOS/Android 네이티브 프로젝트 포함
- 게임: 20단계, 14종 픽셀 동물, 목표·표식·봉인 규칙, 기기 로컬 순위

이전 5단계 빌드는 Xcode Debug 컴파일·Personal Team 서명·아이폰 15 Pro 설치와 실행까지 성공했습니다. 현재 20단계 픽셀 빌드는 웹 자동 검증을 마쳤으며, 네이티브 재동기화·재서명·실기기 설치와 손가락 조작 검증은 최종 통합 단계에서 다시 수행합니다. App Store Connect/Google Play 등록·업로드·심사 제출은 진행하지 않았습니다.

## 아이폰 실행

```sh
npm ci
npm test
npm run native:sync
npm run native:ios
```

Xcode에서 본인 Team과 연결된 아이폰을 선택해 실행합니다. 비밀번호·인증서 개인키·프로비저닝 정보는 저장소나 채팅에 기록하지 않습니다. Personal Team 설치본은 테스트용이며 App Store 배포본이 아닙니다.

## Android 준비

Android Studio, JDK 21, SDK Platform 36과 테스트 기기 또는 에뮬레이터가 필요합니다.

```sh
npm run native:doctor
npm run android:debug
```

Play 제출용 AAB는 운영자 업로드 키로 생성해야 하며 키와 암호는 저장소에 넣지 않습니다.

## 픽셀 자산

`assets/pixel-app-icon-source.png`에서 웹·iOS·Android 아이콘과 시작 화면을 생성합니다. 게임은 Galmuri11 글꼴, 14종 4×4 동물 아틀라스, 8종 4×2 특수 규칙 아틀라스를 오프라인 번들에 포함합니다. 생성 기록은 [assets/pixel-art-prompt.md](assets/pixel-art-prompt.md)에 있습니다.

## 광고와 대상 연령

현재 `release-config.js`는 `enabled=false`, `audience="unset"`, `audienceReviewed=false`입니다. 플레이 화면에는 광고나 광고 보상 버튼이 없습니다. AdMob/UMP 플러그인 코드는 비활성 상태로 남아 있으므로 출시 전 실제 통신과 SDK 개인정보 보고서를 확인해야 합니다.

광고를 향후 별도 버전에서 검토하려면 대상 연령, UMP/ATT, 플랫폼 App ID, 광고 단위, 스토어 개인정보 표시, 아동 정책, 실패·중복 보상 방어를 함께 검증해야 합니다. 현재 버전의 완료 조건에는 포함하지 않습니다.

## 명령과 점검

```sh
npm run icons
npm run build
npm run native:sync
npm run native:doctor
npm run release:check
```

`release:check`는 현재 미정 연령·방침 초안·공개 개인정보 URL 없음 때문에 의도적으로 실패합니다. 정적 검사가 통과해도 서명·기기 테스트·스토어 심사가 끝났다는 뜻은 아닙니다.
