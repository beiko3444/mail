# 하루메일 글로벌 검색 전략

작성: 2026-09-07. 대상: `https://www.haruemail.com`. 목표는 언어별로 실제 필요한 메일 수신·문제 해결 검색에서 발견될 가능성을 높이는 것이다. 순위와 색인 시점은 Google이 결정한다.

## 1. 현재 상황과 판단

- 한국어 루트와 영어·일본어·스페인어·포르투갈어·프랑스어·독일어 하위 경로가 있다. 언어당 12개, 합계 84개 공개 페이지다.
- 사용자가 제공한 Google 검색 화면에서 한국어 홈페이지 결과가 확인됐다. 따라서 사이트 전체가 검색에서 완전히 제외된 상황이라고 단정할 수 없다. 특정 검색어에서 노출되지 않는 원인은 페이지별 색인·국가별 순위·경쟁·관련성으로 나누어 진단한다.
- Search Console 사이트맵 성공/84개 발견을 확인했다. 한국어 홈페이지 URL 검사에서도 Google 등록·색인 완료, Googlebot 스마트폰의 페이지 가져오기 성공, 색인 허용을 확인했다(최근 크롤링 2026-09-07 04:30:44, 화면 표시 기준). 발견된 URL 수를 전체 색인 완료 수로 사용하지 않는다.
- 검색량 순위를 판단할 Keyword Planner 수치와 언어별 Search Console 성과 수치는 아직 확보하지 않았다. 아래 표현은 공개 검색 결과와 서비스 언어별 용례에 근거한 후보이며, ‘가장 많이 검색되는 단어’라는 주장이 아니다.
- 이번 변경은 공개 정적 콘텐츠와 검색 정보에 적용된다. 받은 메일, 쿠키, 인증 코드와 사용자별 URL은 SEO 콘텐츠가 아니다.

## 2. 언어별 핵심 검색어와 홈페이지 역할

| 언어/URL | 핵심 후보 | 보조 후보와 행동 의도 | 우선 관찰 시장(확장 가설) |
|---|---|---|---|
| 한국어 `/` | 임시메일 | 임시 이메일, 일회용 이메일, 무료·가입 없이 | 한국 |
| 영어 `/en/` | temp mail | temporary email, disposable email, free·no signup | 영어 사용자 전체; 미국·영국·인도 별도 측정 |
| 일본어 `/ja/` | 使い捨てメール | 捨てメアド, 一時メール, 無料·登録不要 | 일본 |
| 스페인어 `/es/` | correo temporal | correo desechable, email temporal, gratis·sin registro | 스페인·멕시코 및 중남미 별도 측정 |
| 포르투갈어 `/pt/` | email temporário | email descartável, grátis·sem cadastro | 브라질 우선 관찰, 포르투갈도 측정 |
| 프랑스어 `/fr/` | mail jetable | email temporaire, email jetable, gratuit·sans inscription | 프랑스·벨기에·캐나다 별도 측정 |
| 독일어 `/de/` | Wegwerf-E-Mail | temporäre E-Mail, Temp Mail, kostenlos·ohne Anmeldung | 독일·오스트리아·스위스 |

국가는 콘텐츠·수요 분석용 가설이다. 사용자 IP로 언어를 강제로 바꾸지 않으며, 동일 콘텐츠의 국가별 복제 경로를 만들지 않는다. 포르투갈어는 현재 브라질에서 자연스러운 표현을 중심으로 한다. 별도 pt-PT 페이지는 실질적으로 다른 콘텐츠가 필요할 때 검토한다.

홈페이지는 주소 생성과 수신이라는 작업을 즉시 수행하도록 유지한다. 제목은 언어별 핵심 표현과 무료/등록 불필요 같은 실제 편익을 먼저 설명하고 브랜드를 뒤에 둔다. H1·설명·본문도 같은 의미를 전달한다. 제목 길이는 검색 화면과 언어에 맞게 확인하되 임의의 글자 수를 순위 규칙으로 취급하지 않는다.

## 3. 검색 의도별 콘텐츠 구조

홈페이지 → 가이드 목록 → 문제별 가이드 → 관련 가이드 또는 수신 도구로 이어진다. 기존 URL을 유지한다. ‘임시메일’, ‘일회용메일’, ‘가짜메일’마다 동일한 랜딩 페이지를 만드는 방식은 사용하지 않는다.

