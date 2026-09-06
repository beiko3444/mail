# XT Mail — 무료 임시 이메일

가입 없이 무작위 이메일 주소를 발급하고 받은 메일을 텍스트로 확인합니다. 기존 Vercel/Resend 사이트에 공개 가이드와 광고 신청 준비 구조를 추가한 버전입니다.

## 실행

Node.js 22 이상. 외부 패키지는 필요하지 않습니다.

```sh
cp .env.example .env
npm run dev
npm test
npm run build
```

실제 수신에는 기존 수신 도메인의 Resend 설정과 수신 권한을 가진 RESEND_API_KEY가 필요합니다. 비밀키는 .env 또는 호스팅 환경변수에만 넣으세요. 키가 없으면 주소를 발급하지 않고 준비 중 안내를 표시합니다. 테스트는 격리된 가상 제공자 응답을 사용하며 실제 메일을 보내지 않습니다.

## 메일함 접근

- 서버가 128비트 무작위 주소를 발급합니다. 수신 주소 이름을 임의 선택하거나 기존 주소를 주소만으로 열 수 없습니다.
- HttpOnly / SameSite=Strict / HTTPS Secure 쿠키가 서명된 메일함 접근 정보를 보관합니다. 발급 후 24시간 유효하며 토큰은 URL에 포함하지 않습니다.
- MAILBOX_SECRET을 별도로 설정하는 것을 권장합니다. 없으면 기존 RESEND_API_KEY로부터 도메인을 분리한 HMAC 키를 유도합니다. 두 키를 바꾸면 기존 세션이 무효화될 수 있습니다.
- 새 주소 또는 닫기는 현재 브라우저의 쿠키를 교체/제거합니다. 복사된 이전 토큰을 즉시 취소하는 서버측 폐기 목록은 없으므로 원래 기한까지 유효할 수 있습니다. Resend 원본 메일 삭제를 의미하지 않습니다.
- 다른 브라우저, 임의 주소 쿼리, 다른 수신자의 메시지 ID로 접근할 수 없습니다. 본문·인증번호를 분석/광고 서비스로 보내지 않습니다.
- 기존 공유 aliases API는 410입니다. 과거 Supabase/Redis 주소 자료는 삭제하지 않지만 공개 서비스로 가져오지 않습니다. 기존 관리자의 과거 주소 접근도 이 공개 UI에서는 제공하지 않습니다.
- 수신 목록은 제공자 페이지를 순서대로 조회하고 20초 임시 캐시를 공유합니다. 10페이지/시간 한도를 넘으면 부분 조회를 명시합니다. 대규모 운영에는 수신 webhook과 별도 저장·인덱스를 도입해야 합니다.
- 주소 발급 요청의 인스턴스별 제한과 제공자 요청의 대기 제한이 있습니다. 분산된 전체 트래픽의 제한은 호스팅 WAF에서 추가로 설정해야 합니다.

## 배포

Vercel은 `npm run build`로 생성한 `dist/`를 공개하고 `api/` 핸들러를 실행합니다. .env, 소스, 테스트, 설정파일, 과거 데이터는 정적 출력에 포함되지 않습니다. 로컬 서버도 동일한 핸들러와 공개 출력만 제공합니다.

site.config.json의 origin은 실제 정식 HTTPS 주소로 설정합니다. 미리보기에서는 SITE_ORIGIN을 별도로 지정할 수 있습니다. DNS·메일 도메인 설정을 임의로 변경하지 않습니다.

Vercel Hobby는 비상업적 개인용입니다. 광고 수익화를 위한 공개 배포 전에 사용 중인 플랜을 확인하고 Pro 또는 상업용 이용이 가능한 호스팅을 선택하세요. 이 변경은 요금제를 구매하지 않습니다.

## AdSense 신청 준비

광고 승인은 보장되지 않습니다. Google은 가이드뿐 아니라 사이트 전체를 심사합니다. 기사 수·글자 수·트래픽의 임의 기준을 승인 조건으로 가정하지 않습니다.

구현된 항목:
- 원본 한국어 가이드 5편, FAQ, 소개, 문의, 개인정보처리방침, 이용약관
- 반응형 메뉴와 읽기 화면, 키보드 포커스, 메타데이터, canonical, robots, sitemap, 404
- 메일/개인 통신 중심 화면과 광고 허용 가이드 페이지의 분리
- 수신함의 CSP 및 광고 코드 제외, API no-store / noindex
- 실제 게시자 ID를 설정했을 때만 소유권 메타태그와 ads.txt 생성
- 승인·광고 단위·인증 CMP 설정 전에는 광고 로드 금지

계정 및 실제 운영 정보가 필요한 항목:
1. 공개할 운영자/개인정보 문의 이메일을 SUPPORT_EMAIL 또는 site.config.json.supportEmail에 입력하고 방침 내용을 실제 운영과 대조합니다.
2. 사용자의 Google 계정으로 AdSense 가입·기존 계정 접속. 이름·주소·국가·연령·결제정보는 실제 정보로 직접 확인합니다.
3. 발급된 pub-16자리 ID를 ADSENSE_PUBLISHER_ID 또는 site.config.json.ads.publisherId에 설정합니다. 가짜 ID는 사용하지 않습니다.
4. 공개 HTTPS 사이트와 도메인 소유권을 확인하고 AdSense 사이트 목록에서 심사를 요청합니다. ads.txt는 실제 ID 한 줄, 소유권은 광고 스크립트가 없는 메타태그 방식도 지원합니다.
5. AdSense 개인정보 보호 및 메시지에서 필요한 지역의 인증 CMP·규제 메시지를 설정하고, 실제로 받은 설치 코드를 content/cmp-snippet.html에 넣습니다. 운영 지역에 맞는 동의/거절/설정 변경 흐름을 확인합니다. 일반 쿠키 배너를 인증 CMP로 간주하지 않습니다.
6. 승인 후에만 ads.approved=true, ads.consentReady=true 및 실제 수동 광고 slotId를 설정합니다. 자동 광고는 끄고 수신함·문의·법적 고지·오류 페이지를 광고에서 제외합니다. ads.js는 CMP가 없거나 필요한 동의가 없으면 광고를 불러오지 않습니다.
7. 정책센터와 ads.txt 상태, 광고 설정을 실제 계정에서 확인합니다. 광고 클릭 유도나 자동 클릭·조회수 생성은 금지합니다.

`.build-report.json`은 아직 확인하지 못한 항목을 기록하며 공개 출력에는 포함하지 않습니다.

## 검증

`npm test`는 정적 빌드 후 격리된 테스트를 순서대로 실행합니다. 인증 누락/위조/만료, 다른 메일함 조회 거부, 원본 HTML 미노출, 수신 페이지네이션, 서버 경로/쿠키, 공개 파일 허용 목록, 내부 링크와 광고 경계를 검증합니다. 자동화된 수신 테스트 성공은 운영 Resend의 실제 전달 성공과 다릅니다.

## 근거 문서

- [Google AdSense 자격 요건](https://support.google.com/adsense/answer/9724?hl=ko)
- [사이트 콘텐츠와 탐색](https://support.google.com/adsense/answer/7299563?hl=ko)
- [광고 배치·이메일 제한](https://support.google.com/adsense/answer/48182?hl=ko)
- [사이트 연결과 소유권 확인](https://support.google.com/adsense/answer/7584263?hl=en)
- [Google 인증 CMP 요건](https://support.google.com/adsense/answer/13554116?hl=en)
- [Vercel Hobby 이용 범위](https://vercel.com/docs/plans/hobby)
- [Resend 요금과 보관기간](https://resend.com/pricing)
