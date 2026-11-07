import puppeteer from 'puppeteer';

async function testFocusSync() {
  console.log('--- Testing if focus sync / blur / tab wipes formData ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]')) {
      console.log('Trace:', text);
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login as journalist
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sultan.press@qu.edu.sa',
        password: 'TestPassword@2026',
      }),
    });
    const data = await res.json();
    if (data.success && data.user && data.token) {
      localStorage.setItem('qu_auth_user', JSON.stringify({ ...data.user, token: data.token }));
      localStorage.setItem('qu_auth_token', data.token);
      sessionStorage.setItem('qu_auth_token', data.token);
    }
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Open Journalist Dashboard
  const dashBtn = await page.waitForSelector('button ::-p-text(لوحة التحكم)');
  if (dashBtn) await dashBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  // Open Create Article Modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent?.includes('كتابة خبر صحفي'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const titleSel = '#article-title-input';
  const excerptSel = '#article-excerpt-textarea';
  const contentSel = '#article-content-textarea';
  const categorySel = '#article-category-select';
  const keywordsSel = '#article-keywords-input';

  await page.waitForSelector(titleSel, { visible: true });

  console.log('1. Type Title');
  await page.type(titleSel, 'عنوان تجريبي فريد للتحقق');
  console.log('Title value:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  console.log('2. Type Excerpt');
  await page.type(excerptSel, 'مقدمة تجريبية مفصلة');
  console.log('Title after Excerpt:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  console.log('3. Trigger window blur & window focus (simulating tab switch / iframe focus)...');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });

  await new Promise((r) => setTimeout(r, 1000));

  console.log('Title after window focus:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));
  console.log('Excerpt after window focus:', await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value));

  console.log('4. Click back to Title');
  await page.click(titleSel);
  await new Promise((r) => setTimeout(r, 500));
  console.log('Title after click back:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  console.log('5. Select category');
  await page.select(categorySel, 'تعليم');
  await new Promise((r) => setTimeout(r, 500));
  console.log('Title after category change:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  console.log('6. Click Excerpt again');
  await page.click(excerptSel);
  await new Promise((r) => setTimeout(r, 500));
  console.log('Title after clicking excerpt:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  console.log('7. Trigger manual /api/data sync while modal is open');
  await page.evaluate(async () => {
    // Call sync if possible or simulate context update
    const res = await fetch('/api/data');
    const data = await res.json();
    console.log('[EVAL] /api/data returned articles:', data.articles?.length);
  });

  await new Promise((r) => setTimeout(r, 1000));
  console.log('Title final check:', await page.$eval(titleSel, (el) => (el as HTMLInputElement).value));

  await browser.close();
}

testFocusSync().catch(console.error);
