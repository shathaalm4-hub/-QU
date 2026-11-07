import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('=== STARTING VERIFICATION TESTS ===\n');

  // 1. Verify Unregistered User (404)
  console.log('Test 1: Unregistered User');
  const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_user_999@qu.edu.sa', password: 'AnyPassword123' }),
  });
  const data1: any = await res1.json();
  console.log(`Status: ${res1.status}, Message: ${data1.message}`);
  if (res1.status !== 404) throw new Error(`Expected 404, got ${res1.status}`);
  console.log('✔ Test 1 Passed\n');

  // 2. Register New Student with their chosen password
  const uniqueNum = Date.now().toString().slice(-6);
  const testStudent = {
    name: `صحفي تجريبي ${uniqueNum}`,
    email: `student.test.${uniqueNum}@qu.edu.sa`,
    studentId: `44${uniqueNum}`,
    password: 'MyChosenPassword@2026',
    major: 'إعلام واتصال',
    academicLevel: 'السنة الرابعة',
    skills: ['الصحافة الاستقصائية'],
    bio: 'حساب تجريبي للتحقق من كلمة المرور',
  };

  console.log(`Test 2: Register New Student Journalist with chosen password: ${testStudent.password}`);
  const regRes = await fetch(`${BASE_URL}/api/journalists/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testStudent),
  });
  const regData: any = await regRes.json();
  console.log(`Status: ${regRes.status}, Success: ${regData.success}`);
  if (!regData.success) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  const requestId = regData.request?.id;
  const userId = regData.request?.userId;
  console.log(`Registered Request ID: ${requestId}, User ID: ${userId}`);
  console.log('✔ Registration Succeeded\n');

  // 3. Pending Account Login Attempt (Rule 1: should be 403 pending)
  console.log('Test 3: Attempt Login While Status is Pending (Rule 1)');
  const pendingLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const pendingData: any = await pendingLoginRes.json();
  console.log(`Status: ${pendingLoginRes.status}, Message: ${pendingData.message}`);
  if (pendingLoginRes.status !== 403) {
    throw new Error(`Expected 403 for pending account, got ${pendingLoginRes.status}: ${JSON.stringify(pendingData)}`);
  }
  if (!pendingData.message.includes('قيد المراجعة')) {
    throw new Error(`Expected pending review message, got: ${pendingData.message}`);
  }
  if (JSON.stringify(pendingData).includes('التواصل مع إدارة التحرير')) {
    throw new Error(`Forbidden message returned! ${JSON.stringify(pendingData)}`);
  }
  console.log('✔ Test 3 Passed: Pending login properly blocked with 403\n');

  // 4. Approve Account
  console.log('Test 4: Editorial Management Approves the Journalist Request');
  // First login as admin to get token
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qu.edu.sa', password: 'Admin@QU2026' }),
  });
  const adminData: any = await adminLoginRes.json();
  if (!adminData.success) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  const adminToken = adminData.token;

  const approveRes = await fetch(`${BASE_URL}/api/accreditation/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  const approveData: any = await approveRes.json();
  console.log(`Status: ${approveRes.status}, Success: ${approveData.success}`);
  if (!approveData.success) throw new Error(`Approval failed: ${JSON.stringify(approveData)}`);
  console.log('✔ Test 4 Passed: Account Approved\n');

  // 5. Approved Account Logs In with Chosen Password (Rule 2: Direct Login)
  console.log('Test 5: Approved Journalist Logs In with Original Chosen Password (Rule 2 & 4)');
  const approvedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const approvedData: any = await approvedLoginRes.json();
  console.log(`Status: ${approvedLoginRes.status}, Success: ${approvedData.success}, User Role: ${approvedData.user?.role}`);
  if (approvedLoginRes.status !== 200 || !approvedData.success || !approvedData.token) {
    throw new Error(`Expected 200 OK login, got ${approvedLoginRes.status}: ${JSON.stringify(approvedData)}`);
  }
  if (approvedData.user?.role !== 'journalist') {
    throw new Error(`Expected role 'journalist', got '${approvedData.user?.role}'`);
  }
  console.log('✔ Test 5 Passed: Journalist logged in immediately without editorial password setup!\n');

  // 6. Approved Account Logs In with Wrong Password (Rule 5: 401 incorrect password)
  console.log('Test 6: Approved Journalist Attempts Login with WRONG Password (Rule 5)');
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: 'WrongPassword@999' }),
  });
  const wrongData: any = await wrongPassRes.json();
  console.log(`Status: ${wrongPassRes.status}, Message: ${wrongData.message}`);
  if (wrongPassRes.status !== 401 || wrongData.message !== 'كلمة المرور غير صحيحة') {
    throw new Error(`Expected 401 with 'كلمة المرور غير صحيحة', got ${wrongPassRes.status}: ${JSON.stringify(wrongData)}`);
  }
  console.log('✔ Test 6 Passed: Wrong password rejected with 401\n');

  // 7. Verify Existing Approved Journalists
  console.log('Test 7: Verify Existing Approved Journalists');
  // Shatha Al-Mutairi
  const shathaRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shathaaalm80@gmail.com', password: 'Shatha@QU2026' }),
  });
  const shathaData: any = await shathaRes.json();
  console.log(`Shatha Login: Status ${shathaRes.status}, Success: ${shathaData.success}`);
  if (shathaRes.status !== 200 || !shathaData.success) {
    throw new Error(`Shatha login failed: ${JSON.stringify(shathaData)}`);
  }

  // Fahad Al-Qahtani
  const fahadRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fahad_qahtani@qu.edu.sa', password: 'QU@442019882' }),
  });
  const fahadData: any = await fahadRes.json();
  console.log(`Fahad Login: Status ${fahadRes.status}, Success: ${fahadData.success}`);
  if (fahadRes.status !== 200 || !fahadData.success) {
    throw new Error(`Fahad login failed: ${JSON.stringify(fahadData)}`);
  }

  // Sultan Al-Nasser
  const sultanRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sultan.press.1789240024178@qu.edu.sa', password: 'TestPassword@2026' }),
  });
  const sultanData: any = await sultanRes.json();
  console.log(`Sultan Login: Status ${sultanRes.status}, Success: ${sultanData.success}`);
  if (sultanRes.status !== 200 || !sultanData.success) {
    throw new Error(`Sultan login failed: ${JSON.stringify(sultanData)}`);
  }
  console.log('✔ Test 7 Passed: All existing approved journalists can log in with their preserved passwords!\n');

  // 8. Verify Archived/Deleted User Cannot Log In (Rule 3)
  console.log('Test 8: Verify Archived/Deleted User Cannot Log In (Rule 3)');
  const deletedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sultan_harbi@qu.edu.sa', password: 'AnyPassword@2026' }),
  });
  const deletedData: any = await deletedRes.json();
  console.log(`Deleted User Login: Status ${deletedRes.status}, Message: ${deletedData.message}`);
  if (deletedRes.status !== 403) {
    throw new Error(`Expected 403 for deleted user, got ${deletedRes.status}: ${JSON.stringify(deletedData)}`);
  }
  console.log('✔ Test 8 Passed: Deleted user blocked\n');

  console.log('=== ALL TESTS PASSED WITH 100% SUCCESS ===');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
