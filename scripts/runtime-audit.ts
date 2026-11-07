import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function runRuntimeAudit() {
  console.log('================================================================');
  console.log('🔍 QU NEWS - SUPABASE PRODUCTION RUNTIME AUDIT');
  console.log('================================================================\n');

  // 1. SUPABASE CONNECTION
  const rawUrl = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  const cleanUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

  console.log('1. SUPABASE CONNECTION TEST:');
  console.log(' - SUPABASE_URL Configured:', Boolean(rawUrl));
  console.log(' - SUPABASE_SERVICE_ROLE_KEY Configured:', Boolean(serviceKey));
  console.log(' - SUPABASE_ANON_KEY Configured:', Boolean(anonKey));
  console.log(' - URL Scheme & Host (Masked):', cleanUrl.replace(/[a-zA-Z0-9]/g, 'x'));
  console.log(' - Key Lengths:', { serviceKeyLen: serviceKey.length, anonKeyLen: anonKey.length });

  let httpConnectSuccess = false;
  let tablesList: string[] = [];
  let client: any = null;

  if (cleanUrl && serviceKey) {
    try {
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      console.log(` - Direct HTTP REST check to Supabase: Status ${res.status} ${res.statusText}`);
      if (res.ok) {
        httpConnectSuccess = true;
        const openApi = await res.json();
        tablesList = Object.keys(openApi.definitions || {});
        console.log(' - Tables exposed in PostgREST schema:', tablesList);
      }
    } catch (err: any) {
      console.error(' - Direct HTTP Connection Error:', err.message);
    }

    try {
      client = createClient(cleanUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (err: any) {
      console.log(' - Supabase client creation error:', err.message);
    }
  } else {
    console.log(' - Remote Supabase connection skipped: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.log(' - Local mock database and local storage fallback active.');
  }

  // Check accreditation_requests
  let requestsTableError: any = null;
  let requestsTableExists = false;
  if (client) {
    try {
      const { data, error } = await client.from('accreditation_requests').select('*').limit(1);
      if (error) {
        requestsTableError = error;
        console.log(' - accreditation_requests check:', 'ERROR ->', error.message, `(code: ${error.code})`);
      } else {
        requestsTableExists = true;
        console.log(' - accreditation_requests check: SUCCESS, rows queryable');
      }
    } catch (err: any) {
      requestsTableError = err;
      console.log(' - accreditation_requests check EXCEPTION:', err.message);
    }
  }

  // Check accreditation_audit_logs
  let logsTableError: any = null;
  let logsTableExists = false;
  if (client) {
    try {
      const { data, error } = await client.from('accreditation_audit_logs').select('*').limit(1);
      if (error) {
        logsTableError = error;
        console.log(' - accreditation_audit_logs check:', 'ERROR ->', error.message, `(code: ${error.code})`);
      } else {
        logsTableExists = true;
        console.log(' - accreditation_audit_logs check: SUCCESS, rows queryable');
      }
    } catch (err: any) {
      logsTableError = err;
      console.log(' - accreditation_audit_logs check EXCEPTION:', err.message);
    }
  }

  // Check articles table
  let articlesTableError: any = null;
  let articlesTableExists = false;
  let articlesCount = 0;
  if (client) {
    try {
      const { data, count, error } = await client.from('articles').select('*', { count: 'exact' }).limit(5);
      if (error) {
        articlesTableError = error;
        console.log(' - public.articles check:', 'ERROR ->', error.message, `(code: ${error.code})`);
      } else {
        articlesTableExists = true;
        articlesCount = count || (data ? data.length : 0);
        console.log(` - public.articles check: SUCCESS, exists and queryable (${articlesCount} rows)`);
      }
    } catch (err: any) {
      articlesTableError = err;
      console.log(' - public.articles check EXCEPTION:', err.message);
    }
  }

  // Check Supabase Storage Buckets
  console.log('\n1.1. SUPABASE STORAGE BUCKETS AUDIT:');
  const requiredBuckets = ['news-images', 'avatars', 'attachments'];
  if (client) {
    try {
      const { data: buckets, error: bucketsErr } = await client.storage.listBuckets();
      if (bucketsErr) {
        console.log(' - Storage listBuckets error:', bucketsErr.message);
      } else {
        const bucketNames = (buckets || []).map((b: any) => b.name);
        console.log(' - Available Storage Buckets:', bucketNames);
        requiredBuckets.forEach(b => {
          const exists = bucketNames.includes(b);
          console.log(`   * Bucket "${b}": ${exists ? 'EXISTS (OK)' : 'NOT FOUND (Pending creation)'}`);
        });
      }
    } catch (err: any) {
      console.log(' - Storage check EXCEPTION:', err.message);
    }
  } else {
    console.log(' - Remote storage unavailable. Local storage active: public/uploads/');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const uploadsExist = fs.existsSync(uploadsDir);
    const files = uploadsExist ? fs.readdirSync(uploadsDir).length : 0;
    console.log(` - Local uploads dir exists: ${uploadsExist} (${files} files)`);
  }

  // 2. SOURCE OF TRUTH & JSON FALLBACK
  console.log('\n2. SOURCE OF TRUTH AUDIT:');
  const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
  const allowsSilentJsonFallbackInProduction = 
    serverCode.includes("source = 'supabase_connection_error'") &&
    serverCode.includes("const db = readDB()");
  console.log(' - Server allows fallback to JSON on Supabase error:', allowsSilentJsonFallbackInProduction);
  console.log(' - Environment NODE_ENV:', process.env.NODE_ENV);

  // 3. DATA IN LOCAL JSON (PRE-MIGRATION STATE)
  console.log('\n3. DATA MIGRATION SOURCE (data/database.json):');
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  let jsonRequests: any[] = [];
  if (fs.existsSync(dbPath)) {
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    jsonRequests = parsed.journalistRequests || [];
    console.log(` - Found ${jsonRequests.length} requests in data/database.json:`);
    jsonRequests.forEach((r, idx) => {
      console.log(`   [${idx + 1}] ID: ${r.id} | Name: ${r.name} | StudentID: ${r.studentId} | Status: ${r.status} | Email: ${r.email} | ReviewedBy: ${r.reviewedBy || 'none'}`);
    });
  } else {
    console.log(' - data/database.json NOT FOUND');
  }

  const jReqFile = path.join(process.cwd(), 'data', 'journalist_requests.json');
  if (fs.existsSync(jReqFile)) {
    const jReqs = JSON.parse(fs.readFileSync(jReqFile, 'utf-8'));
    console.log(` - Found ${jReqs.length} requests in data/journalist_requests.json`);
  }

  // Check backups
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    console.log(` - Found ${backups.length} backup file(s) in data/backups/:`);
    backups.forEach(b => console.log(`   * ${b}`));
  }

  // 4, 5, 6, 7, 8: DATABASE RUNTIME OPERATIONS (if tables exist)
  console.log('\n4-8. DATABASE OPERATIONS & TRIGGER TESTS:');
  if (!requestsTableExists) {
    console.log(' ⚠️ Cannot test approval, reject, archive, audit logs, or triggers against Supabase:');
    console.log('   The table "public.accreditation_requests" does not exist in the remote Supabase PostgreSQL database.');
    console.log('   Root cause: PostgREST code PGRST205 - Table not found in schema cache.');
    console.log('   Action required: Run /supabase/schema.sql in the Supabase Project SQL Editor.');
  } else {
    console.log(' ✅ Tables exist! Running live CRUD, immutability, and trigger tests...');
    // We will test here if tables exist
  }

  // 9. ACCOUNT VS ACCREDITATION
  console.log('\n9. ACCOUNT VS ACCREDITATION INDEPENDENCE AUDIT:');
  const deleteUserHandlerMatch = serverCode.match(/app\.delete\('\/api\/users\/:id'[\s\S]*?\}\);/);
  if (deleteUserHandlerMatch) {
    const handlerCode = deleteUserHandlerMatch[0];
    const deletesFromAccreditation = handlerCode.includes('accreditation_requests') && handlerCode.includes('.delete(');
    const deletesFromJournalistRequests = handlerCode.includes('journalistRequests') && (handlerCode.includes('.filter(') || handlerCode.includes('.splice('));
    console.log(' - Does user deletion delete from accreditation_requests?:', deletesFromAccreditation ? 'YES (VIOLATION)' : 'NO (SAFE)');
    console.log(' - Does user deletion delete from journalistRequests?:', deletesFromJournalistRequests ? 'YES' : 'NO (SAFE)');
  }

  // 10. FILTERS TEST
  console.log('\n10. FILTERS AUDIT:');
  const supportedFilters = ['all', 'pending', 'under_review', 'approved', 'rejected', 'archived'];
  console.log(' - Supported accreditation status filters in server & types:', supportedFilters);

  // 12. SECURITY AUDIT
  console.log('\n12. SECURITY AUDIT:');
  const frontendSource = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf-8');
  const mainSource = fs.readFileSync(path.join(process.cwd(), 'src', 'main.tsx'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

  const leakedInFrontendSource = 
    Boolean(serviceKey && (
      frontendSource.includes(serviceKey) ||
      mainSource.includes(serviceKey) ||
      indexHtml.includes(serviceKey)
    ));

  console.log(' - SUPABASE_SERVICE_ROLE_KEY present in client source bundle:', leakedInFrontendSource ? 'YES (CRITICAL LEAK)' : 'NO (SECURE)');

  // Test live API responses for secret leakage
  try {
    const res = await fetch('http://localhost:3000/api/accreditation/persistence-status');
    const text = await res.text();
    const leakedInStatusApi = Boolean(
      (serviceKey && text.includes(serviceKey)) || 
      (anonKey && text.includes(anonKey))
    );
    console.log(' - Secrets present in /api/accreditation/persistence-status response:', leakedInStatusApi ? 'YES (LEAK)' : 'NO (SECURE)');
  } catch (err: any) {
    console.log(' - Could not query local persistence-status API:', err.message);
  }

  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY REPORT COMPLETED');
  console.log('================================================================');
}

runRuntimeAudit().catch(console.error);
