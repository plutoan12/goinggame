# iOS 빌드 검증 · 2026-09-26

## TestFlight 사전 검증 (최신)

- 자동 검사 64/64, 웹 번들·네이티브 동기화 성공.
- Release / generic iOS / arm64 미서명 Archive 명령 종료 코드 0. 앱 ID와 버전 1.0 (1), 최신 JS 번들 일치, 앱과 dSYM UUID 일치 확인.
- 광고 비활성화 유지. SDK privacy manifest 포함 확인, 실제 네트워크·개인정보 통합 보고서 검토는 미완료.
- 미서명 아카이브는 배포용 설치 파일이 아니며, 배포 서명·Apple Validate·TestFlight 업로드·TestFlight 설치는 하지 않음.
- 경고·검증 산출물 경로·남은 확인 사항: [TESTFLIGHT.md](TESTFLIGHT.md).

## 확인 완료

- Xcode 27.0 (27A266a), iOS SDK 27.0.
- 앱 ID: com.onewaycompany.twelveguardians.
- 자동 테스트 40/40 통과, 웹 번들 및 Capacitor 동기화 통과.
- generic/platform=iOS Debug 빌드 성공 (arm64, CODE_SIGNING_ALLOWED=NO).
- generic/platform=iOS Simulator Debug 빌드 성공.
- iOS 27.0 / iPhone 18 Pro 시뮬레이터에 설치 후 실행. 게임판·캐릭터·아이템 버튼·이동 제한 표시를 화면으로 확인.
- SceneDelegate에서 storyboard가 만든 창을 재사용하도록 변경해 중복 WebView 생성을 제거.
- 상단 safe-area 패딩 및 고정 상태창 위치 보완 후 제목과 카메라 영역이 겹치지 않는 것을 확인.
- 연결된 아이폰 15 Pro / iOS 26.6.2 개발자 모드 활성화 확인.
- 사용자 승인 후 Personal Team의 Apple Development 인증서 생성 및 자동 프로비저닝 완료.
- 서명된 arm64 Debug 빌드 성공. `codesign --verify --deep --strict` 통과.
- 아이폰 15 Pro에 `devicectl device install app`으로 설치 성공.
- 첫 실행 요청은 iOS 보안 검증에서 거절됐으나, 사용자가 기기에서 개발자 신뢰를 완료한 후 재시도 성공. `devicectl`의 실행 성공 및 설치 경로와 일치하는 앱 프로세스(PID 689)를 확인.
- 설치 프로파일 만료: 2026-10-03 17:22:26 KST. 이 개인 테스트 빌드는 만료 전에 재서명·재설치가 필요하며 스토어 배포본이 아님.

## 아직 확인하지 못한 항목

- 실기기 게임 화면·게임 조작·성능·저장/복원·회전·잠금/복귀. 앱 프로세스 실행과 게임 화면/조작 검증은 구분함.
- 시뮬레이터 자동 입력에 따른 타일 이동 결과는 확인되지 않아 조작 테스트 완료로 보지 않음.
- 새 시뮬레이터에서 초기 WebView 표시가 지연됐고 한 번은 약 15초의 로딩이 기록됨. 실제 아이폰에서 초기/재실행 시간 측정 필요.
- AdMob SDK는 컴파일됐지만 광고는 계속 비활성화. 실제 UMP/광고 실행 미검증.
- 외부 의존성의 deprecated API 경고(AdMob 배너/연령 설정)가 있으며 빌드 오류는 아님. 향후 SDK 업데이트 시 검토.
- 배포용 IPA, TestFlight 업로드, App Store/Google Play 제출 없음.

## 자유 쌓기 업데이트 (같은 날)

- 종류가 달라도 공간이 남은 다른 열로 한 마리씩 이동하도록 변경. 가득 찬 열·자기 열·숨겨진 맨 위 타일은 계속 차단.
- 목표는 동일: 비어 있지 않은 모든 열을 한 종류로 가득 채우기. 이동·시간 제한은 기존 값을 유지.
- 안내/도움말/실패 문구 및 이동 불가 회귀 테스트 수정. 42/42 테스트 통과(1,000개 생성 보드 해법 재생 포함).
- 자유 쌓기 순위는 v2 저장 키로 분리하고 이전 순위 데이터는 보존, 이름만 이관.
- 웹 번들·네이티브 동기화·서명 빌드·서명 검증·실기기 업데이트 설치 완료. 앱을 삭제하지 않았으며 새 규칙의 실기기 터치 검증은 별도 필요.

