# Mailbox Motion Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 하루메일 inbox a contemporary visual surface and a short, accessible completion animation whenever a new mailbox is issued.

**Architecture:** Keep the static-page build and the existing API contract unchanged. `app.js` owns the temporary success state by placing a class on the mailbox card after a successful POST; `styles.css` defines the visual system and limits motion to users who have not requested reduced motion. `tests/site.test.js` verifies the required client-side hooks and CSS safeguards without requiring a browser dependency.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Node.js built-in test runner.

---

### Task 1: Describe the mailbox completion state in a regression test

**Files:**
- Modify: `tests/site.test.js`
- Modify: `app.js`
- Test: `tests/site.test.js`

- [ ] **Step 1: Write the failing test**

Append this test to `tests/site.test.js`:

```js
test('mailbox issuance exposes an accessible one-shot completion state', () => {
  const client = fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css = fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.match(client,/function celebrateMailbox\(\)/);
  assert.match(client,/mailboxCard.*classList\.add\('mailbox-issued'\)/);
  assert.match(client,/animationend/);
  assert.match(client,/classList\.remove\('mailbox-issued'\)/);
  assert.match(css,/\.mailbox-card\.mailbox-issued/);
  assert.match(css,/@media\(prefers-reduced-motion:no-preference\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --test-concurrency=1 tests/site.test.js`

Expected: FAIL because `celebrateMailbox` and the `.mailbox-issued` implementation do not exist.

- [ ] **Step 3: Add the minimal mailbox completion controller**

In `app.js`, add a `celebrateMailbox()` helper that adds `mailbox-issued` to `#mailboxCard`, registers one `animationend` listener to remove it, and uses a timeout fallback so repeated address issuance can replay the animation. Call it only after `setMailbox(payload.mailbox)` in the successful `POST` branch of `mutate`; do not call it on restore or DELETE.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test --test-concurrency=1 tests/site.test.js`

Expected: PASS with the new completion-state test and existing site tests.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/site.test.js
git commit -m "Add mailbox issuance completion state"
```

### Task 2: Apply the contemporary surface and motion styling

**Files:**
- Modify: `styles.css`
- Test: `tests/site.test.js`

- [ ] **Step 1: Extend the failing test with reduced-motion behavior**

Add these assertions inside the completion-state test:

```js
assert.match(css,/\.mailbox-card\.mailbox-issued \{[^}]*animation:mailbox-arrival/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.mailbox-card\.mailbox-issued\{animation:none/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --test-concurrency=1 tests/site.test.js`

Expected: FAIL because the specific arrival keyframe and reduced-motion override do not exist.

- [ ] **Step 3: Implement the visual system and keyframes**

In `styles.css`:

```css
.site-body{background:radial-gradient(circle at 72% 0,#dce9ff 0,transparent 31rem),linear-gradient(135deg,#f8fbff,#eef4ff)}
.mailbox-card{background:linear-gradient(145deg,#ffffffee,#f6f9ffdf);box-shadow:0 20px 55px #1c4fa31a;backdrop-filter:blur(14px)}
.mailbox-card.mailbox-issued{animation:mailbox-arrival .72s cubic-bezier(.2,.8,.2,1)}
.mailbox-card.mailbox-issued .address-box{animation:address-reveal .56s .08s both cubic-bezier(.2,.8,.2,1)}
.mailbox-card.mailbox-issued .copy-button{animation:copy-pulse .5s .3s both ease-out}
@keyframes mailbox-arrival{0%{transform:translateY(4px);box-shadow:0 10px 28px #1c4fa311}55%{box-shadow:0 0 0 6px #4d83ff18,0 25px 65px #1c4fa328}100%{transform:translateY(0)}}
@keyframes address-reveal{from{opacity:.35;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes copy-pulse{0%{transform:scale(.96)}65%{transform:scale(1.04)}100%{transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.mailbox-card.mailbox-issued{animation:none}.mailbox-card.mailbox-issued .address-box,.mailbox-card.mailbox-issued .copy-button{animation:none}}
```

Also update the existing background, card, address box, primary buttons, inbox surface, and mobile rules with the same blue-violet palette. Preserve current selectors, dimensions needed by small screens, focus outlines, and all HTML structure.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test --test-concurrency=1 tests/site.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add styles.css tests/site.test.js
git commit -m "Refresh mailbox visual design and motion"
```

### Task 3: Verify the full build and deployed behavior

**Files:**
- Verify: `index.html`
- Verify: `app.js`
- Verify: `styles.css`
- Verify: `tests/*.test.js`

- [ ] **Step 1: Run the complete test suite**

Run: `node --test --test-concurrency=1 tests/*.test.js`

Expected: every test passes with zero failures.

- [ ] **Step 2: Build the static site**

Run: `node scripts/build.js`

Expected: exit code 0 and generated `dist/index.html` includes the unchanged mailbox controls and `/app.js`.

- [ ] **Step 3: Inspect the production diff**

Run: `git diff HEAD~2..HEAD --check && git status --short`

Expected: no whitespace errors and only planned files are changed or committed.

- [ ] **Step 4: Push the verified main branch**

Run: `git push origin main`

Expected: GitHub accepts the fast-forward push and Vercel begins deployment.