| 기존 경로 | 맡는 검색 의도 | 포함할 정보 / 현재 적용 |
|---|---|---|
| `/` | 지금 무료 주소 만들기 | 주소 생성·복사·수신, 사용기간·제한, 기초 설명 |
| `/guides/` | 사용법과 문제 해결 찾기 | 목적이 다른 5개 가이드로 연결; 언어별 구체적인 페이지 제목 |
| `/guides/temporary-email-and-privacy/` | 임시메일 안전성·개인정보 | 접근 만료와 저장 삭제 차이, 현재 처리업체, 민감정보 제한 |
| `/guides/temporary-email-alias-or-inbox/` | 임시메일과 별칭 선택 | 일회성 작업/뉴스레터/계정 복구별 적절한 선택 |
| `/guides/missing-email-checklist/` | 메일·인증 코드 미수신 | 주소 거부와 발송·전달 실패 구분, 점검 순서, 문의 시 필요한 정보 |
| `/guides/responsible-email-testing/` | 자신이 관리하는 서비스의 메일 테스트 | 허가된 환경의 예시, 수신·코드 확인, HTML 미지원 등 테스트 한계 |
| `/guides/phishing-and-remote-tracking/` | 받은 메일과 링크 안전하게 읽기 | 도메인 예시, 외부 이미지, 의심스러운 링크 대응 |
| `/faq/` | 서비스 이용 조건 | 무료, 24시간, 전송 여부, 주소 제한 등 실제 답변 |

각 외국어 경로에는 같은 언어의 대응 페이지가 있다. 이번에 외국어 가이드의 본문 목차와 현재 위치 표시를 추가했다. FAQ/가이드 제목도 일반적인 ‘FAQ’, ‘Guides’보다 주제를 식별하기 쉽게 했다.

문제 해결 검색의 언어별 후보는 다음과 같다. 검색량 자료가 아니라 기존 가이드가 다룰 질문이다.

| 언어 | 미수신 질문 | 선택·개인정보 질문 |
|---|---|---|
| ko | 임시메일 인증메일 안 옴 | 임시메일 이메일 별칭 차이 |
| en | temporary email not receiving verification code | temporary email vs email alias |
| ja | 使い捨てメール 認証メール 届かない | 捨てメアド 安全性 |
| es | correo temporal no recibe código | correo temporal o alias de correo |
| pt | email temporário não recebe código | email temporário ou alias |
| fr | email temporaire code non reçu | email jetable ou alias |
| de | Wegwerf E-Mail Bestätigungscode kommt nicht an | Wegwerf E-Mail oder Alias |

검색어는 자연스러운 설명과 제목에만 사용한다. 반복 키워드 목록이나 숨긴 문장, meta keywords는 생성하지 않는다. ‘모든 서비스 인증 성공’, ‘완전 익명’, ‘Gmail 생성’, ‘자동 24시간 삭제’처럼 실제 기능과 다른 약속은 하지 않는다.

## 4. 기술 SEO와 이번 적용

- 언어별 자기 URL을 canonical로 사용하고, 동등한 페이지끼리 상호 hreflang 및 자기 참조를 유지한다. x-default는 영어다. hreflang은 언어별 페이지 선택 신호이지 순위 상승 보장이 아니다.
- 모든 공개 문서는 JavaScript 없이도 제목·본문·언어 링크를 읽을 수 있다. 메일 기능은 기존 브라우저 세션 보호를 유지한다.
- WebSite 구조화 데이터는 루트 도메인의 하나의 사이트로 통일한다. 이름은 하루메일, 대체 이름은 HaruMail·하루이메일이다. `/en/`을 별도 사이트로 선언하지 않는다. 페이지마다 공통 사이트에 속한다는 정보를 연결한다.
- Google은 사이트명과 검색 제목을 자체 생성할 수 있다. 사용자 화면의 `haruemail.com` 표시가 코드 변경 즉시 HaruMail로 바뀐다고 보장하지 않는다.
- Article/Breadcrumb 데이터는 보이는 콘텐츠와 일치시킨다. 실제 검색 기능이 없으므로 SearchAction을 만들지 않는다. 가짜 평점·리뷰나 임의의 FAQ 리치 결과 기대를 넣지 않는다.
- 평면 사이트맵에 84개 canonical URL을 유지한다. 재배포할 때마다 거짓 lastmod를 갱신하지 않는다. 모든 URL에 기존 HTML hreflang이 있으므로 동일 정보를 다른 위치에 반복 추가하는 것을 성과로 계산하지 않는다.
- `scripts/seo.js`가 빌드마다 언어, 제목·설명, canonical, 양방향 hreflang 대상 존재, 검색 제외 여부, 검색 의도별 URL 누락을 검사한다. 결과는 비공개 `.seo-report.json`에 기록한다. 실패하면 배포 빌드를 중단한다.
- 광고 설정과 검색 설정은 별개다. 수신함은 계속 광고 없이 운영한다.

