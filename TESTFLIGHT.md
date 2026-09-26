# 열두 수호대 · 광고 비활성화 베타 준비

## 상태 · 2026-09-26

**Release 아카이브 사전 검증 완료, 배포 서명·Apple 검증·업로드는 미완료.**

- 앱: 열두 수호대 / 원웨이컴퍼니 / `com.onewaycompany.twelveguardians`
- 로컬 버전: 1.0 (1). App Store Connect의 기존 빌드 번호는 미확인.
- `npm test`: 64/64 통과. `npm run native:sync`: 성공.
- Xcode 27.0, generic iOS arm64, Release archive 명령 종료 코드 0.
- 아카이브의 앱 ID·버전·아이콘 정보·Release의 빈 `CAPACITOR_DEBUG` 확인.
- 아카이브 내 `public/game.js`와 최신 `dist/game.js` 바이트 일치.
- 실행 파일과 App dSYM의 UUID 일치.
- 광고 `enabled=false`, 대상 연령 미정. 게임 규칙과 사용자 저장은 변경하지 않음.

검증용 아카이브:

`/Users/an-youwon/Library/Developer/Xcode/DerivedData/GoingGame-TestFlight-preflight-3o8p5D/TwelveGuardians-unsigned.xcarchive`

`CODE_SIGNING_ALLOWED=NO`로 생성했으므로 Team/SigningIdentity가 비어 있고 `codesign`은 미서명으로 판정한다. 설치·배포용 IPA가 아니다. 계정 준비 후 적절한 Team으로 새 배포 아카이브를 만들어야 한다.

빌드 중 외부 AdMob 플러그인의 deprecated API 경고와 `SwiftCompile ... failed with exit code 0` 진단이 한 번 출력됐다. 최종 archive 명령은 종료 코드 0이고 산출물 검사를 통과했지만 Apple Validate 통과와는 별개다. 배포 서명 빌드에서 재발 여부를 확인한다.

## 업로드 전 확인

1. **멤버십:** 확인된 로컬 설치 이력은 Personal Team 개발 서명이다. 유료 Apple Developer Program 활성 상태, 배포 Team, App Store Connect 접근 권한은 별도 확인한다. 가입·결제는 운영자가 직접 한다.
2. **앱 등록:** 기존 앱 레코드를 확인하고 중복 생성하지 않는다. 새 등록 시 앱명·Bundle ID·SKU·기본 언어를 확정한다. 기존 빌드 번호와의 충돌도 확인한다.
3. **개인정보:** SDK manifest와 실제 통신을 함께 확인하고 방침을 확정한다. 공개 HTTPS 개인정보 URL, 대상 연령, 암호화 수출 규정 질문은 운영자 확인 없이 임의 답변하지 않는다.
4. **서명·검증:** 배포 Team으로 Archive → Validate. 실제 오류에 따라 처리하며 비밀번호·개인키를 문서나 저장소에 넣지 않는다.
5. **배포:** 업로드와 테스트 범위를 운영자 확인 후 진행한다. 내부 테스터는 App Store Connect 접근 권한이 있는 사용자다. 일반 지인은 외부 테스트 절차를 확인한다. 빌드 처리 완료와 TestFlight 실제 설치를 별도로 확인한다.

`release:check`는 정식 출시용 자체 정적 검사다. 현재 연령 미정·공개 개인정보 URL 없음·방침 초안 때문에 실패하며 우회하지 않는다. 이 결과를 모든 TestFlight 내부 테스트의 Apple 필수 입력 조건과 동일시하지 않는다. 실제 콘솔 요구 사항을 별도 확인한다.

## SDK 개인정보 검토

아카이브에 Capacitor, Cordova, GoogleMobileAds, UserMessagingPlatform의 `PrivacyInfo.xcprivacy`가 있다. GoogleMobileAds manifest는 진단·대략적 위치·성능·충돌·광고·상호작용·기기 ID 항목을 선언하며 기기 ID에는 tracking 선언이 있다. UMP는 대략적 위치·성능·상호작용 항목을 선언한다.

이는 **SDK 선언**이며 광고 비활성화 앱의 실제 전송 증거는 아니다. 광고 꺼짐만으로 수집 없음으로 표시해서도 안 된다. Xcode privacy report와 기기 네트워크 검사는 미완료다. 이번 준비에서 SDK 제거 또는 광고·ATT 활성화는 하지 않았다.

## 베타 설명 초안

열두 수호동물과 고양이·병아리를 같은 친구끼리 모으는 정렬 퍼즐입니다. 맨 위 동물 한 마리를 공간이 남은 다른 열로 옮기고, 모든 동물을 같은 종류로 한 줄씩 완성해 주세요. 입문을 클리어하면 다음 단계가 열립니다. 이동 제한·타임어택·연습 모드를 제공합니다.

이 버전은 광고가 꺼져 있습니다. 로그인과 결제는 없으며 순위는 현재 기기 안의 기록입니다. 테스트 중 저장 방식과 난이도가 변경될 수 있습니다.

문의: qkdqor19@icloud.com

## 테스트할 내용 초안

- 첫 실행 3수 튜토리얼, 드래그와 두 번 터치, 완료 후 본게임 진입.
- 입문 16마리 / 산책 30마리의 체감 길이. 실제 소요 시간과 이동 수 기록.
- 모든 줄을 완성해야 클리어되고 다음 단계가 정상 해제되는지.
- 아이템 차감, 마지막 이동 성공/실패, 타임어택 중 도움말·앱 전환 시 정지.
- 앱 종료·재실행, 비행기 모드에서 진행·해금·순위 유지, 중복 순위 없음.
- 광고 또는 가짜 광고 보상이 나타나지 않는지.
- 작은 화면·가로 회전·긴 보드의 스크롤, 첫 실행 속도.

제보에는 기종/iOS, 앱 버전, 단계·모드, 재현 순서, 기대 결과/실제 결과를 포함하고 화면의 개인정보는 가린다. 자동화 검증은 사람의 플레이 시간·손가락 조작감을 대체하지 않는다.

## 공식 참고

- [Apple 배포 및 TestFlight 멤버십 안내](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [TestFlight 개요](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [내부 테스터 추가](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)
