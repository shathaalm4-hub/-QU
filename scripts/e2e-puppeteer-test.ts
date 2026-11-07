import puppeteer, { Browser, Page } from 'puppeteer';

interface TraceLog {
  timestamp: string;
  type: string;
  payload: any;
}

async function runE2ETest() {
  console.log('====================================================');
  console.log('STARTING REAL CHROME BROWSER E2E TEST (PUPPETEER)');
  console.log('Testing Title State Stability in Journalist Dashboard');
  console.log('====================================================\n');

  const traceLogs: TraceLog[] = [];

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
    ],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Capture all browser console logs
  page.on('console', (msg) => {
    const text = msg.text();
    console.log(`>> [BROWSER-${msg.type().toUpperCase()}]`, text);
  });

  const appUrl = 'http://localhost:3000';
  console.log(`[Step 1] Navigating to ${appUrl}...`);
  await page.goto(appUrl, { waitUntil: 'networkidle2' });

  console.log('[Step 2] Authenticating as journalist (سلطان الناصر)...');
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
      const fullUser = { ...data.user, token: data.token };
      localStorage.setItem('qu_auth_user', JSON.stringify(fullUser));
      localStorage.setItem('qu_auth_token', data.token);
      sessionStorage.setItem('qu_auth_token', data.token);
    } else {
      throw new Error('Login failed: ' + JSON.stringify(data));
    }
  });

  // Reload page to initialize session
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[Step 3] Navigating to Journalist Dashboard (لوحة التحكم)...');
  // Click on "لوحة التحكم"
  const dashboardBtn = await page.waitForSelector('button ::-p-text(لوحة التحكم)', { timeout: 5000 });
  if (dashboardBtn) {
    await dashboardBtn.click();
  } else {
    throw new Error('Could not find "لوحة التحكم" button');
  }

  await new Promise((r) => setTimeout(r, 1000));

  console.log('[Step 4] Opening "كتابة خبر صحفي" modal...');
  const createBtn = await page.waitForSelector('button ::-p-text(كتابة خبر صحفي)', { timeout: 5000 });
  if (!createBtn) throw new Error('Could not find "كتابة خبر صحفي" button');
  await createBtn.click();

  await new Promise((r) => setTimeout(r, 800));

  console.log('[Step 5] Locating Title Input and entering test title...');
  const titleInputSelector = '#article-title-input';
  await page.waitForSelector(titleInputSelector, { visible: true, timeout: 5000 });

  const testTitle = 'عنوان اختبار اختفاء العنوان 98765';
  await page.type(titleInputSelector, testTitle, { delay: 20 });

  let currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`> Title value typed into DOM input: "${currentTitleVal}"`);
  if (currentTitleVal !== testTitle) {
    throw new Error(`Title mismatch after typing: expected "${testTitle}", got "${currentTitleVal}"`);
  }

  console.log('[Step 6] Navigating to Body Content and typing article content...');
  const contentSelector = '#article-content-textarea';
  await page.waitForSelector(contentSelector, { visible: true, timeout: 5000 });
  await page.type(contentSelector, 'نص الخبر التجريبي لتأكيد عدم حدوث تصفير للعنوان أثناء التحرير والمزامنة الخلفية.', { delay: 10 });

  console.log('[Step 7] Waiting for background sync (/api/data) cycles and triggering visibility/focus events...');
  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`> Polling cycle #${cycle}: triggering tab focus & visibility change...`);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    // Also trigger direct /api/data fetch to simulate background network completion
    await page.evaluate(async () => {
      try {
        await fetch('/api/data');
      } catch {}
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify title is still intact after each cycle
    currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
    console.log(`> Title check after cycle #${cycle}: "${currentTitleVal}"`);
    if (currentTitleVal !== testTitle) {
      throw new Error(`CRITICAL: Title disappeared during polling cycle #${cycle}! Value: "${currentTitleVal}"`);
    }
  }

  console.log('[Step 8] Switching Category dropdown to "اقتصاد"...');
  const categorySelector = '#article-category-select';
  await page.waitForSelector(categorySelector, { timeout: 3000 });
  await page.select(categorySelector, 'اقتصاد');

  currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`> Title after category change: "${currentTitleVal}"`);

  console.log('[Step 9] Modifying Keywords input field...');
  const keywordsSelector = '#article-keywords-input';
  await page.waitForSelector(keywordsSelector, { timeout: 3000 });
  await page.type(keywordsSelector, 'إعلام، جامعة القصيم، صحافة رقمية', { delay: 10 });

  currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`> Title after keywords input: "${currentTitleVal}"`);

  console.log('[Step 10] Selecting Photo Preset ("الحرم الجامعي")...');
  const photoPresetBtn = await page.waitForSelector('button ::-p-text(الحرم الجامعي)', { timeout: 3000 });
  if (photoPresetBtn) {
    await photoPresetBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`> Title after photo preset: "${currentTitleVal}"`);

  console.log('[Step 11] Returning focus back to Title Input field...');
  await page.focus(titleInputSelector);
  await new Promise((r) => setTimeout(r, 500));

  currentTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`\n====================================================`);
  console.log(`FINAL TITLE FIELD VALUE IN BROWSER DOM: "${currentTitleVal}"`);
  console.log(`====================================================\n`);

  if (currentTitleVal !== testTitle) {
    throw new Error(`VERIFICATION FAILED: Title was wiped or altered! Expected "${testTitle}", got "${currentTitleVal}"`);
  }

  console.log('[Step 12] Extracting [TITLE-TRACE] logs from window.__TITLE_TRACE_LOGS in browser...');
  const browserLogs = await page.evaluate(() => {
    return (window as any).__TITLE_TRACE_LOGS || [];
  });

  console.log(`\nFound ${browserLogs.length} trace events in browser memory:`);
  browserLogs.forEach((log: any, i: number) => {
    console.log(`  [${i + 1}] [${log.type}] ${JSON.stringify(log.payload)}`);
  });

  // Verify that instanceId was never remounted during editing
  const titleSetEvents = browserLogs.filter((l: any) => l.type === 'TITLE_SET');
  console.log(`\nTotal TITLE_SET events: ${titleSetEvents.length}`);
  const wipedTitleEvents = titleSetEvents.filter((l: any) => l.payload.from === testTitle && l.payload.to === '');
  if (wipedTitleEvents.length > 0) {
    throw new Error(`CRITICAL: Detected TITLE_SET event wiping title! ${JSON.stringify(wipedTitleEvents)}`);
  } else {
    console.log('✓ PASS: Zero title wiping events occurred.');
  }

  console.log('[Step 13] Saving article as Draft ("حفظ كمسودة")...');
  const draftBtn = await page.waitForSelector('button ::-p-text(حفظ كمسودة)', { timeout: 5000 });
  if (!draftBtn) throw new Error('Could not find "حفظ كمسودة" button');
  await draftBtn.click();

  // Wait for draft to save and modal to close
  await new Promise((r) => setTimeout(r, 2000));

  console.log('[Step 14] Verifying modal closed and finding saved draft in Dashboard...');
  const modalClosed = await page.$eval('#article-title-input', () => false).catch(() => true);
  console.log(`> Modal is closed: ${modalClosed}`);
  if (!modalClosed) throw new Error('Modal failed to close after saving draft');

  console.log('[Step 15] Reopening the saved draft by clicking "تعديل"...');
  // Wait for articles table to reflect the draft
  await page.waitForSelector('button[title="تعديل المادة"]', { timeout: 8000 });
  const editArticleButtons = await page.$$('button[title="تعديل المادة"]');
  console.log(`> Found ${editArticleButtons.length} edit article buttons in dashboard.`);
  if (editArticleButtons.length === 0) throw new Error('No edit article button found for saved draft');

  await editArticleButtons[0].click();
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[Step 16] Checking Title in Reopened Draft Modal...');
  await page.waitForSelector(titleInputSelector, { visible: true, timeout: 5000 });
  const reopenedTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`\n====================================================`);
  console.log(`REOPENED DRAFT TITLE IN BROWSER DOM: "${reopenedTitleVal}"`);
  console.log(`====================================================\n`);

  if (reopenedTitleVal !== testTitle) {
    throw new Error(`DRAFT REOPEN FAILED: Expected "${testTitle}", got "${reopenedTitleVal}"`);
  }
  console.log('✓ PASS: Reopened draft contains the exact saved title!');

  console.log('[Step 17] Testing modal cancel & re-opening clean new article...');
  const cancelBtn = await page.waitForSelector('button ::-p-text(إلغاء)', { timeout: 3000 });
  if (cancelBtn) await cancelBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  // Click "كتابة خبر صحفي" again
  const newCreateBtn = await page.waitForSelector('button ::-p-text(كتابة خبر صحفي)', { timeout: 5000 });
  if (newCreateBtn) await newCreateBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  await page.waitForSelector(titleInputSelector, { visible: true, timeout: 5000 });
  const freshTitleVal = await page.$eval(titleInputSelector, (el) => (el as HTMLInputElement).value);
  console.log(`> Clean new article title value: "${freshTitleVal}" (Expected empty string)`);
  if (freshTitleVal !== '') {
    throw new Error(`CLEAN NEW ARTICLE FAILED: Expected empty string, got "${freshTitleVal}"`);
  }
  console.log('✓ PASS: Fresh article modal opened clean and empty without stale state!');

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
  process.exit(0);
}

runE2ETest().catch((err) => {
  console.error('\n*** TEST FAILED WITH ERROR ***\n', err);
  process.exit(1);
});