## 5. 측정과 의사결정

운영자는 Search Console의 검색 실적에서 ‘웹’ 검색을 선택하고, 페이지를 정확한 홈페이지 URL 또는 언어 경로로 필터링한다. 한국어는 루트 홈과 한국어 가이드 경로를 따로 선택해 다른 언어가 섞이지 않게 한다. 국가 필터를 결합하고, 검색어별 노출·클릭·CTR·평균 게재순위를 기록한다. Search Console은 검색어의 전체 시장 검색량을 보여주는 도구가 아니다.

| 관찰 | 다음 행동 |
|---|---|
| URL 검사에서 미색인 | 표시된 제외 사유, Google 선택 canonical, 가져오기 결과 확인. 원인을 해결한 대표 URL에만 재수집 요청 |
| 색인됐으나 노출이 적음 | 더 구체적인 실제 질문을 해당 가이드에 보강. 국가·언어 수요와 정상 내부 링크를 확인 |
| 비슷한 국가·기기·순위에서 노출은 있지만 CTR이 낮음 | 제목·설명 한 요소를 변경하고 날짜 기록. 변경 전후 비교에서 순위·검색어 구성 변화도 함께 확인 |
| 클릭은 늘지만 메일 생성이 실패함 | 검색 문구보다 수신 기능·브라우저 오류부터 개선. 메일 본문을 분석 도구에 보내지 않음 |
| 예상과 다른 언어가 표시됨 | 해당 페이지의 hreflang, 실제 본문 언어, canonical과 Google 검사 결과 확인 |

현재 분석 추적기를 추가하지 않았다. 세션별 메일 주소·인증 코드·본문을 수집하는 전환 추적은 하지 않는다. 실제 전환 분석이 필요하면 별도 개인정보 설계 후, 내용을 담지 않는 집계 이벤트만 검토한다.

## 6. 실행 순서

1. **이번 배포:** 7개 언어 제목/가이드 연결/사이트 구조화 데이터/자동 검사 적용. 현재 운영 결과를 확인한다.
2. **배포 후 1주 점검:** 대표 한국어·영어 홈페이지와 우선 시장의 언어 URL을 URL 검사로 확인. 사이트맵을 반복 제출하거나 매일 제목을 변경하지 않는다. 수집은 며칠~몇 주 걸릴 수 있다.
3. **2~4주 데이터 검토:** 충분한 관측치가 있는 국가·언어 조합부터 비브랜드 검색어와 페이지를 비교한다. 데이터가 적으면 결론을 유보한다. ‘100회 노출’ 같은 수치를 Google 기준인 것처럼 사용하지 않는다.
4. **이후 개선:** 실제 미수신 질문·용어 차이를 우선 가이드에 반영하고 원어민 검토로 표현을 개선한다. 독립된 문제가 확인될 때만 새 글을 만든다.
5. **외부 발견:** 소유한 소개 페이지와 실제 관련 커뮤니티에 서비스 기능·한계를 정확히 설명한 링크를 제공할 수 있다. 유료 링크·댓글 도배·가짜 리뷰는 하지 않는다. 이번 작업에서는 외부 게시물이나 메시지를 발송하지 않았다.

이 일정은 운영 절차이며 자동 실행 작업을 생성한 것이 아니다. 승인·상위 노출·트래픽 증가 기한을 약속하지 않는다.

## 7. 근거

언어별 표현 확인용(경쟁사의 기능·안전성 주장을 가져오지 않음):
- https://temp-mail.org/en/
- https://sutemeado.com/
- https://mail.cx/es
- https://www.geravalida.com.br/email-temporario
- https://temp-mail.org/fr/
- https://temp-mail.org/de/
- 기존 조사: `docs/2026-09-07-international-seo-research.md`

Google 공식 기술·콘텐츠 지침:
- 제목: https://developers.google.com/search/docs/appearance/title-link
- 사이트명과 대체 이름: https://developers.google.com/search/docs/appearance/site-names
- 언어 연결: https://developers.google.com/search/docs/specialty/international/localized-versions
- 국가·언어 사이트: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- 재수집 요청: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- 사람에게 유용한 콘텐츠: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

수정할 파일: `content/seo-strategy.json`. 홈페이지 제목과 가이드/FAQ 검색 제목은 이 파일을 기준으로 생성된다. `node scripts/build.js` 및 `node --test --test-concurrency=1 tests/*.test.js`로 확인한다.
