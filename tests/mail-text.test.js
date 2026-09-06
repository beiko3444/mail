const test = require('node:test');
const assert = require('node:assert/strict');
const { readableMailText } = require('../api/_lib/mail-text');

test('stored HTML email is readable without markup, CSS or tracking URLs', () => {
  const text = readableMailText('<!doctype html><html><head><style>body{color:red}</style></head><body><p>안녕하세요 &amp; welcome</p><div>인증번호: 123456</div><script>alert(1)</script><img src="https://tracker.invalid/pixel"><a href="https://tracker.invalid/click">확인</a></body></html>');
  assert.match(text, /안녕하세요 & welcome/);
  assert.match(text, /인증번호: 123456/);
  assert.match(text, /확인/);
  assert.doesNotMatch(text, /<|color:red|alert|tracker/);
});
test('plain text, line breaks and address literals are preserved', () => {
  const text = 'hello <user@example.com>\n인증번호: 123456';
  assert.equal(readableMailText(text), text);
  assert.equal(readableMailText(null), '');
});
