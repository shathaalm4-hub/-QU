import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
import { getSupabaseServiceClient } from '../src/lib/supabaseServer.js';

const BASE_URL = 'http://localhost:3000';
const DB_FILE = './data/database.json';

async function main() {
  console.log('=== Step 7: Post-Restart Verification ===');

  const state = JSON.parse(fs.readFileSync('./scripts/test_state.json', 'utf8'));
  const { requestId, userId, testStudent, initialDbMd5 } = state;
  console.log(`Checking request ID: ${requestId}`);

  // 1. Query Supabase directly
  const supaClient = getSupabaseServiceClient();
  if (!supaClient) throw new Error('Supabase client not available');

  const { data: supaReq, error: supaReqErr } = await supaClient
    .from('accreditation_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (supaReqErr || !supaReq) {
    throw new Error(`Failed to find request in Supabase after restart: ${supaReqErr?.message}`);
  }

  console.log('Supabase check after restart:');
  console.log(`- ID: ${supaReq.id} (Matches expected: ${supaReq.id === requestId})`);
  console.log(`- Status: ${supaReq.status} (Matches expected 'approved': ${supaReq.status === 'approved'})`);
  console.log(`- User ID: ${supaReq.user_id}`);

  // 2. Query API /api/accreditation/requests/:id
  const apiRes = await fetch(`${BASE_URL}/api/accreditation/requests/${requestId}`, {
    headers: { 'x-admin-role': 'admin' },
  });
  const apiData: any = await apiRes.json();
  console.log('API /api/accreditation/requests/:id check:');
  console.log(`- HTTP Status: ${apiRes.status}`);
  console.log(`- Found in API: ${apiData.success}`);
  console.log(`- API Status: ${apiData.request?.status}`);

  if (!apiData.success || apiData.request?.status !== 'approved' || apiData.request?.id !== requestId) {
    throw new Error(`API verification failed: ${JSON.stringify(apiData)}`);
  }

  // 3. Query directory
  const jourRes = await fetch(`${BASE_URL}/api/journalists?status=approved`);
  const jourData: any = await jourRes.json();
  const inDirectory = (jourData.journalists || []).some((j: any) => j.id === userId || j.email === testStudent.email);
  console.log(`Appears in directory after restart: ${inDirectory}`);
  if (!inDirectory) throw new Error('Journalist not in approved directory after restart!');

  // 4. Test login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const loginData: any = await loginRes.json();
  console.log(`Login status after restart: HTTP ${loginRes.status}, user: ${loginData.user?.name}, status: ${loginData.user?.status}`);
  if (!loginData.success || loginData.user?.status !== 'approved') {
    throw new Error(`Login failed after restart: ${JSON.stringify(loginData)}`);
  }

  // 5. Verify database.json MD5
  const postRestartDbMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_FILE)).digest('hex');
  console.log(`Initial MD5: ${initialDbMd5}`);
  console.log(`Post-restart MD5: ${postRestartDbMd5}`);
  console.log(`Did database.json change? ${initialDbMd5 !== postRestartDbMd5 ? 'YES (DEFECT!)' : 'NO (INTACT)'}`);

  console.log('\nPost-restart verification PASSED!');
}

main().catch(err => {
  console.error('Post-restart verification FAILED:', err);
  process.exit(1);
});
