import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING 14 MANDATORY TESTS FOR PASSWORD LIFECYCLE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(num: number, title: string, ok: boolean, details?: any) {
    if (ok) {
      console.log(`✅ TEST ${num}: ${title} - PASSED`);
      if (details) console.log(`   Details:`, details);
      passed++;
    } else {
      console.error(`❌ TEST ${num}: ${title} - FAILED`);
      if (details) console.error(`   Details:`, details);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail = `journalist.test.${timestamp}@qu.edu.sa`;
  const testStudentId = `44${String(timestamp).slice(-7)}`;
  const chosenPassword = `StrongP@ssw0rd_${timestamp}`;
  let registeredUserId = '';
  let registeredRequestId = '';

  // -------------------------------------------------------------
  // TEST 1: Register new journalist with chosen password
  // -------------------------------------------------------------
  try {
    const regRes = await fetch(`${BASE_URL}/api/journalists/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `صحفي تجريبي ${timestamp}`,
        email: testEmail,
        studentId: testStudentId,
        password: chosenPassword,
        major: 'صحافة وإعلام',
        academicLevel: 'المستوى الرابع',
        bio: 'مختبر جودة الاعتماد',
      }),
    });
    const regData = await regRes.json();
    registeredUserId = regData.user?.id || '';
    registeredRequestId = regData.user?.requestId || `req-${registeredUserId}`;
    report(1, 'Register new journalist with chosen password', regRes.ok && regData.success, {
      status: regRes.status,
      userId: registeredUserId,
      email: testEmail,
    });
  } catch (err: any) {
    report(1, 'Register new journalist with chosen password', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Verify password immediately saved in journalist_credentials.json
  // -------------------------------------------------------------
  try {
    const credsPath = path.join(process.cwd(), 'data', 'journalist_credentials.json');
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const savedByEmail = creds[testEmail.toLowerCase()];
    const savedByStudentId = creds[testStudentId];
    const savedByUserId = creds[registeredUserId];
    const isSavedCorrectly =
      savedByEmail === chosenPassword &&
      savedByStudentId === chosenPassword &&
      savedByUserId === chosenPassword;

    report(2, 'Verify password in journalist_credentials.json across identifiers', isSavedCorrectly, {
      savedByEmail: Boolean(savedByEmail),
      savedByStudentId: Boolean(savedByStudentId),
      savedByUserId: Boolean(savedByUserId),
      passwordsMatch: isSavedCorrectly,
    });
  } catch (err: any) {
    report(2, 'Verify password in journalist_credentials.json', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Login while pending returns HTTP 403 (pending status guard)
  // -------------------------------------------------------------
  try {
    const loginPendingRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: chosenPassword,
      }),
    });
    const pendingData = await loginPendingRes.json();
    report(
      3,
      'Login while pending returns HTTP 403 (guard against unapproved login)',
      loginPendingRes.status === 403,
      { status: loginPendingRes.status, message: pendingData.message }
    );
  } catch (err: any) {
    report(3, 'Login while pending returns HTTP 403', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Approve journalist via /api/accreditation/requests/:id/status
  // -------------------------------------------------------------
  let approveSuccess = false;
  try {
    // 1. Log in as admin to get auth token
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@qu.edu.sa', password: 'Admin@QU2026' }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    const approveRes = await fetch(
      `${BASE_URL}/api/accreditation/requests/${registeredRequestId}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'x-admin-role': 'admin',
        },
        body: JSON.stringify({
          status: 'approved',
          reviewerName: 'المشرف العام - إدارة التحرير',
        }),
      }
    );
    const approveData = await approveRes.json();
    approveSuccess = approveRes.ok && approveData.success;
    report(4, 'Approve journalist via /api/accreditation/requests/:id/status', approveSuccess, {
      status: approveRes.status,
      message: approveData.message,
    });
  } catch (err: any) {
    report(4, 'Approve journalist via status endpoint', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Verify journalist status is now 'approved' in Supabase
  // -------------------------------------------------------------
  try {
    const checkRes = await fetch(`${BASE_URL}/api/accreditation/requests?status=all`, {
      headers: {
        'x-admin-role': 'admin',
      },
    });
    const checkData = await checkRes.json();
    const reqList = checkData.requests || checkData.data || [];
    const reqFound = reqList.find(
      (r: any) => r.email?.toLowerCase() === testEmail.toLowerCase()
    );
    const isApproved = reqFound && reqFound.status === 'approved';
    report(5, "Verify journalist status is 'approved' in Supabase", isApproved, {
      status: checkRes.status,
      found: Boolean(reqFound),
      accreditationStatus: reqFound?.status,
    });
  } catch (err: any) {
    report(5, "Verify journalist status is 'approved'", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: Verify journalist_credentials.json STILL contains exact password (not undefined)
  // -------------------------------------------------------------
  try {
    const credsPath = path.join(process.cwd(), 'data', 'journalist_credentials.json');
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const savedPass = creds[testEmail.toLowerCase()];
    const isPreserved = savedPass === chosenPassword && savedPass !== undefined;
    report(
      6,
      'Verify journalist_credentials.json STILL contains exact password post-approval',
      isPreserved,
      { preserved: isPreserved, isUndefined: savedPass === undefined }
    );
  } catch (err: any) {
    report(6, 'Verify journalist_credentials.json post-approval', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 7: Verify internal unified users contains chosen password
  // -------------------------------------------------------------
  try {
    // Testing login verifies internal credential resolution without exposing credentials in public API
    const loginTestRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: chosenPassword,
      }),
    });
    const loginData = await loginTestRes.json();
    report(
      7,
      'Unified users resolution retains password and permits login',
      loginTestRes.ok && Boolean(loginData.token),
      {
        status: loginTestRes.status,
        hasToken: Boolean(loginData.token),
        userName: loginData.user?.name,
      }
    );
  } catch (err: any) {
    report(7, 'Unified users resolution retains password', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 8: Verify journalist can log in successfully with chosen password (HTTP 200 + token)
  // -------------------------------------------------------------
  let authToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: chosenPassword,
      }),
    });
    const data = await loginRes.json();
    authToken = data.token || '';
    const success = loginRes.status === 200 && Boolean(authToken) && data.user?.role === 'journalist';
    report(8, 'Journalist logs in with chosen registration password (HTTP 200 + JWT)', success, {
      status: loginRes.status,
      tokenReceived: Boolean(authToken),
      userRole: data.user?.role,
      userStatus: data.user?.status,
    });
  } catch (err: any) {
    report(8, 'Journalist logs in with chosen password', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 9: Verify wrong password returns HTTP 401
  // -------------------------------------------------------------
  try {
    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword!2026',
      }),
    });
    report(9, 'Wrong password returns HTTP 401 Unauthorized', wrongPassRes.status === 401, {
      status: wrongPassRes.status,
    });
  } catch (err: any) {
    report(9, 'Wrong password returns HTTP 401', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 10: Preserves exact password string (with special characters/spaces)
  // -------------------------------------------------------------
  try {
    const complexTimestamp = Date.now() + 1;
    const complexEmail = `complex.test.${complexTimestamp}@qu.edu.sa`;
    const complexPass = `P@ss w0rd!#$ &*()_+ ${complexTimestamp}`;

    const regComplex = await fetch(`${BASE_URL}/api/journalists/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `صحفي مركب ${complexTimestamp}`,
        email: complexEmail,
        studentId: `44${String(complexTimestamp).slice(-7)}`,
        password: complexPass,
        major: 'إذاعة وتلفزيون',
      }),
    });
    const complexData = await regComplex.json();
    const credsPath = path.join(process.cwd(), 'data', 'journalist_credentials.json');
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const storedComplex = creds[complexEmail.toLowerCase()];
    const exactMatch = storedComplex === complexPass;

    report(10, 'Preserve exact password string with special characters and spaces', exactMatch, {
      exactMatch,
      storedMatchesInput: storedComplex === complexPass,
    });
  } catch (err: any) {
    report(10, 'Preserve exact password string', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 11: Profile edit / sync does not wipe existing password
  // -------------------------------------------------------------
  try {
    const updateRes = await fetch(`${BASE_URL}/api/users/${registeredUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        bio: 'سيرة ذاتية محدثة دون لمس كلمة المرور',
      }),
    });
    const updateData = await updateRes.json();

    // Verify login still works with original password
    const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: chosenPassword,
      }),
    });
    const reLoginOk = reLoginRes.status === 200;

    report(11, 'Profile update does not wipe password (login remains valid)', reLoginOk, {
      profileUpdateStatus: updateRes.status,
      reLoginStatus: reLoginRes.status,
    });
  } catch (err: any) {
    report(11, 'Profile update does not wipe password', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 12: Existing approved journalists can still log in
  // -------------------------------------------------------------
  try {
    // 1. Shatha Al-Mutairi
    const shathaRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'shathaaalm80@gmail.com',
        password: 'Shatha@QU2026',
      }),
    });
    const shathaOk = shathaRes.status === 200;

    // 2. Fahad Al-Qahtani
    const fahadRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fahad_qahtani@qu.edu.sa',
        password: 'QU@442019882',
      }),
    });
    const fahadOk = fahadRes.status === 200;

    report(
      12,
      'Existing approved journalists (Shatha, Fahad) can log in with preserved passwords',
      shathaOk && fahadOk,
      { shathaStatus: shathaRes.status, fahadStatus: fahadRes.status }
    );
  } catch (err: any) {
    report(12, 'Existing approved journalists can log in', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 13: Core staff (Admin, Editor) can still log in
  // -------------------------------------------------------------
  try {
    // Admin
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@qu.edu.sa',
        password: 'Admin@QU2026',
      }),
    });
    const adminOk = adminRes.status === 200;

    // Editor
    const editorRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'editor@qu.edu.sa',
        password: 'Editor@QU2026',
      }),
    });
    const editorOk = editorRes.status === 200;

    report(
      13,
      'Core staff (Admin, Editor) can log in with designated passwords',
      adminOk && editorOk,
      { adminStatus: adminRes.status, editorStatus: editorRes.status }
    );
  } catch (err: any) {
    report(13, 'Core staff can log in', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 14: Deleted users blocked and passwords never leaked in public endpoints
  // -------------------------------------------------------------
  try {
    // 1. Check public users endpoint
    const usersRes = await fetch(`${BASE_URL}/api/users`);
    const usersData = await usersRes.json();
    const leakedInUsers = (usersData.users || []).some(
      (u: any) => u.password !== undefined && u.password !== null
    );

    // 2. Check public journalists endpoint
    const jourRes = await fetch(`${BASE_URL}/api/journalists`);
    const jourData = await jourRes.json();
    const leakedInJournalists = (jourData.journalists || []).some(
      (j: any) => j.password !== undefined && j.password !== null
    );

    // 3. Attempt login with deleted user if any
    const deletedList = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'deleted_users.json'), 'utf-8')
    );
    let deletedBlocked = true;
    if (deletedList.length > 0) {
      const delUser = deletedList[0];
      const delRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: delUser,
          password: 'AnyPassword@2026',
        }),
      });
      deletedBlocked = delRes.status === 403 || delRes.status === 404;
    }

    const test14Ok = !leakedInUsers && !leakedInJournalists && deletedBlocked;
    report(
      14,
      'Security: No passwords leaked in public endpoints and deleted accounts blocked',
      test14Ok,
      {
        leakedInUsers,
        leakedInJournalists,
        deletedBlocked,
      }
    );
  } catch (err: any) {
    report(14, 'Security check on passwords and deleted accounts', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
