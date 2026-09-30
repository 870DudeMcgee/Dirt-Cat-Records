const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['index', 'checkout', 'success', 'portal', 'support', 'admin', 'studio-tools', 'brick-lane-lab', 'drum-alignment', 'logic-auto-bounce'];

test('every canonical page loads the shared visual layer after its existing styles', () => {
  for (const page of pages) {
    const styles = [...read(`${page}.html`).matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(styles.includes('dark-theme.css'), page);
    assert.ok(styles.indexOf('dark-theme.css') > styles.findIndex((href) => href.startsWith('style.css')), page);
    assert.ok(styles.indexOf('dark-theme.css') > styles.findIndex((href) => href.startsWith('logic-auto-bounce.css')), page);
  }
});

test('homepage retains the real listening, review and navigation contracts', () => {
  const html = read('index.html');
  for (const id of ['services', 'process', 'listen', 'mix-review', 'fat-footer', 'mix-review-form', 'mix-review-status', 'listen-audio', 'listen-prev', 'listen-next', 'listen-dots', 'listen-art', 'listen-title', 'listen-note', 'main-logo']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
  }
  for (const name of ['name', 'email', 'message', 'artistName', 'projectTitle', 'trackLink', 'website']) assert.ok(html.includes(`name="${name}"`), name);
  for (const href of ['#services', '#process', '#listen', '#mix-review', '#fat-footer', 'checkout.html', 'portal.html', 'support.html', 'studio-tools.html']) assert.ok(html.includes(`href="${href}"`), href);
  for (const file of ['Digital Dream .wav', 'SlowSwing.wav', 'Smells Like June.wav']) assert.ok(fs.existsSync(path.join(root, 'assets', file)), file);
  assert.ok(html.includes('https://open.spotify.com/embed/album/65v4pja00fzvRKV3hLaQMh'));
  assert.ok(html.includes('data-static-heading'));
  assert.ok(read('spells.js').includes("heroHeading && !heroHeading.hasAttribute('data-static-heading')"));
  assert.ok(read('spells.js').includes("fetch('/api/public/free-review'"));
  assert.ok(html.includes('$149 Starter Mix') && html.includes('$99 First Song Intro'));
});
