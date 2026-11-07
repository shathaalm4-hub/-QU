import puppeteer from 'puppeteer';

async function checkLiveProduction() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const responses: { url: string; status: number }[] = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('.js') || url.includes('/api/')) {
      responses.push({ url, status: res.status() });
    }
  });

  const liveUrl = 'https://ais-pre-qz4q4icz5k67sfkwrsgqli-542247905796.europe-west3.run.app';
  console.log(`Navigating to live production: ${liveUrl}...`);

  await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  const currentUrl = page.url();
  console.log('Final resolved URL:', currentUrl);
  console.log('Page Title:', await page.title());

  const scriptTags = await page.$$eval('script[src]', (scripts) =>
    scripts.map((s) => (s as HTMLScriptElement).src)
  );
  console.log('Loaded script tags on live page:', scriptTags);

  // Check if CreateArticleModal in bundle has formData
  const bundleContent = await page.evaluate(async () => {
    const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
    const appScript = scripts.find((s) => s.src.includes('/assets/index-') || s.src.includes('/src/main.tsx') || s.src.includes('index'));
    if (!appScript) return { foundScript: null, snippet: null };
    try {
      const res = await fetch(appScript.src);
      const text = await res.text();
      return {
        foundScript: appScript.src,
        hasFormData: text.includes('formData') && text.includes('updateFormField'),
        hasSingleSource: text.includes('createInitialFormData') || text.includes('ArticleFormData'),
        textLength: text.length,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  console.log('Bundle analysis on live production:', bundleContent);

  await browser.close();
}

checkLiveProduction().catch(console.error);
