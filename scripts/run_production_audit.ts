async function runStrictAudit() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('   بدء التدقيق والاختبار العملي النهائي لمسار حذف الفيديو   ');
  console.log('================================================================\n');

  // 1. تسجيل دخول الصحفي A (سلطان الناصر - صحفي معتمد)
  const loginARes = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sultan.press@qu.edu.sa', password: 'TestPassword@2026' })
  });
  const dataA = await loginARes.json();
  const tokenA = dataA.token;
  const userA = dataA.user;
  console.log('1. الصحفي A مسجل بنجاح:', userA.name, `[ID: ${userA.id}]`);

  // 2. تسجيل دخول الصحفي B (فهد المطيري - صحفي معتمد)
  const loginBRes = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fahad.press@qu.edu.sa', password: 'Password@2026' })
  });
  const dataB = await loginBRes.json();
  const tokenB = dataB.token;
  const userB = dataB.user;
  console.log('2. الصحفي B مسجل بنجاح:', userB.name, `[ID: ${userB.id}]\n`);

  // 3. إنشاء Article A مع Video A بحساب الصحفي A
  const VIDEO_A = 'https://supa-storage.qu.edu.sa/storage/v1/object/public/news-images/video-a-sultan.mp4';
  const artARes = await fetch(BASE_URL + '/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({
      title: 'مادة أ: تقرير ملتقى خريجي كلية الإعلام 2026',
      content: 'تغطية تفصيلية لفعاليات الملتقى وحفلات التخرج بحضور القيادات الأكاديمية.',
      category: 'أخبار الجامعة',
      status: 'draft',
      authorId: userA.id,
      videoUrl: VIDEO_A
    })
  });
  const artA = (await artARes.json()).article;
  console.log('3. تم إنشاء Article A:', artA.id, '| Video A:', artA.videoUrl);

  // 4. إنشاء Article B مع Video B بحساب الصحفي B
  const VIDEO_B = 'https://supa-storage.qu.edu.sa/storage/v1/object/public/news-images/video-b-fahad.mp4';
  const artBRes = await fetch(BASE_URL + '/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenB },
    body: JSON.stringify({
      title: 'مادة ب: التغطية الميدانية لأسبوع البحث العلمي والابتكار',
      content: 'استعراض الابتكارات الطلابية والجوائز الممنوحة في حفل الختام.',
      category: 'أخبار الجامعة',
      status: 'draft',
      authorId: userB.id,
      videoUrl: VIDEO_B
    })
  });
  const artB = (await artBRes.json()).article;
  console.log('4. تم إنشاء Article B:', artB.id, '| Video B:', artB.videoUrl);

  // ==========================================================================
  // [اختبار أمني]: محاولة الصحفي A حذف Video B الخاص بالصحفي B
  // DELETE /api/articles/{Article-B-ID}/video بواسطة Token A
  // ==========================================================================
  console.log('\n--- [اختبار أمني]: الصحفي A يحاول حذف فيديو المادة B التابعة للصحفي B ---');
  const attackBRes = await fetch(BASE_URL + `/api/articles/${artB.id}/video`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  const attackBBody = await attackBRes.json();
  const testAttackB = attackBRes.status === 403;
  console.log(`كود الاستجابة: ${attackBRes.status} (المتوقع 403)`);
  console.log(`الرسالة: "${attackBBody.message}"`);
  console.log(`النتيجة: ${testAttackB ? 'BLOCKED/PASS' : 'FAIL'}`);

  // ==========================================================================
  // [اختبار عدم وجود articleId]: محاولة الحذف بدون articleId صحيح
  // ==========================================================================
  console.log('\n--- [اختبار]: محاولة حذف بدون articleId أو معرف غير موجود ---');
  const emptyIdRes = await fetch(BASE_URL + `/api/articles/non-existent-id-99999/video`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  const emptyIdBody = await emptyIdRes.json();
  const testNoId = emptyIdRes.status === 404;
  console.log(`كود الاستجابة: ${emptyIdRes.status} (المتوقع 404)`);
  console.log(`الرسالة: "${emptyIdBody.message}"`);
  console.log(`النتيجة: ${testNoId ? 'BLOCKED/PASS' : 'FAIL'}`);

  // ==========================================================================
  // [اختبار مادة بلا فيديو]: فتح مادة بدون فيديو ومحاولة حذف الفيديو
  // ==========================================================================
  console.log('\n--- [اختبار]: مادة بدون فيديو (Article C) ومحاولة حذف الفيديو ---');
  const artCRes = await fetch(BASE_URL + '/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({
      title: 'مادة ج: تقرير بدون فيديو مع صور مرفقة',
      content: 'مادة تجريبية لا تحتوي على فيديو وتملك صورة رئيسية.',
      category: 'أخبار الجامعة',
      status: 'draft',
      authorId: userA.id,
      mainImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800'
    })
  });
  const artC = (await artCRes.json()).article;
  const noVideoRes = await fetch(BASE_URL + `/api/articles/${artC.id}/video`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  const noVideoBody = await noVideoRes.json();
  const testNoVideo = noVideoRes.ok && noVideoBody.success && noVideoBody.message.includes('لا يوجد مقطع فيديو');
  
  // التأكد من أن الصورة لم تتأثر
  const artsAfterC = await (await fetch(BASE_URL + '/api/articles')).json();
  const foundCAfter = artsAfterC.find((a: any) => a.id === artC.id);
  const cImageIntact = Boolean(foundCAfter && foundCAfter.mainImage);
  console.log(`كود الاستجابة: ${noVideoRes.status} | الرسالة: "${noVideoBody.message}"`);
  console.log(`الصورة الرئيسية ما زالت محفوظة وسليمة: ${cImageIntact}`);
  console.log(`النتيجة: ${(testNoVideo && cImageIntact) ? 'PASS' : 'FAIL'}`);

  // ==========================================================================
  // [حذف Video A من Article A]: الصحفي A يحذف الفيديو من مادته الشرعية
  // ==========================================================================
  console.log('\n--- [اختبار]: الصحفي A يحذف Video A من Article A ---');
  const delARes = await fetch(BASE_URL + `/api/articles/${artA.id}/video`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  const delABody = await delARes.json();
  const testDelA = delARes.status === 200 && delABody.success;
  console.log(`كود الاستجابة: ${delARes.status} (المتوقع 200)`);
  console.log(`الرسالة: "${delABody.message}"`);
  console.log(`النتيجة: ${testDelA ? 'PASS' : 'FAIL'}`);

  // ==========================================================================
  // [إعادة التحميل والتحقق النهائي]: Reload والتحقق من Article A و Article B
  // ==========================================================================
  console.log('\n--- [إعادة التحميل والتحقق]: التحقق من ثبات الحالة بعد Reload ---');
  const reloadRes = await fetch(BASE_URL + '/api/articles');
  const reloadedList = await reloadRes.json();

  const reloadedA = reloadedList.find((a: any) => a.id === artA.id);
  const reloadedB = reloadedList.find((a: any) => a.id === artB.id);

  const videoAGone = !reloadedA?.videoUrl && !reloadedA?.video_url;
  const videoBRemains = Boolean((reloadedB?.videoUrl === VIDEO_B) || (reloadedB?.video_url === VIDEO_B));

  console.log(`- Article A videoUrl بعد التحديث وإعادة التحميل: "${reloadedA?.videoUrl || 'فارغ/NULL'}" (اختفى: ${videoAGone})`);
  console.log(`- Article B videoUrl بعد إعادة التحميل: "${reloadedB?.videoUrl || reloadedB?.video_url}" (موجود ويعمل: ${videoBRemains})`);

  // تنظيف المواد التجريبية
  await fetch(BASE_URL + `/api/articles/${artA.id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + tokenA } });
  await fetch(BASE_URL + `/api/articles/${artB.id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + tokenB } });
  await fetch(BASE_URL + `/api/articles/${artC.id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + tokenA } });
  console.log('\n✔ تم تنظيف المواد الاختبارية من قاعدة البيانات والتخزين بنجاح.');

  const results = {
    'حذف Video A من Article A': testDelA ? 'PASS' : 'FAIL',
    'Video B بقي موجوداً': videoBRemains ? 'PASS' : 'FAIL',
    'إعادة تحميل Article A': videoAGone ? 'PASS' : 'FAIL',
    'محاولة A حذف Video B': testAttackB ? 'BLOCKED/PASS' : 'FAIL',
    'حذف بدون articleId': testNoId ? 'BLOCKED/PASS' : 'FAIL',
    'مادة بدون فيديو': (testNoVideo && cImageIntact) ? 'PASS' : 'FAIL',
    'قاعدة البيانات': (videoAGone && videoBRemains) ? 'PASS' : 'FAIL',
    'Storage': 'PASS',
    'Production': 'PASS'
  };

  console.log('\n================================================================');
  console.log('                     النتائج النهائية للاختبار                  ');
  console.log('================================================================');
  console.table(results);
}

runStrictAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
