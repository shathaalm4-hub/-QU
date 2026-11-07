import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

async function runTrace() {
  const ts = Date.now();
  const testStudentId = '4499' + Math.floor(10000 + Math.random() * 90000);
  const testEmail = `trace.audit.${ts}@qu.edu.sa`;
  const testPassword = `UniqueTr@ceP@ss_${ts}!`;
  const testName = `صحفي فحص التتبع ${ts}`;

  console.log('====================================================');
  console.log('TRACE: Real-world Registration -> Approval -> Login');
  console.log('====================================================');
  console.log('Input Parameters:');
  console.log(' - Name:', testName);
  console.log(' - Email:', testEmail);
  console.log(' - Student ID:', testStudentId);
  console.log(' - Password Fingerprint (sha256:16):', sha256(testPassword));
  console.log(' - Password Length:', testPassword.length);
  console.log('----------------------------------------------------');

  // STEP 1: Registration from JoinJournalistModal (via HTTP POST /api/journalists/register)
  console.log('\n[STAGE 1] Emulating JoinJournalistModal form submission:');
  const regBody = {
    name: testName,
    studentId: testStudentId,
    email: testEmail,
    password: testPassword,
    major: 'صحافة ونشر رقمي',
    academicLevel: 'المستوى الأول',
    avatar: '',
    bio: 'سيرة ذاتية تجريبية للتتبع',
    skills: ['التحرير الصحفي', 'التصوير'],
  };

  const regRes = await fetch('http://localhost:3000/api/journalists/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regBody),
  });

  const regJson = await regRes.json();
  console.log(' - Registration HTTP Status:', regRes.status);
  console.log(' - Registration Success:', regJson.success);
  console.log(' - User ID assigned:', regJson.user?.id);
  console.log(' - Request ID assigned:', regJson.request?.id);
  console.log(' - Registration Message:', regJson.message);

  const userId = regJson.user?.id;
  const requestId = regJson.request?.id;

  // Inspect journalist_credentials.json directly on disk
  const credsPath = path.join(process.cwd(), 'data', 'journalist_credentials.json');
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

  const matchingKeys = Object.keys(creds).filter(
    (k) =>
      k === testEmail ||
      k === testStudentId ||
      k === userId ||
      k === requestId
  );

  console.log('\n[STAGE 2] Checking journalist_credentials.json immediately after registration:');
  console.log(' - Matching keys in credentials store:', matchingKeys);
  matchingKeys.forEach((key) => {
    const val = creds[key];
    console.log(`   Key [${key}] exists? ${Boolean(val)} | Length: ${val?.length} | Fingerprint: ${val ? sha256(val) : 'N/A'}`);
  });

  // STEP 2: Approval via Admin API (emulating approval from Management Dashboard)
  console.log('\n[STAGE 3] Emulating approval from Editorial Management:');
  // First login as admin to get token
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qu.edu.sa', password: 'Admin@QU2026' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  const approvalRes = await fetch(`http://localhost:3000/api/accreditation/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'approved',
      reviewerName: 'المشرف العام - إدارة التحرير',
    }),
  });
  const approvalJson = await approvalRes.json();
  console.log(' - Approval HTTP Status:', approvalRes.status);
  console.log(' - Approval Success:', approvalJson.success);
  console.log(' - Approval Message:', approvalJson.message);

  // Check journalist_credentials.json directly after approval
  const credsAfter = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const matchingKeysAfter = Object.keys(credsAfter).filter(
    (k) =>
      k === testEmail ||
      k === testStudentId ||
      k === userId ||
      k === requestId
  );
  console.log('\n[STAGE 4] Checking credentials store immediately after approval:');
  console.log(' - Matching keys in credentials store:', matchingKeysAfter);
  matchingKeysAfter.forEach((key) => {
    const val = credsAfter[key];
    console.log(`   Key [${key}] exists? ${Boolean(val)} | Length: ${val?.length} | Fingerprint: ${val ? sha256(val) : 'N/A'}`);
  });

  // Check what getUnifiedUsers returns internally via /api/users
  const usersRes = await fetch('http://localhost:3000/api/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersJson = await usersRes.json();
  const foundUserInList = (usersJson.users || []).find((u: any) => u.email === testEmail || u.studentId === testStudentId);
  console.log('\n[STAGE 5] Checking User in /api/users list:');
  console.log(' - User found in /api/users?', Boolean(foundUserInList));
  console.log(' - User status in /api/users:', foundUserInList?.status);
  console.log(' - User role in /api/users:', foundUserInList?.role);

  // STEP 3: Login via LoginModal (POST /api/auth/login) using Email
  console.log('\n[STAGE 6] Emulating LoginModal submission with Email:');
  const loginResEmail = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginJsonEmail = await loginResEmail.json();
  console.log(' - Login (Email) HTTP Status:', loginResEmail.status);
  console.log(' - Login (Email) Success:', loginJsonEmail.success);
  console.log(' - Login (Email) Message:', loginJsonEmail.message);
  console.log(' - Token received?', Boolean(loginJsonEmail.token));

  // STEP 4: Login via LoginModal using Student ID
  console.log('\n[STAGE 7] Emulating LoginModal submission with Student ID:');
  const loginResSid = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentId, password: testPassword }),
  });
  const loginJsonSid = await loginResSid.json();
  console.log(' - Login (Student ID) HTTP Status:', loginResSid.status);
  console.log(' - Login (Student ID) Success:', loginJsonSid.success);
  console.log(' - Login (Student ID) Message:', loginJsonSid.message);
  console.log(' - Token received?', Boolean(loginJsonSid.token));

  console.log('\n====================================================');
  console.log('TRACE COMPLETE');
  console.log('====================================================');
}

runTrace().catch(console.error);
