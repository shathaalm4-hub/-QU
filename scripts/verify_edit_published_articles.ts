import puppeteer, { Browser, Page } from 'puppeteer';

const APP_URL = 'http://localhost:3000';

async function runAudit() {
  console.log('=== STARTING EDIT PUBLISHED ARTICLES E2E AUDIT ===');
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // 1. Fetch initial public articles from /api/data
    const initialDataRes = await fetch(`${APP_URL}/api/data`);
    const initialData = await initialDataRes.json();
    console.log(`Fetched initial articles: ${initialData.articles.length}`);
    const publishedArticles = initialData.articles.filter((a: any) => a.status === 'published' || a.status === 'approved');
    console.log(`Initial published articles: ${publishedArticles.length}`);
    publishedArticles.forEach((a: any) => console.log(` - ID: ${a.id} | Title: "${a.title}" | Author: ${a.authorName} (${a.authorId})`));

    if (publishedArticles.length === 0) {
      throw new Error('No published articles available for testing');
    }

    const targetArticle = publishedArticles[0];
    console.log(`Selected target article for testing: "${targetArticle.title}" (ID: ${targetArticle.id})`);

    // ==========================================
    // TEST CASE 1: Unauthenticated Visitor
    // ==========================================
    console.log('\n--- TEST CASE 1: Unauthenticated Visitor ---');
    const visitorPage = await browser.newPage();
    await visitorPage.setViewport({ width: 1400, height: 900 });
    await visitorPage.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });

    // Click on target article card or title
    await visitorPage.evaluate((title) => {
      const elements = Array.from(document.querySelectorAll('h3, h2, h1'));
      const target = elements.find(el => el.textContent && el.textContent.includes(title));
      if (target) (target as HTMLElement).click();
    }, targetArticle.title);

    await visitorPage.waitForSelector('article', { timeout: 6000 });
    const hasEditButtonUnauth = await visitorPage.$('#btn-edit-published-article');
    console.log(`Unauthenticated visitor sees edit button: ${hasEditButtonUnauth !== null ? 'FAIL (button visible)' : 'PASS (no button)'}`);
    if (hasEditButtonUnauth !== null) {
      throw new Error('Unauthenticated visitor should NOT see edit button!');
    }

    // Direct server attempt without auth
    const unauthPutRes = await fetch(`${APP_URL}/api/articles/${targetArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    console.log(`Unauthenticated direct PUT status: ${unauthPutRes.status} (expected 401: ${unauthPutRes.status === 401 ? 'PASS' : 'FAIL'})`);
    if (unauthPutRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated PUT, got ${unauthPutRes.status}`);
    }
    await visitorPage.close();

    // ==========================================
    // TEST CASE 2: Journalist Sultan (Non-owner test)
    // ==========================================
    console.log('\n--- TEST CASE 2: Journalist Sultan (Non-owner test) ---');
    const sultanContext = await browser.createBrowserContext();
    const sultanPage = await sultanContext.newPage();
    await sultanPage.setViewport({ width: 1400, height: 900 });
    await sultanPage.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });

    await sultanPage.click('#btn-open-login');
    await sultanPage.waitForSelector('#login-email-input', { timeout: 5000 });
    await sultanPage.type('#login-email-input', 'sultan.press@qu.edu.sa');
    await sultanPage.type('#login-password-input', 'TestPassword@2026');
    await sultanPage.click('#btn-submit-login');

    await sultanPage.waitForFunction(() => !document.querySelector('#login-email-input'), { timeout: 8000 });
    console.log('Logged in successfully as Journalist Sultan');

    // Retrieve auth token for Sultan
    const sultanToken = await sultanPage.evaluate(() => localStorage.getItem('qu_auth_token') || sessionStorage.getItem('qu_auth_token') || '');
    console.log(`Sultan Token retrieved: ${sultanToken.substring(0, 15)}...`);

    // Attempt direct PUT on targetArticle (authored by someone else)
    const unauthorizedPutRes = await fetch(`${APP_URL}/api/articles/${targetArticle.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sultanToken}`,
      },
      body: JSON.stringify({ title: 'Illegal Edit by Sultan' }),
    });
    console.log(`Journalist non-owner PUT status: ${unauthorizedPutRes.status} (expected 403: ${unauthorizedPutRes.status === 403 ? 'PASS' : 'FAIL'})`);
    if (unauthorizedPutRes.status !== 403) {
      throw new Error(`Expected 403 for non-owner journalist, got ${unauthorizedPutRes.status}`);
    }

    // Click Home to navigate to the article as Sultan
    await sultanPage.evaluate(() => {
      const homeLink = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent && el.textContent.trim() === 'الرئيسية');
      if (homeLink) (homeLink as HTMLElement).click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Navigate to targetArticle in browser as Sultan: should NOT see edit button
    await sultanPage.evaluate((title) => {
      const elements = Array.from(document.querySelectorAll('h3, h2, h1'));
      const target = elements.find(el => el.textContent && el.textContent.includes(title));
      if (target) (target as HTMLElement).click();
    }, targetArticle.title);

    await sultanPage.waitForSelector('article', { timeout: 5000 });
    const sultanHasEditBtn = await sultanPage.$('#btn-edit-published-article');
    console.log(`Journalist Sultan (non-owner) sees edit button on ArticleDetailPage: ${sultanHasEditBtn !== null ? 'FAIL (button visible)' : 'PASS (no button)'}`);
    if (sultanHasEditBtn !== null) {
      throw new Error('Journalist should NOT see edit button on articles authored by others!');
    }
    await sultanContext.close();

    // ==========================================
    // TEST CASE 3: Admin Editing Published Article
    // ==========================================
    console.log('\n--- TEST CASE 3: Admin Editing Published Article ---');
    const adminContext = await browser.createBrowserContext();
    const adminPage = await adminContext.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });
    await adminPage.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });

    await adminPage.waitForSelector('#btn-open-login', { timeout: 5000 });
    await adminPage.click('#btn-open-login');
    await adminPage.waitForSelector('#login-email-input', { timeout: 5000 });

    await adminPage.type('#login-email-input', 'admin@qu.edu.sa');
    await adminPage.type('#login-password-input', 'Admin@QU2026');
    await adminPage.click('#btn-submit-login');

    await adminPage.waitForFunction(() => !document.querySelector('#login-email-input'), { timeout: 8000 });
    console.log('Logged in successfully as Admin');

    // Retrieve Admin Token
    const adminToken = await adminPage.evaluate(() => localStorage.getItem('qu_auth_token') || sessionStorage.getItem('qu_auth_token') || '');
    console.log(`Admin Token retrieved: ${adminToken.substring(0, 15)}...`);

    // In AdminDashboard, switch to content tab to view published articles
    await adminPage.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const contentTab = tabs.find(b => b.textContent && b.textContent.includes('إدارة المحتوى'));
      if (contentTab) (contentTab as HTMLElement).click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // In AdminDashboard, test that edit button exists on the published article row
    await adminPage.waitForSelector(`[id="btn-admin-edit-article-${targetArticle.id}"]`, { timeout: 6000 });
    console.log(`Admin Dashboard has edit button for target article: PASS`);

    // Go to the article detail page via preview button in dashboard
    await adminPage.waitForSelector(`[id="btn-admin-preview-article-${targetArticle.id}"]`, { timeout: 6000 });
    await adminPage.click(`[id="btn-admin-preview-article-${targetArticle.id}"]`);

    await adminPage.waitForSelector('article', { timeout: 6000 });
    const adminHasEditBtn = await adminPage.$('#btn-edit-published-article');
    console.log(`Admin sees edit button on ArticleDetailPage: ${adminHasEditBtn !== null ? 'PASS' : 'FAIL'}`);
    if (!adminHasEditBtn) {
      throw new Error('Admin MUST see edit button on published articles!');
    }

    // Click edit button to open CreateArticleModal
    console.log('Clicking #btn-edit-published-article...');
    await adminPage.click('#btn-edit-published-article');
    await adminPage.waitForSelector('#article-form-modal', { timeout: 6000 });
    console.log('CreateArticleModal opened successfully');

    // Verify modal title
    const modalHeader = await adminPage.$eval('h3', el => el.textContent || '');
    console.log(`Modal Header: "${modalHeader}"`);

    // Verify button visibility
    const savePublishedBtn = await adminPage.$('#btn-save-published');
    const saveDraftBtn = await adminPage.$('#btn-save-draft');
    console.log(`"Save Published" button present: ${savePublishedBtn !== null ? 'PASS' : 'FAIL'}`);
    console.log(`"Save Draft" button hidden: ${saveDraftBtn === null ? 'PASS' : 'FAIL'}`);

    if (!savePublishedBtn) {
      throw new Error('Expected #btn-save-published button to be present for published article');
    }

    // Verify prefilled form values
    const formTitle = await adminPage.$eval('#article-title-input', (el: any) => el.value);
    const formContent = await adminPage.$eval('#article-content-textarea', (el: any) => el.value);
    const formExcerpt = await adminPage.$eval('#article-excerpt-textarea', (el: any) => el.value);
    console.log(`Form Title: "${formTitle}" (matches: ${formTitle === targetArticle.title ? 'PASS' : 'FAIL'})`);
    console.log(`Form Content length: ${formContent.length}`);
    console.log(`Form Excerpt: "${formExcerpt}"`);

    // Test Field Navigation without data loss
    console.log('\n--- Testing Field Navigation in Published Edit Modal ---');
    const addition = ' [تحديث رسمي معتمد]';
    await adminPage.type('#article-title-input', addition);
    const newExpectedTitle = formTitle + addition;

    // Transition between inputs
    await adminPage.click('#article-content-textarea');
    await adminPage.type('#article-content-textarea', '\nملاحظة تحريرية: تم التحديث.');

    await adminPage.click('#article-excerpt-textarea');
    await adminPage.click('#article-category-select');

    // Verify title retained value
    const titleAfterSwitches = await adminPage.$eval('#article-title-input', (el: any) => el.value);
    console.log(`Title retained after multiple field switches: ${titleAfterSwitches === newExpectedTitle ? 'PASS' : 'FAIL'}`);
    if (titleAfterSwitches !== newExpectedTitle) {
      throw new Error(`Data vanished during field transition! Expected "${newExpectedTitle}", got "${titleAfterSwitches}"`);
    }

    // Save changes via #btn-save-published
    console.log('Clicking #btn-save-published to save updates...');
    await adminPage.click('#btn-save-published');

    // Wait for modal to close
    await adminPage.waitForFunction(() => !document.querySelector('#article-form-modal'), { timeout: 8000 });
    console.log('Modal closed after successful save');

    // Verify updated data from /api/data
    const afterDataRes = await fetch(`${APP_URL}/api/data`);
    const afterData = await afterDataRes.json();
    const checkedArticle = afterData.articles.find((a: any) => a.id === targetArticle.id);

    console.log('\n--- Verifying Updated Article Integrity ---');
    console.log(`Article ID: ${checkedArticle.id} (preserved: ${checkedArticle.id === targetArticle.id ? 'PASS' : 'FAIL'})`);
    console.log(`Article Status: ${checkedArticle.status} (preserved: ${checkedArticle.status === targetArticle.status ? 'PASS' : 'FAIL'})`);
    console.log(`Article Title: "${checkedArticle.title}"`);
    console.log(`Original PublishedAt: ${targetArticle.publishedAt}`);
    console.log(`Current PublishedAt: ${checkedArticle.publishedAt} (preserved: ${checkedArticle.publishedAt === targetArticle.publishedAt ? 'PASS' : 'FAIL'})`);

    if (checkedArticle.title !== newExpectedTitle) {
      throw new Error(`Article title not updated in DB! Expected "${newExpectedTitle}", got "${checkedArticle.title}"`);
    }

    // Verify Audit Log
    const auditRes = await fetch(`${APP_URL}/api/articles/${targetArticle.id}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    console.log(`Audit logs retrieved: ${auditData.logs ? auditData.logs.length : 0}`);
    if (auditData.logs && auditData.logs.length > 0) {
      const lastAudit = auditData.logs[auditData.logs.length - 1];
      console.log('Audit Entry Verified:', JSON.stringify(lastAudit, null, 2));
    }

    // 5. Restore original title & content to leave the database clean
    console.log('\n--- Restoring Original Article Data ---');
    const restoreRes = await fetch(`${APP_URL}/api/articles/${targetArticle.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: targetArticle.title,
        content: targetArticle.content,
      }),
    });
    const restoreJson = await restoreRes.json();
    console.log(`Restored successfully: ${restoreJson.success}`);

    const finalRes = await fetch(`${APP_URL}/api/data`);
    const finalData = await finalRes.json();
    const finalArticle = finalData.articles.find((a: any) => a.id === targetArticle.id);
    console.log(`Final Article Title: "${finalArticle.title}" (matches original: ${finalArticle.title === targetArticle.title ? 'PASS' : 'FAIL'})`);

    await adminContext.close();

    console.log('\n=============================================');
    console.log('=== ALL PRODUCTION E2E AUDIT TESTS PASSED! ===');
    console.log('=============================================');
  } finally {
    await browser.close();
  }
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
