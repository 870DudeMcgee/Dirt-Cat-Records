// Read-only browser smoke test for every indexable page; never submits forms.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/index.html') { res.writeHead(308, {Location: '/'}); res.end(); return; }
    const file = path.join(root, name === '/' ? 'index.html' : name);
    const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css'}[path.extname(file)];
    if (type) res.setHeader('Content-Type', type);
    fs.readFile(file, (error, data) => {res.statusCode = error ? 404 : 200; res.end(error ? 'Not found' : data);});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    const urls = [...fs.readFileSync(path.join(root, 'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
    for (const width of [390, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 1000}});
      await page.route('https://**', route => route.abort());
      for (const url of urls) {
        await page.goto(`http://127.0.0.1:${server.address().port}${url}`, {waitUntil:'domcontentloaded'});
        await page.locator('h1').waitFor({state:'visible'});
        assert(await page.locator('h1').isVisible(), `${url}: H1 hidden at ${width}`);
        assert.equal(await page.locator('a[href^="index.html"]').count(), 0);
        console.log(`RENDER ${width}px ${url}: visible H1 and canonical home links`);
      }
      await page.goto(`http://127.0.0.1:${server.address().port}/studio-tools.html`);
      for (const card of await page.locator('.studio-tool-card').all()) {
        assert(await card.locator('a').isVisible());
        assert(await card.locator('span').isVisible());
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert(!overflow, `Tool catalog overflows at ${width}px`);
      await page.screenshot({path:`/tmp/dirt-tools-${width}.png`,fullPage:true});
      await page.close();
    }
    console.log('PASS: 14 rendered public page/viewport checks; catalog links and copy visible on mobile and desktop.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode=1;});
