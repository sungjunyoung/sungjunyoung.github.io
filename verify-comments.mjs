import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

const reqs = [];
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('utteranc') || u.includes('api.github.com')) reqs.push(`${r.status()} ${u.slice(0, 130)}`);
});

await page.goto('https://blog.sungjunyoung.dev/posts/how-goroutine-works/', { waitUntil: 'load', timeout: 60000 });
await page.locator('.comments iframe').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(8000);

const frame = await page.locator('.comments iframe').first().contentFrame();
const dump = await frame.locator('body').innerHTML();
console.log('  --- iframe body (앞부분) ---');
console.log('  ' + dump.replace(/\s+/g, ' ').slice(0, 700));
console.log('\n  --- iframe 텍스트 ---');
console.log('  ' + (await frame.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
console.log('\n  --- 네트워크 (utterances / github api) ---');
for (const r of reqs) console.log('  ' + r);
await browser.close();
