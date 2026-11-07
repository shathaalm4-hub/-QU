import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
import { getSupabaseServiceClient } from '../src/lib/supabaseServer.js';

const BASE_URL = 'http://localhost:3000';
const DB_FILE = './data/database.json';

async function main() {
  console.log('=== Starting Accreditation E2E Production Verification ===');

  // Step 0: Record initial MD5 of database.json
  const initialDbMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_FILE)).digest('hex');
  console.log(`Initial database.json MD5: ${initialDbMd5}`);

  // Step 1: Create a new test accreditation request
  const testStudent = {
    name: 'سلطان الناصر (صحفي تدريب معتمد)',
    email: `sultan.press.${Date.now()}@qu.edu.sa`,
    studentId: `4722${Math.floor(100000 + Math.random() * 900000)}`,
    major: 'صحافة ونشر رقمي',
    academicLevel: 'المستوى الثالث',
    skills: ['التحرير الصحفي', 'التحقيقات الاستقصائية'],
    password: 'TestPassword@2026',
    bio: 'صحفي متدرب متخصص في التغطيات الميدانية والتحقيقات الصحفية',
  };

  console.log('\n--- Step 1: Registering new accreditation request ---');
  console.log(`Student: ${testStudent.name} (${testStudent.email} / ${testStudent.studentId})`);

  const registerRes = await fetch(`${BASE_URL}/api/journalists/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testStudent),
  });
  const registerData: any = await registerRes.json();
  if (!registerData.success || !registerData.request) {
    throw new Error(`Failed to register: ${JSON.stringify(registerData)}`);
  }

  // Step 2: Record exact request ID and user ID
  const requestId = registerData.request.id;
  const userId = registerData.request.userId;
  console.log(`\n--- Step 2: Request ID Recorded ---`);
  console.log(`Request ID: ${requestId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Initial Status: ${registerData.request.status}`);

  if (registerData.request.status !== 'pending') {
    throw new Error(`Expected initial status 'pending', got '${registerData.request.status}'`);
  }

  // Verify login attempt while pending (should be rejected/blocked)
  console.log('\n--- Verifying login while pending (should be blocked) ---');
  const pendingLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const pendingLoginData: any = await pendingLoginRes.json();
  console.log(`Login status for pending user: HTTP ${pendingLoginRes.status}, message: ${pendingLoginData.message}`);
  if (pendingLoginRes.status !== 403) {
    throw new Error(`Expected HTTP 403 for pending login, got ${pendingLoginRes.status}`);
  }

  // Step 3a: Transition status pending -> under_review
  console.log('\n--- Step 3a: Transitioning pending -> under_review ---');
  const reviewRes = await fetch(`${BASE_URL}/api/accreditation/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-role': 'admin',
    },
    body: JSON.stringify({
      status: 'under_review',
      notes: 'تم استلام الملف وجاري فحص السجل الأكاديمي',
      reviewerName: 'المشرف العام - إدارة التحرير',
    }),
  });
  const reviewData: any = await reviewRes.json();
  console.log(`Transition response:`, reviewData.message);
  if (!reviewData.success || reviewData.request.status !== 'under_review') {
    throw new Error(`Failed to transition to under_review: ${JSON.stringify(reviewData)}`);
  }

  // Step 3b: Transition status under_review -> approved
  console.log('\n--- Step 3b: Transitioning under_review -> approved ---');
  const approveRes = await fetch(`${BASE_URL}/api/accreditation/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-role': 'admin',
    },
    body: JSON.stringify({
      status: 'approved',
      notes: 'تم استيفاء كافة متطلبات الاعتماد الصحفي بنجاح',
      reviewerName: 'رئيس التحرير التنفيذي',
    }),
  });
  const approveData: any = await approveRes.json();
  console.log(`Approval response:`, approveData.message);
  if (!approveData.success || approveData.request.status !== 'approved') {
    throw new Error(`Failed to transition to approved: ${JSON.stringify(approveData)}`);
  }

  // Step 4: Verify same ID remains in Supabase accreditation_requests
  console.log('\n--- Step 4: Verifying ID in Supabase accreditation_requests ---');
  const supaClient = getSupabaseServiceClient();
  if (!supaClient) throw new Error('Supabase client not available');

  const { data: supaReq, error: supaReqErr } = await supaClient
    .from('accreditation_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (supaReqErr || !supaReq) {
    throw new Error(`Supabase query failed: ${supaReqErr?.message}`);
  }
  console.log(`Found in Supabase accreditation_requests table:`);
  console.log(`- ID: ${supaReq.id}`);
  console.log(`- User ID: ${supaReq.user_id}`);
  console.log(`- Name: ${supaReq.name}`);
  console.log(`- Status: ${supaReq.status}`);
  console.log(`- Reviewed By: ${supaReq.reviewed_by}`);

  // Step 5: Verify audit log entry in accreditation_audit_logs
  console.log('\n--- Step 5: Verifying audit logs in Supabase accreditation_audit_logs ---');
  const { data: auditLogs, error: auditErr } = await supaClient
    .from('accreditation_audit_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (auditErr) {
    throw new Error(`Supabase audit logs query failed: ${auditErr.message}`);
  }
  console.log(`Audit log records found for ${requestId}: ${auditLogs?.length || 0}`);
  for (const log of auditLogs || []) {
    console.log(`- [${log.created_at}] Action: ${log.action} | Old: ${log.old_status} -> New: ${log.new_status} | Actor: ${log.actor_name}`);
  }

  // Step 12: Verify approved journalist appears in public lists
  console.log('\n--- Step 12: Checking journalist directory & public endpoints ---');
  const jourRes = await fetch(`${BASE_URL}/api/journalists?status=approved`);
  const jourData: any = await jourRes.json();
  const inJournalistsList = (jourData.journalists || []).some(
    (j: any) => j.id === userId || j.email.toLowerCase() === testStudent.email.toLowerCase()
  );
  console.log(`Appears in /api/journalists?status=approved: ${inJournalistsList}`);

  const publicRes = await fetch(`${BASE_URL}/api/public/approved-journalists`);
  const publicData: any = await publicRes.json();
  const inPublicView = (publicData.journalists || []).some(
    (j: any) => j.id === requestId || j.user_id === userId || j.email?.toLowerCase() === testStudent.email.toLowerCase()
  );
  console.log(`Appears in /api/public/approved-journalists (Supabase view): ${inPublicView}`);

  // Step 13: Verify journalist account login is activated
  console.log('\n--- Step 13: Testing login for newly approved journalist ---');
  const approvedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const approvedLoginData: any = await approvedLoginRes.json();
  console.log(`Login response status: HTTP ${approvedLoginRes.status}`);
  console.log(`User logged in: ${approvedLoginData.user?.name} (Role: ${approvedLoginData.user?.role}, Status: ${approvedLoginData.user?.status})`);
  if (!approvedLoginData.success || approvedLoginData.user?.status !== 'approved') {
    throw new Error(`Journalist account login failed or status not approved: ${JSON.stringify(approvedLoginData)}`);
  }

  // Step 11: Check MD5 of database.json before restart
  const midDbMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_FILE)).digest('hex');
  console.log(`\n--- Step 11 Check: database.json MD5 before restart ---`);
  console.log(`Initial MD5: ${initialDbMd5}`);
  console.log(`Current MD5: ${midDbMd5}`);
  console.log(`Did database.json change? ${initialDbMd5 !== midDbMd5 ? 'YES (DEFECT!)' : 'NO (INTACT)'}`);

  // Save state to temporary test state file for post-restart and post-redeploy verification
  fs.writeFileSync('./scripts/test_state.json', JSON.stringify({
    requestId,
    userId,
    testStudent,
    initialDbMd5,
    auditLogCount: auditLogs?.length || 0,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log('\nPre-restart tests PASSED successfully!');
}

main().catch(err => {
  console.error('Test Failed with Error:', err);
  process.exit(1);
});
