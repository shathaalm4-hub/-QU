import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';

interface FieldCheck {
  step: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  keywords: string;
  allMatch: boolean;
}

const history: FieldCheck[] = [];

async function runRigorousArchitecturalAudit() {
  console.log('================================================================');
  console.log('STARTING RIGOROUS ARCHITECTURAL E2E VERIFICATION');
  console.log('Testing Single Source of Truth formData & Field Transitions');
  console.log('================================================================\n');

  const appUrl = 'http://localhost:3000';
  const createdTestArticleIds: string[] = [];

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[TITLE-TRACE]')) {
      console.log(`  [BROWSER-TRACE] ${text}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Login as Journalist
    // -------------------------------------------------------------
    console.log('[Step 1] Logging in as Journalist (سلطان الناصر)...');
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

    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((b) => b.textContent?.includes('لوحة التحكم'));
    }, { timeout: 15000 });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent?.includes('لوحة التحكم'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // -------------------------------------------------------------
    // Step 2: Open "كتابة خبر صحفي"
    // -------------------------------------------------------------
    console.log('[Step 2] Opening Create Article Modal (كتابة خبر صحفي)...');
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

    await page.waitForSelector(titleSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(excerptSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(contentSel, { visible: true, timeout: 5000 });
    await page.waitForSelector(categorySel, { visible: true, timeout: 5000 });
    await page.waitForSelector(keywordsSel, { visible: true, timeout: 5000 });

    // -------------------------------------------------------------
    // Step 3: Input Scenario Defined by User
    // Title: AAA_TITLE
    // Excerpt: BBB_EXCERPT
    // Content: CCC_CONTENT
    // Category: اقتصاد (DDD_CATEGORY)
    // Keywords: EEE_KEYWORDS
    // -------------------------------------------------------------
    console.log('[Step 3] Entering test values across all fields...');
    const TARGET_TITLE = 'AAA_TITLE';
    const TARGET_EXCERPT = 'BBB_EXCERPT';
    const TARGET_CONTENT = 'CCC_CONTENT';
    const TARGET_CATEGORY = 'اقتصاد';
    const TARGET_KEYWORDS = 'EEE_KEYWORDS';

    // 1. Type Title
    await page.type(titleSel, TARGET_TITLE, { delay: 25 });
    // 2. Title -> Excerpt
    await page.click(excerptSel);
    await page.type(excerptSel, TARGET_EXCERPT, { delay: 25 });
    // 3. Excerpt -> Content
    await page.click(contentSel);
    await page.type(contentSel, TARGET_CONTENT, { delay: 25 });
    // 4. Content -> Category
    await page.select(categorySel, TARGET_CATEGORY);
    // 5. Category -> Keywords
    await page.click(keywordsSel);
    await page.type(keywordsSel, TARGET_KEYWORDS, { delay: 25 });

    // Helper to read current values directly from DOM
    const readCurrentDOMValues = async (stepName: string): Promise<FieldCheck> => {
      const vals = await page.evaluate(
        (tS, eS, cS, catS, kS) => {
          return {
            title: (document.querySelector(tS) as HTMLInputElement)?.value || '',
            excerpt: (document.querySelector(eS) as HTMLTextAreaElement)?.value || '',
            content: (document.querySelector(cS) as HTMLTextAreaElement)?.value || '',
            category: (document.querySelector(catS) as HTMLSelectElement)?.value || '',
            keywords: (document.querySelector(kS) as HTMLInputElement)?.value || '',
          };
        },
        titleSel,
        excerptSel,
        contentSel,
        categorySel,
        keywordsSel
      );

      const allMatch =
        vals.title === TARGET_TITLE &&
        vals.excerpt === TARGET_EXCERPT &&
        vals.content === TARGET_CONTENT &&
        vals.category === TARGET_CATEGORY &&
        vals.keywords === TARGET_KEYWORDS;

      const check: FieldCheck = { step: stepName, ...vals, allMatch };
      history.push(check);
      console.log(`[DOM-CHECK] [${stepName}] match=${allMatch}:`, vals);
      if (!allMatch) {
        throw new Error(`FIELD INTEGRITY VIOLATION at "${stepName}": expected all fields to retain their values! Got: ${JSON.stringify(vals)}`);
      }
      return check;
    };

    await readCurrentDOMValues('Initial Entry Complete');

    // -------------------------------------------------------------
    // Step 4: Rigorous Field-to-Field Navigation Sequence (User's Exact Order)
    // 1. Keywords -> Title
    // 2. Title -> Content
    // 3. Content -> Excerpt
    // 4. Excerpt -> Category
    // 5. Category -> Keywords
    // -------------------------------------------------------------
    console.log('\n[Step 4] Executing rapid focus/navigation switches between all fields...');

    console.log('Switch 1: Keywords -> Title');
    await page.click(titleSel);
    await new Promise((r) => setTimeout(r, 200));
    await readCurrentDOMValues('Focus: Title');

    console.log('Switch 2: Title -> Content');
    await page.click(contentSel);
    await new Promise((r) => setTimeout(r, 200));
    await readCurrentDOMValues('Focus: Content');

    console.log('Switch 3: Content -> Excerpt');
    await page.click(excerptSel);
    await new Promise((r) => setTimeout(r, 200));
    await readCurrentDOMValues('Focus: Excerpt');

    console.log('Switch 4: Excerpt -> Category');
    await page.focus(categorySel);
    await new Promise((r) => setTimeout(r, 200));
    await readCurrentDOMValues('Focus: Category');

    console.log('Switch 5: Category -> Keywords');
    await page.click(keywordsSel);
    await new Promise((r) => setTimeout(r, 200));
    await readCurrentDOMValues('Focus: Keywords');

    // -------------------------------------------------------------
    // Step 5: Extended Polling, Visibility, and Background Sync Stress
    // -------------------------------------------------------------
    console.log('\n[Step 5] Stress testing against background sync, visibility changes, and context polling...');
    for (let cycle = 1; cycle <= 5; cycle++) {
      console.log(`  Running stress cycle #${cycle}...`);
      await page.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('blur'));
      });
      await page.evaluate(async () => {
        try {
          await fetch('/api/data', {
            headers: { Authorization: `Bearer ${localStorage.getItem('qu_auth_token')}` },
          });
        } catch {}
      });
      await new Promise((r) => setTimeout(r, 1000));
      await readCurrentDOMValues(`After Stress Cycle #${cycle}`);
    }

    // -------------------------------------------------------------
    // Step 6: Verify FIELD_CHANGE Trace Logs
    // -------------------------------------------------------------
    console.log('\n[Step 6] Inspecting FIELD_CHANGE trace logs...');
    const fieldTraces = await page.evaluate(() => {
      const logs = (window as any).__TITLE_TRACE_LOGS || [];
      return logs.filter((l: any) => l.type === 'FIELD_CHANGE');
    });
    console.log(`Total FIELD_CHANGE events recorded: ${fieldTraces.length}`);
    const wipes = fieldTraces.filter((f: any) => f.payload.oldValue && f.payload.newValue === '');
    console.log(`Wipe events detected: ${wipes.length}`);
    if (wipes.length > 0) {
      throw new Error(`Detected ${wipes.length} field wipe events! ${JSON.stringify(wipes)}`);
    }

    // -------------------------------------------------------------
    // Step 7: Save Draft A and close
    // -------------------------------------------------------------
    console.log('\n[Step 7] Saving Draft A (AAA_TITLE)...');
    const saveBtn = await page.waitForSelector('#btn-save-draft', { timeout: 5000 });
    if (!saveBtn) throw new Error('#btn-save-draft not found');
    await saveBtn.click();
    await new Promise((r) => setTimeout(r, 2000));

    // Grab Draft A ID
    const draftA = await page.evaluate(async (t) => {
      const token = localStorage.getItem('qu_auth_token');
      const res = await fetch('/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (data.articles || []).find((a: any) => a.title === t);
    }, TARGET_TITLE);

    if (!draftA) throw new Error('Draft A was not found in database');
    createdTestArticleIds.push(draftA.id);
    console.log(`Draft A created successfully: ID=${draftA.id}`);

    // -------------------------------------------------------------
    // Step 8: Create Draft B (DRAFT_B_TITLE)
    // -------------------------------------------------------------
    console.log('\n[Step 8] Creating Draft B (DRAFT_B_TITLE)...');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((b) => b.id === 'btn-create-article-dashboard' || b.textContent?.includes('كتابة خبر صحفي'));
    }, { timeout: 10000 });
    await page.evaluate(() => {
      const btn = document.querySelector('#btn-create-article-dashboard') || Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('كتابة خبر صحفي'));
      if (btn) (btn as HTMLElement).click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.waitForSelector(titleSel, { visible: true });
    // Verify fresh clean state
    const freshTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
    console.log('Fresh new article title is empty:', freshTitle === '');
    if (freshTitle !== '') throw new Error(`Fresh modal was not empty: got "${freshTitle}"`);

    const DRAFT_B_TITLE = 'DRAFT_B_TITLE';
    const DRAFT_B_CONTENT = 'DRAFT_B_CONTENT';
    await page.type(titleSel, DRAFT_B_TITLE, { delay: 20 });
    await page.type(contentSel, DRAFT_B_CONTENT, { delay: 20 });

    const saveBtnB = await page.waitForSelector('#btn-save-draft', { timeout: 5000 });
    await saveBtnB?.click();
    await new Promise((r) => setTimeout(r, 2000));

    const draftB = await page.evaluate(async (t) => {
      const token = localStorage.getItem('qu_auth_token');
      const res = await fetch('/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (data.articles || []).find((a: any) => a.title === t);
    }, DRAFT_B_TITLE);

    if (!draftB) throw new Error('Draft B was not found in database');
    createdTestArticleIds.push(draftB.id);
    console.log(`Draft B created successfully: ID=${draftB.id}`);

    // -------------------------------------------------------------
    // Step 9: Test Switching Between Drafts: A -> B -> A
    // -------------------------------------------------------------
    console.log('\n[Step 9] Testing draft switching: Open A -> Verify -> Open B -> Verify -> Open A...');

    // Open Draft A
    const editBtnA = await page.waitForSelector(`#btn-edit-article-${draftA.id}`, { timeout: 6000 });
    if (!editBtnA) throw new Error(`Edit button for Draft A (#btn-edit-article-${draftA.id}) not found`);
    await editBtnA.click();
    await new Promise((r) => setTimeout(r, 1200));

    let currentOpenTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
    console.log(`Opened Draft Title: "${currentOpenTitle}" (Expected: "${TARGET_TITLE}")`);
    if (currentOpenTitle !== TARGET_TITLE) {
      throw new Error(`Expected Draft A title "${TARGET_TITLE}", got "${currentOpenTitle}"`);
    }

    // Cancel modal
    await page.click('#btn-cancel-modal');
    await new Promise((r) => setTimeout(r, 800));

    // Open Draft B
    const editBtnB = await page.waitForSelector(`#btn-edit-article-${draftB.id}`, { timeout: 6000 });
    if (!editBtnB) throw new Error(`Edit button for Draft B (#btn-edit-article-${draftB.id}) not found`);
    await editBtnB.click();
    await new Promise((r) => setTimeout(r, 1200));

    currentOpenTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
    console.log(`Opened Draft Title: "${currentOpenTitle}" (Expected: "${DRAFT_B_TITLE}")`);
    if (currentOpenTitle !== DRAFT_B_TITLE) {
      throw new Error(`Expected Draft B title "${DRAFT_B_TITLE}", got "${currentOpenTitle}"`);
    }

    // Cancel modal
    await page.click('#btn-cancel-modal');
    await new Promise((r) => setTimeout(r, 800));

    // -------------------------------------------------------------
    // Step 10: Refresh Page and Reopen Draft
    // -------------------------------------------------------------
    console.log('\n[Step 10] Testing Refresh and Reopen Draft A...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    // Click Dashboard
    const dashBtnAfterReload = await page.waitForSelector('button ::-p-text(لوحة التحكم)');
    await dashBtnAfterReload?.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Open Draft A again
    const editBtnAReload = await page.waitForSelector(`#btn-edit-article-${draftA.id}`, { timeout: 6000 });
    await editBtnAReload?.click();
    await new Promise((r) => setTimeout(r, 1200));

    const reloadedTitle = await page.$eval(titleSel, (el) => (el as HTMLInputElement).value);
    const reloadedContent = await page.$eval(contentSel, (el) => (el as HTMLTextAreaElement).value);
    const reloadedExcerpt = await page.$eval(excerptSel, (el) => (el as HTMLTextAreaElement).value);
    const reloadedKeywords = await page.$eval(keywordsSel, (el) => (el as HTMLInputElement).value);

    console.log('Reloaded Draft A values:', {
      title: reloadedTitle,
      content: reloadedContent,
      excerpt: reloadedExcerpt,
      keywords: reloadedKeywords,
    });

    if (
      reloadedTitle !== TARGET_TITLE ||
      reloadedContent !== TARGET_CONTENT ||
      reloadedExcerpt !== TARGET_EXCERPT ||
      reloadedKeywords !== TARGET_KEYWORDS
    ) {
      throw new Error('Data mismatch after page reload!');
    }

    console.log('✓ PASS: All draft values intact after reload!');
    await page.click('#btn-cancel-modal');

  } finally {
    // -------------------------------------------------------------
    // Clean up test drafts from Supabase and Local DB
    // -------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up created test articles:', createdTestArticleIds);
    try {
      const dbPath = 'data/database.json';
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        db.articles = db.articles.filter((a: any) => !createdTestArticleIds.includes(a.id) && !a.title?.includes('AAA_TITLE') && !a.title?.includes('DRAFT_B'));
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }

    await browser.close();
  }

  console.log('\n================================================================');
  console.log('ALL RIGOROUS ARCHITECTURAL E2E CHECKS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runRigorousArchitecturalAudit().catch((err) => {
  console.error('\n*** AUDIT FAILED ***\n', err);
  process.exit(1);
});
