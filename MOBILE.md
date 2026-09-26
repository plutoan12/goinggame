# 열두 수호대 · iOS / Android

## 현재 상태 (2026-09-26)

앱명 **열두 수호대**, 운영자 **원웨이컴퍼니**, 문의 **qkdqor19@icloud.com**.
사용자가 확정한 앱 ID는 `com.onewaycompany.twelveguardians`입니다. Capacitor, Android 패키지/namespace, iOS Debug/Release에 일치시켰습니다. Apple Personal Team 개발용 프로비저닝은 완료했으며 App Store Connect/Google Play 앱 등록은 진행하지 않았습니다.

Capacitor 8.5.2 + AdMob 플러그인 8.1.0. esbuild로 게임을 번들하고 `cap sync`로 내장합니다. 새 호랑이 아이콘과 시작 화면을 적용했습니다. [아이콘 생성 기록](assets/app-icon-prompt.md).

웹·로직 검증과 네이티브 프로젝트 동기화는 완료했습니다. Xcode 27.0에서 **실기기용 arm64 및 시뮬레이터용 iOS Debug 컴파일에 성공**했습니다(광고 플러그인 포함). 시뮬레이터 설치·실행과 게임 화면 표시도 확인했고 상단 안전 영역을 보완했습니다. 사용자 승인 후 Personal Team 개발 인증서·자동 프로비저닝·서명을 완료했고 **아이폰 15 Pro(iOS 26.6.2)에 설치 성공**했습니다. 사용자가 개발자 신뢰를 완료한 후 앱 실행 성공과 실행 중 프로세스를 확인했습니다. **실기기 게임 화면·조작 테스트, IPA/APK/AAB 생성, 배포 서명, 제출은 미완료**입니다. Java/Android SDK 및 Android 테스트 기기는 아직 준비되지 않았습니다.

설치한 서명 산출물: `/Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-device/Build/Products/Debug-iphoneos/App.app`. 개인 테스트 프로파일은 **2026-10-03 17:22 KST**에 만료됩니다. 스토어 제출본이 아닙니다. Documents 빌드 경로의 Finder 속성으로 인한 서명 오류를 피하기 위해 출력 위치를 변경했습니다. 시뮬레이터 빌드는 `release-artifacts/ios-derived/Build/Products/Debug-iphonesimulator/App.app`입니다. 상세 명령과 검증 범위는 [IOS-VALIDATION.md](IOS-VALIDATION.md)에 기록했습니다.

## 아이폰 우선 실행

