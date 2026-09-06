# AdSense 준비 점검 — 2026-09-07

이 문서는 Google 승인이나 법률 준수를 보증하는 인증서가 아니다. 자동 검사, 실제 사이트 점검, Google 계정의 상태를 구분한다.

## 완료

- 실제 운영 사이트 `haruemail.com`을 기존 게시자 계정에 추가하고 메타 태그 방식으로 소유권 확인 완료. 예전 `xtmail.vercel.app`만 등록되어 있던 상태를 보완했다.
- 7개 언어 모든 공개 페이지에 동일 게시자 소유권 메타 태그. ads.txt 게시자 일치.
- 기존 5개 가이드의 외국어 버전에 실제 사용 예시, 문제 해결 절차, 안전한 테스트와 출처 추가. 새 키워드 전용 페이지는 만들지 않았다.
- 한국어 가이드에 남아 있던 Resend/30일 보관 설명을 실제 Cloudflare 수신·Supabase 저장 구성에 맞게 수정.
- 24시간 접근 만료와 저장 기록 삭제를 구분하고, 자동 삭제 미설정 사실을 명시.
- 6개 외국어 문의 페이지에 신고에 필요한 정보와 비밀값 제외 안내, 개인정보 페이지에 기능성 쿠키 설명 추가.
- 운영자가 제공한 이름과 문의 이메일을 표시할 수 있도록 구성. 값이 없을 때 임의 정보를 쓰지 않음.
- 일본어 긴 제목의 모바일 가로 넘침 수정.
- 받은편지함·메일 본문·오류 화면에 광고 없음. API 비공개 접근 확인 및 noindex 유지.
- Search Console 사이트맵 성공/84개 발견은 앞선 SEO 작업에서 확인. 발견은 색인이나 순위 보장이 아님.

## 신청 전에 남은 사항

1. 공개할 실제 운영자명과 상시 확인하는 문의 이메일을 운영자가 제공해야 한다. 현재 문의 채널 준비 중 표시가 남아 있으므로 신청 준비가 끝났다고 판단하지 않는다. 연락처를 받으면 `site.config.json`의 `operatorName`, `supportEmail`에 반영하고 7개 언어 페이지와 실제 수신 가능성을 확인한다.
2. 사이트의 콘텐츠 가치와 정책 준수 여부는 Google 심사 사항이다. 특정 글 수·글자 수·도메인 사용일만 채우면 승인된다는 기준은 사용하지 않는다.
3. 새 도메인에 대한 검토 요청은 아직 제출하지 않았다.

## 광고 활성화 전

- Google 유럽 규정 메시지 작성 화면에서 HaruMail 사이트명 및 `https://www.haruemail.com/en/privacy/` 연결 작업을 진행했다. 실제 메시지 저장·게시·CMP 동작 검증은 별도 확인이 필요하다.
- Google 인증 CMP, 거부/철회 선택, 필요한 지역별 개인정보 설정과 실제 광고 슬롯을 검증한 뒤 광고를 활성화한다. 현재 `approved:false`, `consentReady:false` 유지.
- 자동 광고로 수신함에 광고가 들어가지 않도록 한다. 공개 편집 가이드에만 수동 광고를 허용하는 기존 경계를 유지한다.
- 개인정보 설명과 실제 배포 설정이 일치해야 한다. 동의 메시지를 만들었다는 사실만으로 `consentReady`를 참으로 바꾸지 않는다.
- 트래픽 구매, 자기 광고 클릭, 클릭 유도 문구를 사용하지 않는다.

## 점검 방법

`node scripts/build.js` 뒤 `node --test --test-concurrency=1 tests/*.test.js` 실행. `node scripts/adsense-preflight.js`는 설정 누락만 점검하며 `.build-report.json`에도 같은 결과를 기록한다. 외부 심사와 콘텐츠 검토를 대신하지 않는다.

현재 전체 53개 테스트 통과(기존 로컬 SMTP 테스트 1개 포함, SMTP 변경은 이번 배포에 포함하지 않음). 브라우저에서 7개 언어의 가이드·문의·개인정보 35개 화면을 390px 너비로 확인하고, 가로 넘침·제목·광고 스크립트 부재·JavaScript 오류 여부를 검사했다.

## 공식 기준

- [사이트의 콘텐츠·탐색·사용자 경험 준비](https://support.google.com/adsense/answer/7299563?hl=ko)
- [게시자 콘텐츠가 없거나 가치가 낮은 화면의 광고](https://support.google.com/publisherpolicies/answer/11112688?hl=ko)
- [AdSense 프로그램 정책](https://support.google.com/adsense/answer/48182?hl=ko)
- [Google 인증 CMP 요건](https://support.google.com/adsense/answer/13554116?hl=en)
- [사이트가 광고를 게재할 준비가 되지 않았을 때](https://support.google.com/adsense/answer/12176698?hl=ko)