## 재현 명령

### 드래그 입력 업데이트

- Pointer Events 드래그, 손가락 추적 타일, 목적지 강조, 가장자리 자동 스크롤 추가. 두 번 터치와 키보드 입력 유지.
- 49/49 자동 테스트 통과. 탭/드래그 구분, 취소/잘못된 드롭/중복 포인터/시간 종료/포커스 상실/앱 전환/자동 스크롤 포함.
- Chrome 실제 포인터 드래그로 1열 → 4열 이동과 이동 수 0 → 1 확인. 이어서 기존 터치 방식으로 1열 → 5열(다른 동물 위) 이동, 이동 수 1 → 2 확인.
- 네이티브 동기화·iOS 서명 빌드·서명 검증 및 아이폰 업데이트 설치 완료. iPhone의 실제 손가락 드래그 감각·가장자리 스크롤은 사용자 확인이 추가로 필요.

### 순차 단계·그림 통일 업데이트

- 입문만 기본 해제, 각 단계 정상 클리어 시 다음 단계 해제. 여정·연습 공통 진행, 해제 기록 영구 저장 및 저장 실패 경고.
- v5 게임 저장 도입. 이전 높은 단계 선택만으로는 해제하지 않고 이전 저장 키는 보존.
- 53/53 자동 테스트 통과. 순차 해제/재실행/중복 완료/실패·건너뛰기 방지/손상 저장/저장 불가 검증.
- 브라우저에서 2~5단계 disabled 확인, 이동 후 새로고침해도 1수 진행과 단계 잠금 유지 확인.
- 14종을 내장 image_gen으로 통일한 4×4 투명 아틀라스 v3 적용. 실제 화면과 PNG alpha 확인. 이전 에셋 보존.
- iOS 서명 빌드 및 코드 서명 검증 통과, 실기기 업데이트 설치 완료. 변경된 단계 클리어 흐름의 아이폰 수동 플레이는 별도 확인 필요.

### 첫걸음 튜토리얼 업데이트

- 4열 × 3칸, 고양이·병아리 2종, 3수 안내판을 본게임과 분리. 첫 실행 안내 및 도움말 재연습, 완료 마커만 저장.
- 자동 검사 59/59 통과: 잘못된 안내 이동 거절, 완료·재연습·저장 불가, 본게임/단계/순위 저장 불변, 모달 최상위 레이어의 드래그/이동 그림 포함.
- IAB에서 드래그·두 번 클릭으로 완료, 새로고침 후 안내 자동 표시 중단, 기존 본게임 1수와 2~5단계 잠금 유지 확인.
- 키보드 Enter로 3수 완료 후 `dialogAction`에 초점 이동 확인. 재연습 중 본게임 잔여 시간 89412.79999998212ms 및 이동 1수 유지 확인.
- 320px 너비 검증: 튜토리얼 영역 clientWidth/scrollWidth 모두 244px, 가로 넘침 없음. 실제 iPhone 손가락 감각 검증은 별도로 필요.
- 본게임 제한 수/시간 값은 이번 변경에서 조정하지 않음. 실제 플레이 기록을 모은 후 보정할 예정이며 TestFlight 업로드는 아직 하지 않음.
- 최종 수정 반영 후 iOS Debug 서명 빌드·서명 검증·아이폰 15 Pro 업데이트 설치 성공. 설치는 앱 삭제 없이 수행했으며 실기기 수동 플레이 검증과 구분함.
- 설치 직후 자동 실행은 기기 잠금(`FBSOpenApplicationErrorDomain: Locked`)으로 거절됨. 사용자가 잠금을 풀고 앱을 직접 열어 최종 빌드를 확인해야 함.
- 이후 사용자가 잠금을 해제한 뒤 `devicectl device process launch` 재시도 성공. 현재 Device Hub는 실기기 iOS 26.6.2 화면 공유에 iOS 27 이상이 필요하다고 표시하므로, 이 도구로 실기기 화면·손가락 조작을 직접 검증하지는 못함. 사용자 플레이 확인 요청 중.

### 입문 전체 플레이 검증 (브라우저, 2026-09-26)

