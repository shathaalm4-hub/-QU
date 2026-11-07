import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';

async function runMandatoryUserTest() {
  console.log('================================================================');
  console.log('STARTING MANDATORY USER TEST SEQUENCE (NO-SAVE FIRST)');
  console.log('================================================================\n');

  const appUrl = 'http://localhost:3000';
  let createdArticleId = '';

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]') || text.includes('FIELD_CHANGE')) {
      console.log(`  [BROWSER-TRACE] ${text}`);
    }
  });

  try {
    // Step 1: Login as Journalist
    console.log('[Step 1] Logging in as authorized journalist (سلطان الناصر)...');
    await page.goto(appUrl, { waitUntil: 'networkidle2' });

    const loginRes = await page.evaluate(async () => {
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

    if (!loginRes.success) throw new Error('Login failed: ' + loginRes.message);

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    // Navigate to Journalist Dashboard
    const dashboardBtn = await page.waitForSelector('button ::-p-text(لوحة التحكم)', { timeout: 6000 });
    if (!dashboardBtn) throw new Error('Dashboard button not found');
    await dashboardBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Step 2: Open Create Article
    console.log('[Step 2] Opening Create Article Modal (كتابة خبر صحفي)...');
    const openCreateBtn = await page.waitForSelector('button ::-p-text(كتابة خبر صحفي)', { timeout: 6000 });
    if (!openCreateBtn) throw new Error('Create article button not found');
    await openCreateBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    const titleSel = '#article-title-input';
    const excerptSel = '#article-excerpt-textarea';
    const contentSel = '#article-content-textarea';
    const categorySel = '#article-category-select';
    const keywordsSel = '#article-keywords-input';

    await page.waitForSelector(titleSel, { visible: true, timeout: 5000 });

    // Step 3: Enter Required Values
    console.log('[Step 3] Entering user specified values...');
    const TARGET_TITLE = 'TITLE_12345';
    const TARGET_EXCERPT = 'EXCERPT_12345';
    const TARGET_CONTENT = 'CONTENT_12345';
    const TARGET_KEYWORDS = 'KEYWORDS_12345';

    await page.type(titleSel, TARGET_TITLE, { delay: 30 });
    await page.type(excerptSel, TARGET_EXCERPT, { delay: 30 });
    await page.type(contentSel, TARGET_CONTENT, { delay: 30 });
    await page.type(keywordsSel, TARGET_KEYWORDS, { delay: 30 });

    // Step 4: Rapid Field Navigation Without Saving
    console.log('[Step 4] Navigating between all fields WITHOUT saving draft...');
    const fields = [titleSel, excerptSel, contentSel, categorySel, keywordsSel, titleSel];
    for (const f of fields) {
      await page.focus(f);
      await new Promise((r) => setTimeout(r, 200));
    }

    const checkValues = async (label: string) => {
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
      console.log(`[CHECK: ${label}]`, vals);
      if (vals.title !== TARGET_TITLE) throw new Error(`Title mismatch in ${label}: got "${vals.title}"`);
      if (vals.excerpt !== TARGET_EXCERPT) throw new Error(`Excerpt mismatch in ${label}: got "${vals.excerpt}"`);
      if (vals.content !== TARGET_CONTENT) throw new Error(`Content mismatch in ${label}: got "${vals.content}"`);
      if (vals.keywords !== TARGET_KEYWORDS) throw new Error(`Keywords mismatch in ${label}: got "${vals.keywords}"`);
      return vals;
    };

    await checkValues('After Initial Input & Navigation');

    // Step 5: Wait for multiple /api/data background cycles & change category & select image preset
    console.log('[Step 5] Triggering background /api/data sync cycles & changing category...');
    await page.select(categorySel, 'اقتصاد');

    // Click photo preset "الحرم الجامعي"
    const photoPreset = await page.waitForSelector('button ::-p-text(الحرم الجامعي)', { timeout: 3000 });
    if (photoPreset) await photoPreset.click();
    await new Promise((r) => setTimeout(r, 500));

    for (let i = 1; i <= 3; i++) {
      console.log(`  Background sync cycle #${i}...`);
      await page.evaluate(async () => {
        try {
          await fetch('/api/data', {
            headers: { Authorization: `Bearer ${localStorage.getItem('qu_auth_token')}` },
          });
        } catch {}
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await checkValues('After Background Sync & Category Change');

    // Step 6: Wait 60 seconds (stress wait)
    console.log('[Step 6] Waiting 60 seconds with active background listeners...');
    for (let sec = 10; sec <= 60; sec += 10) {
      await new Promise((r) => setTimeout(r, 10000));
      console.log(`  Elapsed: ${sec}s...`);
    }

    // Recheck all fields
    const finalCheck = await checkValues('After 60s Extended Wait');
    console.log('✓ PASS: All fields 100% retained after 60s wait without saving!');

    // Step 7: Now save draft once
    console.log('\n[Step 7] Testing Draft Save, Close, Reopen, Edit, Re-save...');
    const saveBtn = await page.waitForSelector('#btn-save-draft', { timeout: 5000 });
    await saveBtn?.click();
    await new Promise((r) => setTimeout(r, 2000));

    // Grab Draft ID
    const draft = await page.evaluate(async (t) => {
      const token = localStorage.getItem('qu_auth_token');
      const res = await fetch('/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (data.articles || []).find((a: any) => a.title === t);
    }, TARGET_TITLE);

    if (!draft) throw new Error('Saved draft not found in database');
    createdArticleId = draft.id;
    console.log(`Saved Draft ID: ${createdArticleId}`);

    // Reopen draft
    const editBtn = await page.waitForSelector(`#btn-edit-article-${createdArticleId}`, { timeout: 6000 });
    await editBtn?.click();
    await new Promise((r) => setTimeout(r, 1200));

    // Verify draft loaded correctly
    const reloadedVals = await page.evaluate(
      (tS, eS, cS, kS) => {
        return {
          title: (document.querySelector(tS) as HTMLInputElement)?.value || '',
          excerpt: (document.querySelector(eS) as HTMLTextAreaElement)?.value || '',
          content: (document.querySelector(cS) as HTMLTextAreaElement)?.value || '',
          keywords: (document.querySelector(kS) as HTMLInputElement)?.value || '',
        };
      },
      titleSel,
      excerptSel,
      contentSel,
      keywordsSel
    );
    console.log('Reopened Draft Values:', reloadedVals);
    if (reloadedVals.title !== TARGET_TITLE || reloadedVals.content !== TARGET_CONTENT) {
      throw new Error('Reopened draft values mismatch!');
    }

    // Edit fields: Add suffix
    const UPDATED_TITLE = 'TITLE_12345_UPDATED';
    const UPDATED_CONTENT = 'CONTENT_12345_UPDATED';
    await page.type(titleSel, '_UPDATED', { delay: 25 });
    await page.type(contentSel, '_UPDATED', { delay: 25 });

    // Save draft again
    const saveBtn2 = await page.waitForSelector('#btn-save-draft', { timeout: 5000 });
    await saveBtn2?.click();
    await new Promise((r) => setTimeout(r, 2000));

    // Reopen and verify latest version
    const editBtn2 = await page.waitForSelector(`#btn-edit-article-${createdArticleId}`, { timeout: 6000 });
    await editBtn2?.click();
    await new Promise((r) => setTimeout(r, 1200));

    const updatedTitleVal = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
    const updatedContentVal = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
    console.log('Second Reopen Values:', { title: updatedTitleVal, content: updatedContentVal });
    if (updatedTitleVal !== UPDATED_TITLE || !updatedContentVal.includes('_UPDATED')) {
      throw new Error(`Second reopen values mismatch! Expected "${UPDATED_TITLE}", got "${updatedTitleVal}"`);
    }

    console.log('✓ PASS: Draft save, reopen, edit, and re-save verified successfully!');
    await page.click('#btn-cancel-modal');

  } finally {
    // Cleanup created test draft
    if (createdArticleId) {
      console.log(`\n[Cleanup] Cleaning up test article: ${createdArticleId}`);
      try {
        const dbPath = 'data/database.json';
        if (fs.existsSync(dbPath)) {
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          db.articles = db.articles.filter((a: any) => a.id !== createdArticleId && !a.title?.includes('TITLE_12345'));
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }

    await browser.close();
  }

  console.log('\n================================================================');
  console.log('MANDATORY USER TEST SEQUENCE COMPLETED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runMandatoryUserTest().catch((err) => {
  console.error('\n*** TEST FAILED ***\n', err);
  process.exit(1);
});
