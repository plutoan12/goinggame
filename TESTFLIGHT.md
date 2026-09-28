# 열두 퍼즐 · 광고 비활성화 베타 준비

## 현재 60단계 픽셀 빌드 · 2026-09-29

- 앱: 열두 퍼즐 / 원웨이컴퍼니 / `com.onewaycompany.twelveguardians`
- 전체 60단계(10단계씩 6개 구간), 14종 픽셀 동물, 목표·표식·봉인 규칙, 기기 로컬 순위
- 공개된 맨 위 동물을 잠시 두는 자유 보관칸과 한 판에 한 번 쓰는 `보관칸 +1`
- 활성 게임 `twelve-puzzle-game-v4`, 로컬 순위 `twelve-puzzle-rankings-v4`, 순위 규칙 `twelve-puzzle-rules-v4`
- 광고 `enabled=false`, 대상 연령 미정, 플레이어용 광고 UI 없음
- 웹 자동 테스트 158/158과 두 모드 × 60단계 × 20시드, 총 2,400개 생성 보드 검증 완료
- iOS·Android 네이티브 동기화, iOS 기기용·Simulator용 미서명 Debug 빌드 완료
- iPhone 18 Pro / iOS 27.0 Simulator에서 설치·실행하고 자유 보관칸 튜토리얼과 60단계 선택 UI 확인
- Android Debug APK 빌드와 v2 서명·패키지 ID·앱 이름 확인 완료
- 이미 설치된 개발 자격으로 연결된 iPhone용 서명 빌드, 서명 검증, 데이터 보존 설치와 실행 완료
- 실제 iPhone 화면 관찰과 터치 입력은 이 실행 환경에서 할 수 없어 사람의 플레이 점검은 미완료
- App Store Connect 등록·Validate·업로드·TestFlight 설치는 미완료

## 빌드 증거 범위

현재 빌드에서 확인한 범위는 자동 테스트, 웹 빌드, 네이티브 동기화, Android Debug, iOS 미서명 기기·Simulator 빌드, Simulator 화면, 기존 자격을 사용한 iPhone 서명·설치·실행입니다. 이 증거는 배포 서명, Apple Validate, TestFlight 심사 또는 실제 손가락 플레이 통과를 뜻하지 않습니다.

이전 아카이브나 이전 단계 구성의 설치 파일은 현재 게임 내용과 다르므로 배포용으로 재사용하지 않습니다.

## 업로드 전 확인

1. Apple Developer Program, 배포 Team, App Store Connect 접근 권한을 운영자가 확인합니다.
2. 기존 앱 레코드와 빌드 번호를 확인하고 중복 등록을 피합니다.
3. 공개 HTTPS 개인정보 URL, 대상 연령, 암호화 수출 규정, SDK 개인정보 표시를 확정합니다.
4. 현재 소스로 Archive → Validate를 실행하고 실제 오류에 따라 수정합니다.
5. 내부/외부 테스터 범위를 정하고 운영자 확인 후 업로드합니다.

## 베타 설명 초안

열두 수호동물과 고양이·병아리를 같은 종류끼리 한 줄씩 완성하는 16비트 픽셀 정렬 퍼즐입니다. 60단계가 순서대로 열리고 목표·표식·봉인 규칙이 조합됩니다. 이동 제한·타임어택·연습 모드, 자유 보관칸, `보관칸 +1`, 기기 안 순위를 제공합니다.

현재 버전은 로그인·결제·온라인 순위·플레이어용 광고 기능이 없습니다. 광고는 `enabled=false`로 비활성 상태입니다.

문의: qkdqor19@icloud.com

## 테스트할 내용

- 첫 실행 메인 열→자유 보관칸→메인 열 튜토리얼과 본게임 진입
- 1·10·30단계와 디버그 해제 60단계 규칙과 순차 해제
- 손가락 탭·드래그, 긴 보드 가로·세로 스크롤
- 목표·표식·봉인·해제 아이콘과 색상 없이도 구분되는 문구
- 이동 제한·타임어택·연습, 마지막 수 우선 처리와 게임오버
- 자동 공개, `보관칸 +1`, 되돌리기, v4 저장·복원
- 기기 로컬 순위 등록과 중복 방지
- 320/390px 화면, 회전, 잠금·앱 전환, 픽셀 글자 가독성
- 광고 또는 가짜 광고 보상 UI가 나타나지 않음

제보에는 기종/iOS, 앱 버전, 단계·모드, 재현 순서, 기대 결과와 실제 결과를 포함합니다. 화면의 개인정보는 가립니다.

## 공식 참고

- [Apple TestFlight 개요](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [내부 테스터 추가](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)