- 별도 로컬 테스트 주소(127.0.0.1:4174)에서 사용자 기존 기록과 분리해 검증. 첫 배치 시드 26491, 여정 / 이동 제한 기본값 62수. 시간 제한 없이 진행.
- 생성기의 검증된 풀이 경로를 실제 UI 클릭으로 46수 재생. 30수에 2/6열, 45수에 5/6열 완성인데도 계속 플레이됨. 46수에서 6/6열 모두 같은 동물로 가득 차고 두 열은 빈 채로 클리어됨. 아이템 미사용.
- 클리어 순위 1건 등록, 새로고침해도 중복 없음. ‘다음 단계로’로 2단계 산책 진입, 입문 클리어 표시와 3~5단계 잠금 확인.
- 자동 재생 벽시계 시간 64초(도구 실행·상태 확인·대화 간격 포함). 정답 경로를 미리 아는 자동 입력이므로 사람의 사고 시간/평균 플레이 시간/적정 타임어택 제한으로 사용하지 않음. 실제 사용자 소요 시간은 아직 미측정.
- 본게임 규칙·보드 크기·제한값·아이폰 설치본은 이 검증에서 변경하지 않음.

### 초반 두 단계 단축 (2026-09-26)

- 입문 4종 × 용량4 = 16마리(6열), 산책 6종 × 용량5 = 30마리(8열). 3~5단계, 전체 정렬 승리 규칙, 시간 제한 없는 기본 이동 모드는 유지.
- 64/64 자동 테스트 통과. 1,000개 생성 보드의 실제 해법 재생, 단축/후반 유지, 이전 저장의 원본 불변/새 판 리셋/완료 단계 유지, 순위 버전 분리 포함. 별도 읽기 전용 코드 검토에서 결함 없음.
- v6 저장 키 사용. 예전 큰 초반 판은 원본 키를 남기고 같은 단계·시드·모드·도전 방식의 짧은 새 판으로 시작하며 이동·아이템·시도 ID는 리셋. 해금 유지, 화면 안내 확인. 기존 큰 판 재개 UI는 없음.
- v3 순위 사용, v2/v1 이름만 이어받고 점수는 비교하지 않음. 이전 키는 보존하되 과거 순위 조회 UI는 없음.
- 브라우저에서 이전 산책 저장을 8열×5칸으로 이관, 입문 클리어와 후반 잠금 보존 확인. 별도 신규 화면에서 시드26491 입문 20수/30수 한도, 아이템 없이 4/4종 완료 및 산책 해금 안내 확인.
- 같은 시드의 알려진 풀이가 이전 46수에서 20수로 감소. 시드1~50의 풀이 길이 중앙값은 입문21수·산책33수. 모두 생성기의 검증된 경로이며 최적 해법이나 사람의 플레이 시간 측정이 아님.
- 웹 번들·Capacitor 동기화·iOS Debug 서명 빌드·서명 검증 및 아이폰 15 Pro 업데이트 설치 성공. 앱 삭제 없이 설치했으며 실기기 플레이 소요 시간은 미측정.

### 빌드 명령

```sh
npm test
npm run native:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
```

### 서명 빌드와 설치

프로젝트의 Documents 하위 빌드에는 `com.apple.FinderInfo` 및 file-provider 속성이 붙어 CodeSign이 실패했습니다. 소스나 서명 키를 삭제하지 않고 출력 경로를 Xcode 로컬 DerivedData로 바꾼 뒤 성공했습니다. [Apple 서명 오류 안내](https://developer.apple.com/library/archive/qa/qa1940/_index.html).

실제로 설치한 서명 산출물:
`/Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-device/Build/Products/Debug-iphoneos/App.app`

```sh
# APPLE_TEAM_ID / IPHONE_UDID는 본인 Xcode 계정·기기에서 확인한 값 사용.
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination "id=$IPHONE_UDID" -derivedDataPath /Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-device -clonedSourcePackagesDirPath release-artifacts/ios-derived/SourcePackages -allowProvisioningUpdates -allowProvisioningDeviceRegistration DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGNING_ALLOWED=YES build
codesign --verify --deep --strict /Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-device/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device install app --device "$IPHONE_UDID" /Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-device/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device process launch --device "$IPHONE_UDID" com.onewaycompany.twelveguardians
```

기존 `release-artifacts/ios-derived/Build/Products/Debug-iphoneos/App.app`는 실패한 서명 시도의 산출물로 배포에 사용하지 않습니다. 개발 인증서 개인키는 Keychain에 두고 저장소로 내보내지 않았습니다. 스토어 공개·유료 가입은 진행하지 않았습니다.
