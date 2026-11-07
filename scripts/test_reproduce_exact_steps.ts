import puppeteer from 'puppeteer';

async function testReproduce() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', (msg) => {
    console.log(`[BROWSER-CONSOLE] ${msg.type()}: ${msg.text()}`);
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

  // Navigate to dashboard
  const dashBtn = await page.waitForSelector('button ::-p-text(لوحة التحكم)');
  if (dashBtn) await dashBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  // Click create article
  const createBtn = await page.waitForSelector('button ::-p-text(كتابة خبر صحفي)');
  if (createBtn) await createBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  // Check initial fields
  const titleSel = '#article-title-input';
  const contentSel = '#article-content-textarea';
  const excerptSel = '#article-excerpt-textarea';
  const categorySel = '#article-category-select';

  await page.waitForSelector(titleSel, { visible: true });

  console.log('--- Step 1: Typing into Title ---');
  await page.type(titleSel, 'TITLE_TEST_98765', { delay: 30 });
  let tVal = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  console.log('Title after typing:', tVal);

  console.log('--- Step 2: Clicking into Content and typing ---');
  await page.click(contentSel);
  await new Promise((r) => setTimeout(r, 500));
  await page.type(contentSel, 'CONTENT_TEST_12345', { delay: 30 });

  tVal = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  let cVal = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
  console.log('Title after typing Content:', tVal);
  console.log('Content after typing Content:', cVal);

  console.log('--- Step 3: Clicking into Excerpt and typing ---');
  await page.click(excerptSel);
  await new Promise((r) => setTimeout(r, 500));
  await page.type(excerptSel, 'EXCERPT_TEST_67890', { delay: 30 });

  tVal = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  cVal = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
  let eVal = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  console.log('Title after typing Excerpt:', tVal);
  console.log('Content after typing Excerpt:', cVal);
  console.log('Excerpt after typing Excerpt:', eVal);

  console.log('--- Step 4: Selecting Category ---');
  await page.select(categorySel, 'اقتصاد');
  await new Promise((r) => setTimeout(r, 500));

  tVal = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  cVal = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
  eVal = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  let catVal = await page.$eval(categorySel, (el) => (el as HTMLSelectElement).value);
  console.log('All fields after Category change:');
  console.log(' - Title:', tVal);
  console.log(' - Content:', cVal);
  console.log(' - Excerpt:', eVal);
  console.log(' - Category:', catVal);

  await browser.close();
}

testReproduce().catch(console.error);
