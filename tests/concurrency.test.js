// Deterministic concurrency regression tests. No network or browser UI.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const flush = () => new Promise(resolve => setImmediate(resolve));
const mailbox = {
  address: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@inbox.xtracker.co.kr',
  createdAt: Date.now(), expiresAt: Date.now() + 86400000,
};

function appHarness() {
  const nodes = new Map(), documentEvents = new Map(), timers = new Map();
  const requests = [];
  let timerId = 0;
  function element() {
    const events = new Map();
    return {
      textContent: '', value: '', disabled: false, children: [], open: false,
      classList: { toggle() {} },
      replaceChildren(...children) { this.children = children; },
      append(...children) { this.children.push(...children); },
      insertBefore(child, before) { this.children.splice(this.children.indexOf(before), 0, child); },
      setAttribute() {}, focus() {}, select() {},
      addEventListener(name, callback, options = {}) {
        if (!events.has(name)) events.set(name, []);
        events.get(name).push({ callback, once: options.once });
      },
      fire(name) {
        return (events.get(name) || []).slice().map(listener => {
          if (listener.once) events.set(name, events.get(name).filter(item => item !== listener));
          return listener.callback();
        });
      },
      showModal() { assert.equal(this.open, false, 'confirmation must not open twice'); this.open = true; },
      close(value) { this.returnValue = value; this.open = false; this.fire('close'); },
    };
  }
  const document = {
    hidden: false,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    createElement: element,
    addEventListener(name, callback) { documentEvents.set(name, callback); },
  };
  for (const id of ['createBtn', 'copyBtn', 'refreshBtn', 'closeBtn']) document.getElementById(id).disabled = true;
  const context = {
    document, navigator: {}, Intl, Date, AbortSignal: { timeout: () => null },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); }, setInterval() {},
    fetch(url, options) {
      return new Promise(resolve => requests.push({ url, method: options.method, resolve }));
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), context);
  return {
    nodes, requests, timers,
    take(url, method = 'GET') {
      const index = requests.findIndex(request => request.url === url && request.method === method);
      assert.notEqual(index, -1, `Expected ${method} ${url}`);
      return requests.splice(index, 1)[0];
    },
    reply(request, data, status = 200) {
      request.resolve({ ok: status < 400, status, json: async () => data });
      return flush();
    },
    click(id) { const button = nodes.get(id); if (!button.disabled) button.fire('click'); },
    focus() { documentEvents.get('visibilitychange')(); },
    firePoll() {
      const [id, callback] = timers.entries().next().value || [];
      assert.ok(callback, 'A poll must be scheduled');
      timers.delete(id); callback();
    },
    async boot(value) {
      await this.reply(this.take('/api/config'), { apiConfigured: true });
      await this.reply(this.take('/api/mailbox'), { mailbox: value });
      if (value) await this.reply(this.take('/api/messages'), { address: value.address, messages: [], partial: false });
    },
  };
}

test('initial mailbox restoration completes before address creation becomes available', async () => {
  const app = appHarness();
  await app.reply(app.take('/api/config'), { apiConfigured: true });
  assert.equal(app.nodes.get('createBtn').disabled, true);
  app.click('createBtn');
  assert.equal(app.requests.filter(request => request.method === 'POST').length, 0);
  await app.reply(app.take('/api/mailbox'), { mailbox: null });
  assert.equal(app.nodes.get('createBtn').disabled, false);
});

test('stale mailbox restoration cannot erase a successfully issued address', async () => {
  const app = appHarness(); await app.boot(null);
  app.focus(); const staleRestore = app.take('/api/mailbox');
  app.click('createBtn');
  await app.reply(app.take('/api/mailbox', 'POST'), { mailbox }, 201);
  await app.reply(app.take('/api/messages'), { address: mailbox.address, messages: [], partial: false });
  await app.reply(staleRestore, { mailbox: null });
  assert.equal(app.nodes.get('emailAddress').value, mailbox.address);
  assert.equal(app.nodes.get('refreshBtn').disabled, false);
  assert.equal(app.timers.size, 1);
});

test('older automatic polling cannot replace a newer manual refresh result', async () => {
  const app = appHarness(); await app.boot(mailbox);
  app.firePoll(); const automatic = app.take('/api/messages');
  app.click('refreshBtn'); const manual = app.take('/api/messages');
  await app.reply(manual, { address: mailbox.address, messages: [{ id: 'new', from: 'sender@example.org', subject: 'Latest', createdAt: new Date().toISOString() }], partial: false });
  assert.equal(app.nodes.get('messageCount').textContent, '1');
  await app.reply(automatic, { address: mailbox.address, messages: [], partial: false });
  assert.equal(app.nodes.get('messageCount').textContent, '1');
  assert.equal(app.timers.size, 1);
});

