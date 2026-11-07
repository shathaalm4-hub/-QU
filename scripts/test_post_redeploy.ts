import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
import { getSupabaseServiceClient } from '../src/lib/supabaseServer.js';

const BASE_URL = 'http://localhost:3000';
const DB_FILE = './data/database.json';

async function main() {
  console.log('=== Steps 9-13: Post-Redeploy Final Verification ===');

  const state = JSON.parse(fs.readFileSync('./scripts/test_state.json', 'utf8'));
  const { requestId, userId, testStudent, initialDbMd5 } = state;

  console.log(`Target Request ID: ${requestId}`);
  console.log(`Target User ID: ${userId}`);

  // Step 9: Read request again from API after redeploy
  console.log('\n--- Step 9: Reading request via API after redeploy ---');
  const apiRes = await fetch(`${BASE_URL}/api/accreditation/requests/${requestId}`, {
    headers: { 'x-admin-role': 'admin' },
  });
  const apiData: any = await apiRes.json();
  console.log(`API HTTP Status: ${apiRes.status}`);
  console.log(`API Response:`, JSON.stringify(apiData.request, null, 2));

  if (!apiData.success || apiData.request?.id !== requestId || apiData.request?.status !== 'approved') {
    throw new Error(`API Read verification failed after redeploy: ${JSON.stringify(apiData)}`);
  }

  // Step 10: Verify request is still in Supabase with same ID and status
  console.log('\n--- Step 10: Checking Supabase table after redeploy ---');
  const supaClient = getSupabaseServiceClient();
  if (!supaClient) throw new Error('Supabase client not available');

  const { data: supaReq, error: supaReqErr } = await supaClient
    .from('accreditation_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (supaReqErr || !supaReq) {
    throw new Error(`Failed to query Supabase after redeploy: ${supaReqErr?.message}`);
  }

  console.log(`Supabase Record Verification:`);
  console.log(`- Request ID: ${supaReq.id} (Matches: ${supaReq.id === requestId})`);
  console.log(`- Status: ${supaReq.status} (Matches: ${supaReq.status === 'approved'})`);
  console.log(`- User ID: ${supaReq.user_id}`);
  console.log(`- Student ID: ${supaReq.student_id}`);
  console.log(`- Name: ${supaReq.name}`);
  console.log(`- Reviewed By: ${supaReq.reviewed_by}`);
  console.log(`- Updated At: ${supaReq.updated_at}`);

  // Also verify audit logs persistence in Supabase
  const { data: auditLogs } = await supaClient
    .from('accreditation_audit_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  console.log(`Audit logs persisted in Supabase: ${auditLogs?.length || 0} entries`);
  for (const log of auditLogs || []) {
    console.log(`  * [${log.created_at}] Action: ${log.action} | Old: ${log.old_status} -> New: ${log.new_status} | Actor: ${log.actor_name}`);
  }

  // Step 11: Verify database.json has NOT changed
  console.log('\n--- Step 11: Verifying database.json integrity ---');
  const currentDbMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_FILE)).digest('hex');
  console.log(`Initial MD5: ${initialDbMd5}`);
  console.log(`Final MD5:   ${currentDbMd5}`);
  const isUntouched = initialDbMd5 === currentDbMd5;
  console.log(`Did database.json change? ${!isUntouched ? 'YES (DEFECT!)' : 'NO (INTACT 100%)'}`);
  if (!isUntouched) {
    throw new Error('database.json was modified during accreditation operations!');
  }

  // Step 12: Verify approved journalist appears in journalist directory
  console.log('\n--- Step 12: Verifying journalist directory ---');
  const jourRes = await fetch(`${BASE_URL}/api/journalists?status=approved`);
  const jourData: any = await jourRes.json();
  const foundInJour = (jourData.journalists || []).find((j: any) => j.id === userId || j.email === testStudent.email);

  const publicRes = await fetch(`${BASE_URL}/api/public/approved-journalists`);
  const publicData: any = await publicRes.json();
  const foundInPublic = (publicData.journalists || []).find((j: any) => j.id === requestId || j.user_id === userId);

  console.log(`Found in /api/journalists?status=approved: ${Boolean(foundInJour)} (Name: ${foundInJour?.name}, Status: ${foundInJour?.status})`);
  console.log(`Found in /api/public/approved-journalists: ${Boolean(foundInPublic)} (Name: ${foundInPublic?.name})`);

  if (!foundInJour || !foundInPublic) {
    throw new Error('Journalist did not appear in directory!');
  }

  // Step 13: Verify journalist account is activated
  console.log('\n--- Step 13: Verifying journalist account login & activation ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const loginData: any = await loginRes.json();
  console.log(`Login HTTP Status: ${loginRes.status}`);
  console.log(`Login message: ${loginData.message}`);
  console.log(`User Profile:`, {
    id: loginData.user?.id,
    name: loginData.user?.name,
    role: loginData.user?.role,
    status: loginData.user?.status,
    major: loginData.user?.major,
  });

  if (!loginData.success || loginData.user?.status !== 'approved' || loginData.user?.role !== 'journalist') {
    throw new Error(`Account activation failed: ${JSON.stringify(loginData)}`);
  }

  console.log('\n======================================================');
  console.log('ALL 13 VERIFICATION STEPS COMPLETED AND PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Post-redeploy verification FAILED:', err);
  process.exit(1);
});
