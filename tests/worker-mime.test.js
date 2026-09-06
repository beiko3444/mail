const test = require('node:test');
const assert = require('node:assert/strict');

test('incoming Worker decodes multipart UTF-8 body without truncating at blank lines', async () => {
  const worker = (await import('../cloudflare-email-worker/src/index.js')).default;
  const raw = 'From: Example <sender@example.com>\r\nSubject: Test\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="outer"\r\n\r\n--outer\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + Buffer.from('안녕하세요\n\n인증번호: 123456\n마지막 줄').toString('base64') + '\r\n--outer\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<p>alternative</p>\r\n--outer--';
  const originalFetch = global.fetch;
  let payload;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return new Response('', {status:202}); };
  try {
    await worker.email({raw:new Blob([raw]).stream(),to:'test@haruemail.com',from:'sender@example.com'}, {INGEST_URL:'https://example.invalid',INGEST_SECRET:'test'});
    assert.match(payload.text, /안녕하세요/);
    assert.match(payload.text, /인증번호: 123456/);
    assert.match(payload.text, /마지막 줄/);
    assert.doesNotMatch(payload.text, /Content-Type|--outer|alternative/);
  } finally { global.fetch = originalFetch; }
});

test('incoming Worker decodes HTML-only quoted printable UTF-8', async () => {
  const worker = (await import('../cloudflare-email-worker/src/index.js')).default;
  const raw = 'Subject: Test\r\nContent-Type: multipart/alternative; boundary="part"\r\n\r\n--part\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<p>=EC=95=88=EB=85=95</p>\r\n\r\n<p>123456</p>\r\n--part--';
  const originalFetch = global.fetch;
  let payload;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return new Response('', {status:202}); };
  try {
    await worker.email({raw:new Blob([raw]).stream(),to:'test@haruemail.com'}, {INGEST_URL:'https://example.invalid',INGEST_SECRET:'test'});
    assert.match(payload.text, /안녕/);
    assert.match(payload.text, /123456/);
    assert.doesNotMatch(payload.text, /Content-Type|--part|=EC/);
  } finally { global.fetch = originalFetch; }
});
