# Free Mail Forge

`@inbox.xtracker.co.kr` 로 실제 수신되는 메일을 확인하는 웹 앱입니다.
`mail.tm` 대신 Resend 커스텀 도메인 + Received Emails API를 사용하며, Vercel 배포를 기준으로 동작합니다.

## 포함 기능

- 원하는 local-part 로 수신 주소 선택
- 생성한 주소 목록 DB 영구 저장 및 빠른 전환
- `@inbox.xtracker.co.kr` 실제 수신 메일 조회
- 받은 메일 목록 조회
- 메일 상세 본문 보기
- HTML 메일 미리보기
- 첨부파일 다운로드 링크 표시
- 15초 자동 새로고침
- Vercel serverless API (`/api/*`) 연동
- 모바일 대응 레이아웃

## 필요한 환경 변수

아래 변수는 로컬 또는 Vercel Project Settings > Environment Variables 에 설정합니다.

```bash
HOST=127.0.0.1
INBOX_DOMAIN=inbox.xtracker.co.kr
RESEND_API_KEY=re_xxxxxxxxx
PORT=4173
# 선택: webhook 서명 검증을 추가할 때 사용
RESEND_WEBHOOK_SECRET=
# aliases DB (Supabase REST) - 권장
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ALIASES_SUPABASE_TABLE=aliases
# aliases DB (Vercel KV / Upstash Redis REST)
KV_REST_API_URL=
KV_REST_API_TOKEN=
# 선택: aliases 저장 키 이름
ALIASES_DB_KEY=xtracker:aliases:default
```

## 실행 방법

### 1. Vercel 배포

1. GitHub에 이 저장소를 push
2. Vercel에서 Import Project
3. Environment Variables 등록
4. Deploy

필수 변수:

- `INBOX_DOMAIN=inbox.xtracker.co.kr`
- `RESEND_API_KEY=re_xxxxxxxxx`

aliases DB는 아래 둘 중 하나를 설정:

- Supabase 사용 시(권장): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (또는 `SUPABASE_ANON_KEY`)
- KV 사용 시: `KV_REST_API_URL`, `KV_REST_API_TOKEN`

선택 변수:

- `RESEND_WEBHOOK_SECRET`
- `ALIASES_SUPABASE_TABLE=aliases`
- `ALIASES_DB_KEY=xtracker:aliases:default`

### 2. 로컬 실행(선택)

Finder에서 아래 파일 더블클릭:

- `Start Free Mail Forge.command`
- `Stop Free Mail Forge.command`

또는 터미널:

```bash
node server.js
```

브라우저에서 `http://localhost:4173` 로 접속합니다.

## 사용 흐름

1. Resend에서 `inbox.xtracker.co.kr` Receiving 검증을 완료합니다.
2. Vercel 환경변수에 `RESEND_API_KEY` 와 aliases DB(Supabase 또는 KV) 변수를 넣고 배포합니다.
3. 웹앱에서 `hello`, `support`, `test` 같은 local-part 를 입력합니다.
4. 예를 들어 `hello@inbox.xtracker.co.kr` 로 메일을 보냅니다.
5. 앱이 15초마다 해당 주소의 메일을 다시 확인합니다(Resend API 조회).
6. 여러 주소를 저장해두고 목록에서 클릭해 각각의 메일함으로 전환할 수 있습니다.

## Supabase 테이블 준비

Supabase를 쓰면 아래 SQL을 1회 실행해주세요.

```sql
create table if not exists public.aliases (
  address text primary key,
  last_used_at timestamptz not null default now()
);
```

## 공개 webhook 연결

웹훅은 필수는 아니지만 연결해두면 운영 모니터링에 도움이 됩니다.
Resend Webhook URL:

```text
https://your-domain.example/api/webhooks/resend
```

이벤트는 `email.received` 를 선택하면 됩니다.
현재 구현은 메일 본문을 조회 시점에 Resend API에서 가져오므로, 서버가 꺼져 있던 시간의 메일도 다시 확인할 수 있습니다.

## 참고한 공식 문서

- https://resend.com/docs/dashboard/receiving/introduction
- https://resend.com/docs/webhooks/emails/received
- https://resend.com/docs/dashboard/receiving/get-email-content
- https://resend.com/docs/api-reference/emails/list-received-emails
