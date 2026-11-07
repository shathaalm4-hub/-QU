import fs from 'fs';
import crypto from 'crypto';

function hash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 10);
}

async function runTrace() {
  const timestamp = Date.now();
  const testStudentId = '44' + String(Math.floor(1000000 + Math.random() * 9000000));
  const testEmail = `journalist.trace.${timestamp}@qu.edu.sa`;
  const testName = `صحفي تجريبي تتبع ${timestamp}`;
  // Unique test password
  const testPassword = `P@ss_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
  const passLength = testPassword.length;

  console.log('====================================================');
  console.log('TRACE: Full Registration, Accreditation, Login Flow');
  console.log('====================================================');
  console.log(`Generated Test User:`);
  console.log(`  Name: ${testName}`);
  console.log(`  Student ID: ${testStudentId}`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  Password Fingerprint: len=${passLength}, sha256_prefix=${hash(testPassword)} (PLAINTEXT HIDDEN)`);
  console.log('----------------------------------------------------');

  // STEP 1: Registration from JoinJournalistModal via /api/journalists/register
  console.log('\n[STEP 1] Submitting Registration via /api/journalists/register (JoinJournalistModal flow)...');
  const regPayload = {
    name: testName,
    studentId: testStudentId,
    email: testEmail,
    password: testPassword,
    major: 'صحافة ونشر رقمي',
    academicLevel: 'المستوى الثالث',
    avatar: '',
    bio: 'سجل تجريبي لاختبار دورة حياة الاعتماد وكلمة المرور',
    skills: ['التحرير الصحفي', 'الصحافة الاستقصائية'],
  };

  const regResponse = await fetch('http://localhost:3000/api/journalists/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });

  const regData = await regResponse.json();
  console.log(`  Status Code: ${regResponse.status}`);
  console.log(`  Response Success: ${regData.success}`);
  console.log(`  Response Message: ${regData.message}`);
  
  const userId = regData.user?.id || regData.request?.userId;
  const requestId = regData.request?.id;
  const normalizedEmail = testEmail.toLowerCase().trim();
  const normalizedStudentId = testStudentId.trim();

  console.log('\n[RECORD DETAILS]');
  console.log(`  userId: ${userId}`);
  console.log(`  requestId: ${requestId}`);
  console.log(`  email normalized: ${normalizedEmail}`);
  console.log(`  student_id normalized: ${normalizedStudentId}`);

  // STEP 2: Inspect credential store right after registration
  console.log('\n[STEP 2] Inspecting Credential Store (journalist_credentials.json) right after registration:');
  const credsRawAfterReg = fs.readFileSync('./data/journalist_credentials.json', 'utf8');
  const credsAfterReg = JSON.parse(credsRawAfterReg);

  const keysChecked = [normalizedEmail, normalizedStudentId, userId, requestId].filter(Boolean);
  const matchedKeysAfterReg = keysChecked.filter(k => !!credsAfterReg[k]);

  console.log(`  - هل وصلت كلمة المرور إلى POST registration؟: ${regPayload.password ? 'true' : 'false'}`);
  console.log(`  - طول كلمة المرور فقط: ${passLength}`);
  console.log(`  - هل تم حفظ credential؟: ${matchedKeysAfterReg.length > 0 ? 'true' : 'false'}`);
  console.log(`  - المفاتيح التي تم إنشاء credential تحتها:`, matchedKeysAfterReg);
  matchedKeysAfterReg.forEach(k => {
    const val = credsAfterReg[k];
    console.log(`    Key [${k}]: len=${val?.length}, hash=${hash(val)}`);
  });

  // STEP 3: Admin Approval via /api/accreditation/requests/:id/status (AdminDashboard flow)
  console.log('\n[STEP 3] Approving request via Admin Dashboard flow (/api/accreditation/requests/:id/status)...');
  const approveResponse = await fetch(`http://localhost:3000/api/accreditation/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-role': 'admin',
    },
    body: JSON.stringify({
      status: 'approved',
      reviewerName: 'المشرف العام - إدارة التحرير',
      notes: 'اعتماد تجريبي في مسار التتبع',
    }),
  });

  const approveData = await approveResponse.json();
  console.log(`  Approval Status Code: ${approveResponse.status}`);
  console.log(`  Approval Success: ${approveData.success}`);
  console.log(`  Approval Message: ${approveData.message}`);

  // STEP 4: Check credentials immediately after approval
  console.log('\n[STEP 4] Checking credentials store immediately after approval:');
  const credsRawAfterApprove = fs.readFileSync('./data/journalist_credentials.json', 'utf8');
  const credsAfterApprove = JSON.parse(credsRawAfterApprove);

  const matchedKeysAfterApprove = keysChecked.filter(k => !!credsAfterApprove[k]);
  console.log(`  - هل credential ما زالت موجودة بنفس الحساب؟: ${matchedKeysAfterApprove.length > 0 ? 'true' : 'false'}`);
  console.log(`  - المفاتيح الموجودة بعد الاعتماد:`, matchedKeysAfterApprove);
  matchedKeysAfterApprove.forEach(k => {
    const val = credsAfterApprove[k];
    console.log(`    Key [${k}]: len=${val?.length}, hash=${hash(val)}`);
  });

  // STEP 5: Login attempt from LoginModal flow
  console.log('\n[STEP 5] Testing Login using LoginModal flow (by Email)...');
  const loginEmailResp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: normalizedEmail,
      password: testPassword,
    }),
  });

  const loginEmailData = await loginEmailResp.json();
  console.log(`  Login by Email Status: ${loginEmailResp.status}`);
  console.log(`  Login by Email Success: ${loginEmailData.success}`);
  console.log(`  Login by Email Message: ${loginEmailData.message}`);

  console.log('\n[STEP 6] Testing Login using LoginModal flow (by Student ID)...');
  const loginIdResp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: normalizedStudentId,
      password: testPassword,
    }),
  });

  const loginIdData = await loginIdResp.json();
  console.log(`  Login by Student ID Status: ${loginIdResp.status}`);
  console.log(`  Login by Student ID Success: ${loginIdData.success}`);
  console.log(`  Login by Student ID Message: ${loginIdData.message}`);

  console.log('\n====================================================');
  console.log('TRACE SUMMARY & VERIFICATION OF POINTS A - H');
  console.log('====================================================');
}

runTrace().catch(console.error);
