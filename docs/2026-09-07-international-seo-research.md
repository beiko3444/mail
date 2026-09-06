# 하루메일 다국어 검색 조사와 적용

조사일: 2026-09-07. 공개 검색 결과와 실제 서비스의 언어별 표현을 확인했다. Google Ads Keyword Planner, Search Console의 실적 수치, 유료 키워드 데이터는 이번 조사에서 확보하지 않았다. 아래는 관련성이 확인된 검색어 후보이며 검색량 순위나 월간 검색량을 뜻하지 않는다. 경쟁 서비스의 설명을 복제하지 않고 하루메일의 실제 기능에 맞게 작성했다.

| 언어 | 핵심 검색어 | 보조 검색 의도 | 적용 URL |
|---|---|---|---|
| 한국어 | 임시메일, 임시 이메일, 일회용 이메일 | 무료 임시메일, 가짜 이메일 뜻, 인증 메일 안 옴 | `/` |
| 영어 | temp mail, temporary email, disposable email | free temporary email, fake email, 10 minute mail 비교, email not receiving | `/en/` |
| 일본어 | 使い捨てメール, 捨てメアド, 一時メール | 無料, 登録不要, メールが届かない | `/ja/` |
| 스페인어 | correo temporal, correo desechable, email temporal | gratis, sin registro, no llega el correo | `/es/` |
| 포르투갈어 | email temporário, email descartável | grátis, sem cadastro, não recebe email | `/pt/` |
| 프랑스어 | email temporaire, email jetable, mail jetable | gratuit, sans inscription, email non reçu | `/fr/` |
| 독일어 | Wegwerf-E-Mail, temporäre E-Mail, Temp Mail | kostenlos, ohne Anmeldung, E-Mail kommt nicht an | `/de/` |

## 조사 근거

- 영어 용례: https://temp-mail.org/en/
- 일본어 용례: https://temp-mail.org/ja/ 및 https://temporary-email.org/ja
- 스페인어 용례: https://temp-mail.io/es 및 https://www.temporary-email.org/es
- 포르투갈어 용례: https://temp-mail.org/pt/ 및 https://temp-mail.io/pt
- 프랑스어 용례: https://temp-mail.io/fr 및 https://temporary-email.org/fr
- 독일어 용례: https://temporary-email.org/de

이 자료는 언어별 용어 확인용이다. 경쟁사의 수신 성공률·익명성·차단 회피 관련 주장을 하루메일의 기능이나 보장으로 인용하지 않는다.

## 적용한 검색 구조

- 한국어 URL을 유지하고 6개 언어 디렉터리를 추가했다. 언어당 홈페이지, 가이드 목록, 가이드 5개, FAQ, 소개, 문의, 개인정보, 약관을 제공한다. 합계 84개의 공개 페이지다.
- 제목·설명·H1·본문·UI·대화상자·오류 문구를 번역했다. 검색 로봇이 JavaScript를 실행하지 않아도 본문을 읽을 수 있다.
- 각 페이지의 canonical은 자기 언어 URL이다. 동등한 페이지끼리 ko/en/ja/es/pt/fr/de와 영어 x-default의 상호 hreflang을 선언한다. 사용자가 언어를 고르는 실제 HTML 링크가 있다. IP/브라우저 언어에 따른 강제 이동은 없다.
- `sitemap.xml`에 공개 URL을 포함하고 `robots.txt`에서 안내한다. 검색용 본문에 메일 주소·메일 본문을 섞지 않으며 기존 data-nosnippet과 API noindex를 유지한다.
- 검색어마다 별도 얇은 페이지를 만들지 않았다. 임시메일의 원리, 별칭과의 차이, 미수신, 개발 테스트, 피싱이라는 서로 다른 이용 문제를 안내한다.
- “가짜 이메일”은 실제 수신 주소와 존재하지 않는 주소의 차이를 설명한다. “10 minute mail”은 하루메일의 실제 24시간 접근과 비교한다. Gmail 주소 생성, 완전 익명, 모든 사이트 인증 성공을 광고하지 않는다.
- 기존 Resend 중심 보관 설명을 현재 Cloudflare/Supabase 구성으로 수정했다. 24시간 접근 만료를 저장 데이터 자동 삭제로 설명하지 않는다.

## Google 공식 지침

- 언어별 URL과 강제 언어 이동 주의: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- 상호 hreflang, self-reference, x-default: https://developers.google.com/search/docs/specialty/international/localized-versions
- 사이트맵 생성·제출: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- 키워드 남용·검색 순위 조작 목적의 대량 페이지 방지: https://developers.google.com/search/docs/essentials/spam-policies

## 측정과 한계

사이트맵 제출은 색인이나 순위를 보장하지 않는다. 배포 후 Search Console에서 언어별 URL의 색인 상태와 국가·검색어별 노출, 클릭, CTR을 확인해야 한다. 실제 데이터가 쌓인 후 낮은 CTR의 제목, 미색인 사유, 추가로 필요한 언어를 조정한다. 첫 배포에 허구의 검색량·트래픽 예측·별점 데이터를 넣지 않았다.
