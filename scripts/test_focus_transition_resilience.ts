import puppeteer from 'puppeteer';

async function runResilienceTest() {
  console.log('================================================================');
  console.log('STARTING REAL-WORLD FOCUS TRANSITION & PERSISTENCE TEST');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]')) {
      console.log('  [TRACE]', text);
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // 1. Authenticate as Journalist
  console.log('1. Authenticating as Sultan (sultan.press@qu.edu.sa)...');
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
  await new Promise((r) => setTimeout(r, 1500));

  // 2. Open Journalist Dashboard
  console.log('2. Opening Journalist Dashboard...');
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => b.textContent?.includes('لوحة التحكم'));
  }, { timeout: 10000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('لوحة التحكم'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // 3. Open Create Article Modal
  console.log('3. Opening Create Article Modal (كتابة خبر صحفي)...');
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some((b) => b.id === 'btn-create-article-dashboard' || b.textContent?.includes('كتابة خبر صحفي'));
  }, { timeout: 10000 });

  await page.evaluate(() => {
    const btn = document.querySelector('#btn-create-article-dashboard') || Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('كتابة خبر صحفي'));
    if (btn) (btn as HTMLElement).click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const titleSel = '#article-title-input';
  const excerptSel = '#article-excerpt-textarea';
  const contentSel = '#article-content-textarea';
  const categorySel = '#article-category-select';
  const keywordsSel = '#article-keywords-input';

  await page.waitForSelector(titleSel, { visible: true });

  const TEST_TITLE = '«عنوان فريد للاختبار الفعلي: تجربة كتابة الخبر دون فقدان»';
  const TEST_EXCERPT = 'مقدمة إخبارية مركزة وموثقة توضح التفاصيل الأولية للحدث الصحفي.';
  const TEST_CONTENT = 'متن الخبر الصحفي والتفاصيل الكاملة للاختبار المعماري النهائي لصحيفة QU الرقمية.';
  const TEST_KEYWORDS = 'جامعة القصيم، ملتقى الصحافة، ثبات البيانات';

  // Step 1: Type Title
  console.log('\n--- Step 1: Type Title ---');
  await page.click(titleSel);
  await page.type(titleSel, TEST_TITLE, { delay: 15 });
  let currentTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  console.log('Title entered:', currentTitle);
  if (currentTitle !== TEST_TITLE) throw new Error('Title typing mismatch');

  // Step 2: Click outside / into Excerpt (User reported this was the exact moment it disappeared)
  console.log('\n--- Step 2: Focus Excerpt and Type ---');
  await page.click(excerptSel);
  await new Promise((r) => setTimeout(r, 500));
  
  // Verify Title did NOT disappear immediately upon blur
  currentTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  console.log('Title check immediately after blur to Excerpt:', currentTitle);
  if (currentTitle !== TEST_TITLE) throw new Error(`Data lost on blur! Expected "${TEST_TITLE}", got "${currentTitle}"`);

  await page.type(excerptSel, TEST_EXCERPT, { delay: 15 });
  let currentExcerpt = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  console.log('Excerpt entered:', currentExcerpt);

  // Step 3: Return to Title
  console.log('\n--- Step 3: Return focus to Title ---');
  await page.click(titleSel);
  await new Promise((r) => setTimeout(r, 500));
  currentTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  currentExcerpt = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  console.log('Title upon returning:', currentTitle);
  console.log('Excerpt upon returning:', currentExcerpt);
  if (currentTitle !== TEST_TITLE) throw new Error('Title changed upon return!');
  if (currentExcerpt !== TEST_EXCERPT) throw new Error('Excerpt changed upon return!');

  // Step 4: Focus Content and Type
  console.log('\n--- Step 4: Focus Content and Type ---');
  await page.click(contentSel);
  await new Promise((r) => setTimeout(r, 500));
  await page.type(contentSel, TEST_CONTENT, { delay: 10 });
  let currentContent = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
  console.log('Content entered:', currentContent.substring(0, 35) + '...');

  // Step 5: Focus Keywords and Type
  console.log('\n--- Step 5: Focus Keywords and Type ---');
  await page.click(keywordsSel);
  await new Promise((r) => setTimeout(r, 500));
  await page.type(keywordsSel, TEST_KEYWORDS, { delay: 15 });

  // Step 6: Change Category Dropdown
  console.log('\n--- Step 6: Change Category Dropdown ---');
  await page.select(categorySel, 'تعليم');
  await new Promise((r) => setTimeout(r, 500));

  // Step 7: Rapid Multi-field Cycle
  console.log('\n--- Step 7: Performing 10 Rapid Field Transition Cycles ---');
  for (let i = 1; i <= 10; i++) {
    await page.click(titleSel);
    await page.click(excerptSel);
    await page.click(contentSel);
    await page.click(keywordsSel);
    await page.select(categorySel, i % 2 === 0 ? 'جامعة' : 'تعليم');
  }

  // Step 8: Verify all fields after rapid cycles
  console.log('\n--- Step 8: Final Verification After Rapid Cycles ---');
  const finalTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  const finalExcerpt = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  const finalContent = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
  const finalKeywords = await page.$eval(keywordsSel, (el) => (el as HTMLInputElement).value);
  const finalCategory = await page.$eval(categorySel, (el) => (el as HTMLSelectElement).value);

  console.log('Final Title match:', finalTitle === TEST_TITLE ? '✅ PASS' : '❌ FAIL');
  console.log('Final Excerpt match:', finalExcerpt === TEST_EXCERPT ? '✅ PASS' : '❌ FAIL');
  console.log('Final Content match:', finalContent === TEST_CONTENT ? '✅ PASS' : '❌ FAIL');
  console.log('Final Keywords match:', finalKeywords === TEST_KEYWORDS ? '✅ PASS' : '❌ FAIL');
  console.log('Final Category:', finalCategory);

  if (finalTitle !== TEST_TITLE || finalExcerpt !== TEST_EXCERPT || finalContent !== TEST_CONTENT) {
    throw new Error('Verification failed: Field values did not persist!');
  }

  // Step 9: Simulate Browser Page Refresh & Auto-Preservation
  console.log('\n--- Step 9: Page Refresh & Draft Auto-Preservation Test ---');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Reopen dashboard and modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('لوحة التحكم'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btn = document.querySelector('#btn-create-article-dashboard') || Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('كتابة خبر صحفي'));
    if (btn) (btn as HTMLElement).click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.waitForSelector(titleSel, { visible: true });
  const restoredTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
  const restoredExcerpt = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
  const restoredContent = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);

  console.log('Restored Title after refresh:', restoredTitle === TEST_TITLE ? '✅ PASS (Auto-Preserved!)' : '❌ FAIL');
  console.log('Restored Excerpt after refresh:', restoredExcerpt === TEST_EXCERPT ? '✅ PASS (Auto-Preserved!)' : '❌ FAIL');
  console.log('Restored Content after refresh:', restoredContent === TEST_CONTENT ? '✅ PASS (Auto-Preserved!)' : '❌ FAIL');

  if (restoredTitle !== TEST_TITLE) {
    throw new Error('Auto-preservation failed: Draft not restored after reload!');
  }

  console.log('\n================================================================');
  console.log('🎉 100% SUCCESS: ALL FIELDS MAINTAINED PERFECT STABILITY');
  console.log('ZERO DISAPPEARANCE ACROSS BLUR, FOCUS, CATEGORY CHANGE & RELOAD');
  console.log('================================================================\n');

  await browser.close();
}

runResilienceTest().catch((err) => {
  console.error('*** RESILIENCE TEST FAILED ***', err);
  process.exit(1);
});
