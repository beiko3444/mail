const test = require('node:test');
const assert = require('node:assert/strict');
process.env.MAILBOX_SECRET = 'test-only-secret-'.repeat(4);
process.env.RESEND_API_KEY = 'test-only-resend';
const mailbox = require('../api/_lib/mailbox');

test('random mailboxes are unique, signed, and expire after 24 hours', () => {
  const first = mailbox.issueMailbox(1000000);
  const second = mailbox.issueMailbox(1000000);
  assert.notEqual(first.mailbox.address, second.mailbox.address);
  assert.match(first.mailbox.address, /^[a-z]{5}[0-9]{5}@haruemail\.com$/);
  assert.equal(first.mailbox.expiresAt - first.mailbox.createdAt, 86400000);
  assert.deepEqual(mailbox.verifyToken(first.token, 1000001), first.mailbox);
  assert.throws(() => mailbox.verifyToken(first.token, 1000000 + 86400000));
});

test('tampering with either payload or signature is rejected', () => {
  const { token } = mailbox.issueMailbox();
  const [payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  claims.address = 'victim@haruemail.com';
  assert.throws(() => mailbox.verifyToken(Buffer.from(JSON.stringify(claims)).toString('base64url') + '.' + signature));
  assert.throws(() => mailbox.verifyToken(payload + '.wrong'));
  assert.throws(() => mailbox.verifyToken('garbage'));
});

test('only cookie possession authorizes a mailbox; query addresses do not', () => {
  assert.throws(() => mailbox.requireMailbox({ headers: {}, query: { address: 'victim@example.org' } }));
  const first = mailbox.issueMailbox();
  assert.equal(mailbox.requireMailbox({ headers: { cookie: `xtmail_session=${first.token}` } }).address, first.mailbox.address);
});

test('cross-site mutations rejected and mailbox cookies protected', () => {
  assert.throws(() => mailbox.checkOrigin({ headers: { host: 'mail.example.org', origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' } }));
  assert.doesNotThrow(() => mailbox.checkOrigin({ headers: { host: 'mail.example.org', origin: 'https://mail.example.org' } }));
  const headers = {};
  mailbox.setCookie({ headers: { host: 'mail.example.org' } }, { setHeader: (k,v) => headers[k] = v }, 'token');
  assert.match(headers['Set-Cookie'], /HttpOnly/);
  assert.match(headers['Set-Cookie'], /SameSite=Strict/);
  assert.match(headers['Set-Cookie'], /Secure/);
});

 test('Cloudflare inbox domain can change without rejecting existing signed mailboxes', () => {
  const oldReceiver = process.env.MAIL_RECEIVER;
  const oldDomain = process.env.CLOUDFLARE_INBOX_DOMAIN;
  try {
    process.env.MAIL_RECEIVER = 'cloudflare';
    process.env.CLOUDFLARE_INBOX_DOMAIN = 'haruemail.com';
    const previous = mailbox.issueMailbox();
    process.env.CLOUDFLARE_INBOX_DOMAIN = 'qiromi.com';
    const next = mailbox.issueMailbox();
    assert.match(next.mailbox.address, /^[a-z]{5}[0-9]{5}@qiromi\.com$/);
    assert.deepEqual(mailbox.verifyToken(next.token), next.mailbox);
    assert.deepEqual(mailbox.verifyToken(previous.token), previous.mailbox);
  } finally {
    if (oldReceiver === undefined) delete process.env.MAIL_RECEIVER; else process.env.MAIL_RECEIVER = oldReceiver;
    if (oldDomain === undefined) delete process.env.CLOUDFLARE_INBOX_DOMAIN; else process.env.CLOUDFLARE_INBOX_DOMAIN = oldDomain;
  }
});
