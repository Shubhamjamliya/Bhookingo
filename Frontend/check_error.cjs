const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // Set a valid-looking dummy token to bypass the initial check
  await page.goto('http://localhost:5173');
  await page.evaluate(() => {
    const b64 = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, role: 'admin' }));
    const token = 'header.' + b64 + '.signature';
    localStorage.setItem('admin_accessToken', token);
  });

  console.log('Navigating to categories...');
  await page.goto('http://localhost:5173/admin/food/categories', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