test('an obsolete poll error cannot clear the active mailbox after a newer success', async () => {
  const app = appHarness(); await app.boot(mailbox);
  app.firePoll(); const automatic = app.take('/api/messages');
  app.click('refreshBtn'); const manual = app.take('/api/messages');
  await app.reply(manual, { address: mailbox.address, messages: [], partial: false });
  await app.reply(automatic, { error: 'Session expired' }, 401);
  assert.equal(app.nodes.get('emailAddress').value, mailbox.address);
  assert.equal(app.nodes.get('refreshBtn').disabled, false);
});

test('confirmation prevents overlapping mutations and cancellation restores controls', async () => {
  const app = appHarness(); await app.boot(mailbox);
  app.click('createBtn');
  assert.equal(app.nodes.get('confirmDialog').open, true);
  assert.equal(app.nodes.get('createBtn').disabled, true);
  // Direct dispatch also checks the mutation lock, independent of disabled UI.
  app.nodes.get('createBtn').fire('click');
  assert.equal(app.requests.length, 0);
  app.nodes.get('confirmDialog').close('cancel'); await flush();
  assert.equal(app.requests.filter(request => request.method === 'POST').length, 0);
  await app.reply(app.take('/api/messages'), { address: mailbox.address, messages: [], partial: false });
  assert.equal(app.nodes.get('createBtn').disabled, false);
  assert.equal(app.nodes.get('emailAddress').value, mailbox.address);
  assert.equal(app.timers.size, 1);
});

function providerHarness(fetchImpl) {
  let now = 0, timerId = 0;
  const timers = new Map(), starts = [];
  class ClockDate extends Date { static now() { return now; } }
  const context = {
    module: { exports: {} }, process: { env: { RESEND_API_KEY: 'stub' } }, Date: ClockDate,
    setTimeout(callback, milliseconds) { timers.set(++timerId, { at: now + milliseconds, callback }); return timerId; },
    AbortSignal: { timeout(milliseconds) { return { deadline: now + milliseconds }; } },
    async fetch(url, options) {
      starts.push({ time: now, deadline: options.signal.deadline, url });
      if (fetchImpl) return fetchImpl(url, options);
      return { ok: true, text: async () => JSON.stringify({ id: 'id', to: [], created_at: new Date().toISOString() }) };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'api/_lib/resend.js'), 'utf8'), context);
  return {
    api: context.module.exports, starts,
    async drain() {
      for (let count = 0; count < 1000; count++) {
        await flush();
        if (!timers.size) return;
        const [id, timer] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        timers.delete(id); now = timer.at; timer.callback();
      }
      assert.fail('Fake timer loop exceeded safety bound');
    },
  };
}

test('provider bursts are bounded and admitted work fits inside a six-second deadline', async () => {
  const provider = providerHarness();
  const settled = Promise.allSettled(Array.from({ length: 60 }, (_, index) => provider.api.getReceivedMessage('id' + index)));
  await provider.drain();
  const results = await settled;
  assert.ok(results.some(result => result.status === 'fulfilled'), 'Some requests must be served');
  assert.ok(results.some(result => result.status === 'rejected'), 'Excess requests must fail promptly');
  assert.ok(provider.starts.length <= 8, 'Admission cannot grow without a bound');
  for (const start of provider.starts) {
    assert.ok(start.time <= 3000, `Upstream start was delayed ${start.time}ms`);
    assert.ok(start.deadline <= 6000, `Timeout exceeds request budget: ${start.deadline}ms`);
  }
  for (let index = 1; index < provider.starts.length; index++) assert.ok(provider.starts[index].time - provider.starts[index - 1].time >= 550);
});

test('failed provider requests release admission slots for later requests', async () => {
  let failing = true;
  const provider = providerHarness(async () => {
    if (failing) throw new Error('Simulated provider failure');
    return { ok: true, text: async () => JSON.stringify({ id: 'recovered', to: [], created_at: new Date().toISOString() }) };
  });
  const initial = Promise.allSettled(Array.from({ length: 6 }, (_, index) => provider.api.getReceivedMessage('id' + index)));
  await provider.drain();
  assert.ok((await initial).every(result => result.status === 'rejected'));
  failing = false;
  const recovered = provider.api.getReceivedMessage('recovered');
  await provider.drain();
  assert.equal((await recovered).id, 'recovered');
});
