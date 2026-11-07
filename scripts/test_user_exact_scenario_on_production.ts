import puppeteer, { Browser, Page } from 'puppeteer';

const PRODUCTION_URL = 'https://ais-pre-qz4q4icz5k67sfkwrsgqli-542247905796.europe-west3.run.app';

interface TransitionLog {
  step: string;
  focusedField: string;
  values: {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    keywords: string;
  };
  passed: boolean;
  notes?: string;
}

async function runExactUserScenario() {
  console.log('================================================================');
  console.log('🧪 EXACT USER SCENARIO TEST ON LIVE PRODUCTION');
  console.log(`URL: ${PRODUCTION_URL}`);
  console.log('================================================================\n');

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const traceEvents: any[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]') || text.includes('MODAL_') || text.includes('SYNC_') || text.includes('ARTICLE_')) {
      traceEvents.push({ time: Date.now(), text });
      console.log(`  [BROWSER-TRACE] ${text}`);
    }
  });

  try {
    // 1. Navigate to live production
    console.log('[Phase 1] Navigating to Live Production...');
    await page.goto(`${PRODUCTION_URL}/?_t=${Date.now()}`, { waitUntil: 'networkidle2', timeout: 35000 });

    // 2. Authenticate as Journalist Sultan
    console.log('[Phase 2] Authenticating as Journalist Sultan...');
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
        return { success: true };
      }
      return { success: false, message: data.message };
    });

    if (!loginResult.success) {
      throw new Error(`Login failed on live production: ${loginResult.message}`);
    }
    console.log('  -> Authenticated successfully.');

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Open Create Article Modal
    console.log('\n[Phase 3] Opening Create Article Modal (إنشاء خبر جديد)...');
    
    // Check if we can open it via Header or Dashboard
    const opened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Look for dashboard or create article button
      const createBtn = buttons.find((b) => b.textContent && b.textContent.includes('كتابة خبر صحفي'));
      if (createBtn) {
        (createBtn as HTMLElement).click();
        return true;
      }
      // If on home, go to journalist dashboard first
      const dashBtn = buttons.find((b) => b.textContent && b.textContent.includes('لوحة التحكم'));
      if (dashBtn) {
        (dashBtn as HTMLElement).click();
        return 'clicked_dash';
      }
      return false;
    });

    if (opened === 'clicked_dash') {
      await new Promise((r) => setTimeout(r, 1200));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find((b) => b.textContent && b.textContent.includes('كتابة خبر صحفي'));
        if (createBtn) (createBtn as HTMLElement).click();
      });
    }

    await page.waitForSelector('#article-form-modal', { timeout: 8000 });
    console.log('  -> Modal #article-form-modal is now open and visible in DOM.');

    const titleSel = '#article-title-input';
    const excerptSel = '#article-excerpt-textarea';
    const contentSel = '#article-content-textarea';
    const categorySel = '#article-category-select';
    const keywordsSel = '#article-keywords-input';

    await page.waitForSelector(titleSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(excerptSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(contentSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(categorySel, { visible: true, timeout: 5000 });
    await page.waitForSelector(keywordsSel, { visible: true, timeout: 5000 });

    const readFormValues = async () => {
      return page.evaluate((tS, eS, cS, catS, kS) => {
        return {
          title: (document.querySelector(tS) as HTMLInputElement)?.value || '',
          excerpt: (document.querySelector(eS) as HTMLTextAreaElement)?.value || '',
          content: (document.querySelector(cS) as HTMLTextAreaElement)?.value || '',
          category: (document.querySelector(catS) as HTMLSelectElement)?.value || '',
          keywords: (document.querySelector(kS) as HTMLInputElement)?.value || '',
        };
      }, titleSel, excerptSel, contentSel, categorySel, keywordsSel);
    };

    const TARGET_TITLE = '«عنوان فريد ومميز جداً لاختبار الثبات: رقم ' + Date.now() + '»';
    const TARGET_EXCERPT = 'مقدمة إخبارية مركزة ومفصلة تبين أهداف التغطية الإعلامية بقسم الإعلام والاتصال بجامعة القصيم.';
    const TARGET_CONTENT = `متن الخبر الصحفي الموسع:\n\nفي إطار متابعة الفعاليات الأكاديمية والأنشطة الطلابية، نظمت كلية اللغة العربية والدراسات الاجتماعية بجامعة القصيم ممثلة بقسم الإعلام والاتصال ورشة عمل تطبيقية حول مهارات التغطية الصحفية الميدانية وصناعة المحتوى الرقمي المتزن.\n\nوشارك في الملتقى نخبة من الأساتذة والخبراء والممارسين الإعلاميين الذين أشادوا بمستوى التفاعل المهني لدى الطلاب والطالبات، مؤكدين أن الالتزام بأخلاقيات المهنة والدقة في نقل الحقائق هما الركيزة الأساسية للصحافة الرصينة.\n\nواختتمت الفعالية بعدد من التوصيات التي تهدف إلى تعزيز المحتوى الأكاديمي الرقمي وإبراز منجزات الجامعة في مختلف المحافل الإقليمية والدولية.`;
    const TARGET_KEYWORDS = 'جامعة القصيم، صحافة، إعلام، تدقيق، اختبار الثبات، توثيق';

    const historyLogs: TransitionLog[] = [];

    // STEP 2: Write highly distinctive Title
    console.log('\n--- Step 2: Typing Distinctive Title ---');
    await page.click(titleSel);
    await page.type(titleSel, TARGET_TITLE, { delay: 10 });
    let currentVals = await readFormValues();
    console.log(`Title written: "${currentVals.title}"`);
    historyLogs.push({
      step: 'Step 2: Type Title',
      focusedField: 'title',
      values: { ...currentVals },
      passed: currentVals.title === TARGET_TITLE,
    });

    // STEP 4: Navigate to Excerpt and type
    console.log('\n--- Step 4: Move to Excerpt and Type ---');
    await page.click(excerptSel);
    await page.type(excerptSel, TARGET_EXCERPT, { delay: 8 });
    currentVals = await readFormValues();
    console.log(`Excerpt written: "${currentVals.excerpt.substring(0, 40)}..."`);
    console.log(`Title verification: "${currentVals.title}"`);
    const titlePreservedAtStep4 = currentVals.title === TARGET_TITLE;
    historyLogs.push({
      step: 'Step 4: Type Excerpt',
      focusedField: 'excerpt',
      values: { ...currentVals },
      passed: titlePreservedAtStep4 && currentVals.excerpt === TARGET_EXCERPT,
      notes: titlePreservedAtStep4 ? 'Title preserved' : 'FAIL: Title lost when typing excerpt!',
    });
    if (!titlePreservedAtStep4) {
      console.error('❌ BUG DETECTED AT STEP 4: Title was lost or replaced!');
    }

    // STEP 5: Navigate to Content and type long text
    console.log('\n--- Step 5: Move to Content and Type Long Text ---');
    await page.click(contentSel);
    await page.type(contentSel, TARGET_CONTENT, { delay: 5 });
    currentVals = await readFormValues();
    console.log(`Content length: ${currentVals.content.length} chars`);
    const preservedAtStep5 = currentVals.title === TARGET_TITLE && currentVals.excerpt === TARGET_EXCERPT;
    historyLogs.push({
      step: 'Step 5: Type Content',
      focusedField: 'content',
      values: { ...currentVals },
      passed: preservedAtStep5 && currentVals.content === TARGET_CONTENT,
      notes: preservedAtStep5 ? 'All previous values preserved' : 'FAIL: Values lost!',
    });
    if (!preservedAtStep5) {
      console.error('❌ BUG DETECTED AT STEP 5: Values lost when typing content!');
    }

    // STEP 6: Navigate to Keywords and type
    console.log('\n--- Step 6: Move to Keywords and Type ---');
    await page.click(keywordsSel);
    await page.type(keywordsSel, TARGET_KEYWORDS, { delay: 8 });
    currentVals = await readFormValues();
    const preservedAtStep6 =
      currentVals.title === TARGET_TITLE &&
      currentVals.excerpt === TARGET_EXCERPT &&
      currentVals.content === TARGET_CONTENT &&
      currentVals.keywords === TARGET_KEYWORDS;
    historyLogs.push({
      step: 'Step 6: Type Keywords',
      focusedField: 'keywords',
      values: { ...currentVals },
      passed: preservedAtStep6,
      notes: preservedAtStep6 ? 'All previous values preserved' : 'FAIL: Values lost!',
    });
    if (!preservedAtStep6) {
      console.error('❌ BUG DETECTED AT STEP 6: Values lost when typing keywords!');
    }

    // STEP 7: Change Category
    console.log('\n--- Step 7: Change Category ---');
    const availableCategories = await page.$$eval(`${categorySel} option`, (opts) =>
      opts.map((o) => (o as HTMLOptionElement).value)
    );
    console.log('Available categories in select:', availableCategories);
    const newCategory = availableCategories.find((c) => c !== currentVals.category) || availableCategories[1] || 'اقتصاد';
    console.log(`Switching category from "${currentVals.category}" to "${newCategory}"...`);
    await page.select(categorySel, newCategory);
    await new Promise((r) => setTimeout(r, 400));
    currentVals = await readFormValues();
    const preservedAtStep7 =
      currentVals.title === TARGET_TITLE &&
      currentVals.excerpt === TARGET_EXCERPT &&
      currentVals.content === TARGET_CONTENT &&
      currentVals.keywords === TARGET_KEYWORDS &&
      currentVals.category === newCategory;
    historyLogs.push({
      step: 'Step 7: Change Category',
      focusedField: 'category',
      values: { ...currentVals },
      passed: preservedAtStep7,
      notes: preservedAtStep7 ? 'All previous values preserved across category change' : 'FAIL: Category change wiped data!',
    });
    if (!preservedAtStep7) {
      console.error('❌ BUG DETECTED AT STEP 7: Data wiped upon category change!');
    }

    // STEP 8: Return to Title
    console.log('\n--- Step 8: Return to Title ---');
    await page.click(titleSel);
    await new Promise((r) => setTimeout(r, 300));
    currentVals = await readFormValues();
    const preservedAtStep8 = currentVals.title === TARGET_TITLE;
    historyLogs.push({
      step: 'Step 8: Return to Title',
      focusedField: 'title',
      values: { ...currentVals },
      passed: preservedAtStep8,
      notes: preservedAtStep8 ? 'Title intact upon return' : 'FAIL: Title altered!',
    });

    // STEP 9: Return to Excerpt
    console.log('\n--- Step 9: Return to Excerpt ---');
    await page.click(excerptSel);
    await new Promise((r) => setTimeout(r, 300));
    currentVals = await readFormValues();
    const preservedAtStep9 = currentVals.excerpt === TARGET_EXCERPT;
    historyLogs.push({
      step: 'Step 9: Return to Excerpt',
      focusedField: 'excerpt',
      values: { ...currentVals },
      passed: preservedAtStep9,
      notes: preservedAtStep9 ? 'Excerpt intact upon return' : 'FAIL: Excerpt altered!',
    });

    // STEP 10: Return to Content
    console.log('\n--- Step 10: Return to Content ---');
    await page.click(contentSel);
    await new Promise((r) => setTimeout(r, 300));
    currentVals = await readFormValues();
    const preservedAtStep10 = currentVals.content === TARGET_CONTENT;
    historyLogs.push({
      step: 'Step 10: Return to Content',
      focusedField: 'content',
      values: { ...currentVals },
      passed: preservedAtStep10,
      notes: preservedAtStep10 ? 'Content intact upon return' : 'FAIL: Content altered!',
    });

    // STEP 11: Repeat rapid navigation between all fields multiple times
    console.log('\n--- Step 11: Rapid Repeat Navigation (10 cycles) ---');
    const fieldSequence = [
      { name: 'Title', sel: titleSel, expected: () => TARGET_TITLE, key: 'title' as const },
      { name: 'Content', sel: contentSel, expected: () => TARGET_CONTENT, key: 'content' as const },
      { name: 'Excerpt', sel: excerptSel, expected: () => TARGET_EXCERPT, key: 'excerpt' as const },
      { name: 'Keywords', sel: keywordsSel, expected: () => TARGET_KEYWORDS, key: 'keywords' as const },
      { name: 'Category', sel: categorySel, expected: () => newCategory, key: 'category' as const },
    ];

    let loopFailures = 0;
    for (let cycle = 1; cycle <= 10; cycle++) {
      for (const f of fieldSequence) {
        await page.focus(f.sel);
        await new Promise((r) => setTimeout(r, 100));
        const check = await readFormValues();
        const matches = check[f.key] === f.expected();
        if (!matches) {
          loopFailures++;
          console.error(`  ❌ Cycle ${cycle} Focus on ${f.name} FAILED! Current: "${check[f.key]?.substring(0, 30)}...", Expected: "${f.expected()?.substring(0, 30)}..."`);
        }
      }
    }
    console.log(`Repeat navigation completed. Failures across all cycles: ${loopFailures}`);

    // STEP 12: Wait 65s for potential background sync/polling and verify again
    console.log('\n--- Testing Background Sync Resilience (Waiting 65 seconds) ---');
    console.log('Testing whether 60s background syncWithServer affects in-flight form data...');
    await new Promise((r) => setTimeout(r, 65000));

    const finalVals = await readFormValues();
    const finalCheck =
      finalVals.title === TARGET_TITLE &&
      finalVals.excerpt === TARGET_EXCERPT &&
      finalVals.content === TARGET_CONTENT &&
      finalVals.keywords === TARGET_KEYWORDS &&
      finalVals.category === newCategory;

    console.log('\n================================================================');
    console.log('📊 FINAL RESULTS SUMMARY:');
    console.log(` - Title: "${finalVals.title}" (matches: ${finalVals.title === TARGET_TITLE ? '✅ PASS' : '❌ FAIL'})`);
    console.log(` - Excerpt: "${finalVals.excerpt.substring(0, 35)}..." (matches: ${finalVals.excerpt === TARGET_EXCERPT ? '✅ PASS' : '❌ FAIL'})`);
    console.log(` - Content length: ${finalVals.content.length} chars (matches: ${finalVals.content === TARGET_CONTENT ? '✅ PASS' : '❌ FAIL'})`);
    console.log(` - Keywords: "${finalVals.keywords}" (matches: ${finalVals.keywords === TARGET_KEYWORDS ? '✅ PASS' : '❌ FAIL'})`);
    console.log(` - Category: "${finalVals.category}" (matches: ${finalVals.category === newCategory ? '✅ PASS' : '❌ FAIL'})`);
    console.log(` - Loop transitions failure count: ${loopFailures}`);
    console.log(` - Total Browser Trace events captured: ${traceEvents.length}`);
    console.log(` - OVERALL STATUS: ${finalCheck && loopFailures === 0 ? '🏆 100% SUCCESS - ZERO DATA LOSS' : '❌ DATA LOSS DETECTED'}`);
    console.log('================================================================');

    if (!finalCheck || loopFailures > 0) {
      throw new Error('Data loss detected during transitions or background sync!');
    }
  } finally {
    await browser.close();
  }
}

runExactUserScenario().catch((err) => {
  console.error('\n💥 Test run failed with error:', err);
  process.exit(1);
});
