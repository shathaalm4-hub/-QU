import puppeteer, { Browser, Page } from 'puppeteer';

async function runLiveProductionTest() {
  console.log('================================================================');
  console.log('STARTING DIRECT LIVE PRODUCTION TESTING ON CLOUD RUN');
  console.log('URL: https://ais-pre-qz4q4icz5k67sfkwrsgqli-542247905796.europe-west3.run.app');
  console.log('================================================================\n');

  const liveUrl = 'https://ais-pre-qz4q4icz5k67sfkwrsgqli-542247905796.europe-west3.run.app';

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });
  await page.setCacheEnabled(false);

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]') || text.includes('FIELD_CHANGE') || text.includes('MODAL')) {
      console.log(`  [LIVE-BROWSER-TRACE] ${text}`);
    }
  });

  try {
    // 1. Inspect loaded scripts on live production
    console.log('[Step 1] Loading live production URL...');
    await page.goto(liveUrl + '/?_audit=' + Date.now(), { waitUntil: 'networkidle2', timeout: 45000 });

    const scripts = await page.$$eval('script[src]', (ss) => ss.map((s) => (s as HTMLScriptElement).src));
    console.log('Live Production Script Tags:', scripts);

    const activeBundleUrl = scripts.find((s) => s.includes('/assets/index-')) || '';
    const activeBundleName = activeBundleUrl.split('/').pop() || '';
    console.log(`Active Bundle Name: ${activeBundleName}`);

    // Verify active bundle contains formData architecture
    const bundleCheck = await page.evaluate(async (url) => {
      const res = await fetch(url);
      const text = await res.text();
      return {
        status: res.status,
        hasFormData: text.includes('formData') || text.includes('updateFormField') || text.includes('article-keywords-input'),
        hasKeywordsInput: text.includes('article-keywords-input'),
        size: text.length,
      };
    }, activeBundleUrl);
    console.log('Active Bundle Code Verification:', bundleCheck);

    // 2. Login as Journalist on Live Production
    console.log('\n[Step 2] Authenticating as Journalist (سلطان الناصر) on Live Production...');
    const loginResult = await page.evaluate(async () => {
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
        return { success: true, token: data.token };
      }
      return { success: false, message: data.message };
    });

    if (!loginResult.success) throw new Error('Live login failed: ' + loginResult.message);
    console.log('Live Authentication: Success');

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Open Journalist Dashboard on Live Production
    console.log('\n[Step 3] Navigating to Journalist Dashboard...');
    const dashBtn = await page.waitForSelector('button ::-p-text(لوحة التحكم)', { timeout: 8000 });
    if (!dashBtn) throw new Error('Dashboard button not found on live page');
    await dashBtn.click();
    await new Promise((r) => setTimeout(r, 1200));

    // 4. Open Create Article Modal
    console.log('\n[Step 4] Opening "كتابة خبر صحفي" on Live Production...');
    const createBtn = await page.waitForSelector('button ::-p-text(كتابة خبر صحفي)', { timeout: 8000 });
    if (!createBtn) throw new Error('Create article button not found');
    await createBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    const titleSel = '#article-title-input';
    const excerptSel = '#article-excerpt-textarea';
    const contentSel = '#article-content-textarea';
    const categorySel = '#article-category-select';
    const keywordsSel = '#article-keywords-input';

    await page.waitForSelector(titleSel, { visible: true, timeout: 6000 });
    await page.waitForSelector(excerptSel, { visible: true, timeout: 6000 });
    await page.waitForSelector(contentSel, { visible: true, timeout: 6000 });
    await page.waitForSelector(categorySel, { visible: true, timeout: 6000 });
    await page.waitForSelector(keywordsSel, { visible: true, timeout: 6000 });

    // 5. Enter All Field Values WITHOUT SAVING
    console.log('\n[Step 5] Entering values across all fields on Live Production WITHOUT saving...');
    const TEST_TITLE = 'TITLE_LIVE_TEST_123';
    const TEST_EXCERPT = 'EXCERPT_LIVE_TEST_456';
    const TEST_CONTENT = 'CONTENT_LIVE_TEST_789';
    const TEST_KEYWORDS = 'KEYWORDS_LIVE_TEST_999';

    console.log('  -> Typing Title...');
    await page.type(titleSel, TEST_TITLE, { delay: 25 });

    console.log('  -> Moving to Excerpt and typing...');
    await page.click(excerptSel);
    await page.type(excerptSel, TEST_EXCERPT, { delay: 25 });

    console.log('  -> Moving to Details/Content and typing...');
    await page.click(contentSel);
    await page.type(contentSel, TEST_CONTENT, { delay: 25 });

    console.log('  -> Moving to Keywords and typing...');
    await page.click(keywordsSel);
    await page.type(keywordsSel, TEST_KEYWORDS, { delay: 25 });

    // 6. Navigation Transitions Without Saving
    console.log('\n[Step 6] Rapid navigation transitions between fields on Live Production...');
    const fieldOrder = [
      { name: 'Title', sel: titleSel },
      { name: 'Excerpt', sel: excerptSel },
      { name: 'Content', sel: contentSel },
      { name: 'Category', sel: categorySel },
      { name: 'Keywords', sel: keywordsSel },
      { name: 'Title', sel: titleSel },
      { name: 'Content', sel: contentSel },
      { name: 'Excerpt', sel: excerptSel },
    ];

    for (const step of fieldOrder) {
      await page.focus(step.sel);
      await new Promise((r) => setTimeout(r, 150));
    }

    const checkLiveValues = async (phaseName: string) => {
      const vals = await page.evaluate(
        (tS, eS, cS, kS, catS) => {
          return {
            title: (document.querySelector(tS) as HTMLInputElement)?.value || '',
            excerpt: (document.querySelector(eS) as HTMLTextAreaElement)?.value || '',
            content: (document.querySelector(cS) as HTMLTextAreaElement)?.value || '',
            keywords: (document.querySelector(kS) as HTMLInputElement)?.value || '',
            category: (document.querySelector(catS) as HTMLSelectElement)?.value || '',
          };
        },
        titleSel,
        excerptSel,
        contentSel,
        keywordsSel,
        categorySel
      );
      console.log(`  [Live DOM Check: ${phaseName}]:`, vals);
      if (vals.title !== TEST_TITLE) throw new Error(`Live Title lost! Expected "${TEST_TITLE}", got "${vals.title}"`);
      if (vals.excerpt !== TEST_EXCERPT) throw new Error(`Live Excerpt lost! Expected "${TEST_EXCERPT}", got "${vals.excerpt}"`);
      if (vals.content !== TEST_CONTENT) throw new Error(`Live Content lost! Expected "${TEST_CONTENT}", got "${vals.content}"`);
      if (vals.keywords !== TEST_KEYWORDS) throw new Error(`Live Keywords lost! Expected "${TEST_KEYWORDS}", got "${vals.keywords}"`);
      return vals;
    };

    await checkLiveValues('After Field Transitions');
    console.log('✓ PASS: All field values intact after full navigation transitions!');

    // 7. Background /api/data sync while editing & category change
    console.log('\n[Step 7] Testing background /api/data sync cycles & category change on Live Production...');
    await page.select(categorySel, 'اقتصاد');

    for (let c = 1; c <= 4; c++) {
      console.log(`  Live background sync cycle #${c}...`);
      await page.evaluate(async () => {
        try {
          await fetch('/api/data', {
            headers: { Authorization: `Bearer ${localStorage.getItem('qu_auth_token')}` },
          });
        } catch {}
      });
      await new Promise((r) => setTimeout(r, 800));
    }

    await checkLiveValues('After 4 Sync Cycles & Category Change');
    console.log('✓ PASS: All fields 100% retained after background sync cycles!');

    // Close modal without saving so production DB stays pristine
    console.log('\n[Step 8] Closing modal without saving...');
    await page.click('#btn-cancel-modal');
    await new Promise((r) => setTimeout(r, 800));

    console.log('\n================================================================');
    console.log('ALL LIVE PRODUCTION CHECKS ON CLOUD RUN PASSED 100%!');
    console.log('Active Bundle Name:', activeBundleName);
    console.log('Field Transitions (No-Save): PASS');
    console.log('Background Sync Immunity: PASS');
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runLiveProductionTest().catch((err) => {
  console.error('\n*** LIVE AUDIT FAILED ***\n', err);
  process.exit(1);
});