1. Mac App Store에서 Xcode 설치 후 한 번 실행하여 필요한 iOS 구성 요소를 설치합니다. Capacitor 8은 Xcode 26 이상을 요구합니다. [공식 환경 안내](https://capacitorjs.com/docs/getting-started/environment-setup)
2. Xcode Settings → Accounts에서 본인 Apple Developer 계정에 로그인합니다. 비밀번호·서명키를 채팅/저장소에 보내지 마세요.
3. 아래 명령으로 프로젝트를 엽니다.

```sh
npm ci
npm test
npm run native:sync
npm run native:ios
```

4. 아이폰 연결 후 본인이 ‘이 컴퓨터 신뢰’ 및 필요 시 개발자 모드를 설정합니다. Xcode App 타깃 → Signing & Capabilities에서 본인 Team을 선택하고 Bundle Identifier를 확인합니다.
5. 아이폰을 실행 기기로 선택하고 Run. SPM이 Capacitor/Google SDK를 내려받습니다. 네이티브 컴파일·서명·설치는 검증됐으며 첫 실행 시 기기의 개발자 신뢰 확인이 필요할 수 있습니다.
6. RELEASE.md의 테스트 완료 후 Archive → Validate App → TestFlight 배포를 진행합니다. 계정 변경·업로드·최종 제출은 운영자 확인 하에 진행합니다.

USB 실행에는 별도 IPA 파일이 필요하지 않습니다. 배포용 서명·프로비저닝은 계정 확인 후 구성합니다. 이 프로젝트는 SPM 방식이라 CocoaPods가 필요하지 않습니다.

## Android 준비

Android Studio, JDK 21, SDK Platform 36 및 테스트 기기/에뮬레이터 준비 후:

```sh
npm run native:doctor
npm run android:debug
```

성공하면 `android/app/build/outputs/apk/debug/app-debug.apk`가 생깁니다. **현재 생성되지 않았습니다.** Play 제출용 AAB는 운영자 업로드 키로 Android Studio의 Generate Signed Bundle을 사용합니다. 키와 암호는 저장소에 넣지 않습니다.

## 광고 연결 범위

`release-config.js`는 공개 설정으로 앱에 번들됩니다. 비밀키를 넣지 마세요.
현재 `enabled=false`, `audience="unset"`, `audienceReviewed=false`, `testMode=true`입니다. 이용 연령을 임의 확정하거나 광고를 켜지 않았습니다.

| 항목 | 구현 / 미완료 |
| --- | --- |
| 보상형 광고 | SDK adapter 구현, 실제 기기 실행 미검증 |
| 보상 지급 | 보상 이벤트 + 닫힘 확인, 취소/실패/중복/지연 방어 |
| 동의 | 광고 초기화 전 UMP 갱신·필요 시 양식 표시·요청 허용 확인 |
| 개인정보 옵션 | 게임 하단에서 서비스가 요구하는 설정 화면 재표시 |
| 플랫폼 ID | 공식 테스트 App ID/광고 단위만 설정, 운영자 ID 미입력 |
| 배너 / 전면 광고 | 자리 표시만 있고 SDK 연결·자동 송출 없음 |
| 아동 연령 처리 | 미구현, general + 검토 완료 설정 외 광고 요청 차단 |

광고는 사용자가 보상을 선택할 때만 요청합니다. 3분 이상 무응답이면 실패 처리하고 앱을 다시 열기 전까지 추가 요청을 막아 늦게 온 이벤트의 잘못된 보상을 방지합니다. 앱 종료 뒤 미확정 보상은 보존하지 않으며 서버 검증/결제 경제는 없습니다. 서버 경제를 붙일 경우 SSV와 보상 원장이 필요합니다.

### iOS 동의 참조 보완

플러그인 8.1.0은 initialize()에서만 UMP 화면용 plugin 참조를 연결합니다. 먼저 호출하면 광고 SDK가 동의 전에 초기화될 수 있으므로 `scripts/prepare-admob.mjs`가 requestConsentInfo() 시작 시 참조만 먼저 연결합니다. postinstall로 재현되고 소스 버전 변경 시 실패합니다. **실기기 UMP 양식 검증이 필요합니다.** SDK 업그레이드 때 이 보완의 필요성을 재검토하세요.

광고 활성화 전 대상 연령 처리와 UMP 콘솔 메시지 구성이 필요합니다. 현재 ATT 요청은 호출하지 않으며 Android 광고 ID 권한을 제거했습니다. npa=true가 데이터 수집 없음이나 ATT 면제를 보장하지 않습니다. iOS SKAdNetwork는 Google 기본 항목만 포함했으므로 운영 광고 전에 공식 buyer 목록을 검토하세요.

실제 운영 전 플랫폼 App ID(네이티브 파일), 보상형 ID(release-config.js), 테스트 모드, 방침과 스토어 개인정보 표시를 함께 검토합니다. 테스트 중 실제 광고를 반복 클릭하지 마세요.

## 명령과 점검

```sh
npm run icons          # 생성 원본으로 아이콘/시작 화면 재생성
npm run build          # 웹 번들 + 정적 파일
npm run native:sync    # 양쪽 네이티브 프로젝트 동기화
npm run native:doctor  # 환경 읽기 전용 점검
npm run release:check  # 출시 차단 사유 출력
```

현재 release:check는 미정 연령·방침 초안·공개 URL 때문에 의도적으로 실패합니다. 통과하더라도 서명·기기 테스트·심사가 완료됐다는 뜻은 아닙니다.

참고: [AdMob 보상 이벤트](https://developers.google.com/admob/android/rewarded), [iOS UMP](https://developers.google.com/admob/ios/privacy), [iOS 앱 설정](https://developers.google.com/admob/ios/quick-start), [Android 앱 설정](https://developers.google.com/admob/android/quick-start), [iOS 배포](https://capacitorjs.com/docs/ios/deploying-to-app-store), [Android 배포](https://capacitorjs.com/docs/android/deploying-to-google-play).
