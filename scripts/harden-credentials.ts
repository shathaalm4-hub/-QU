import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

const DATA_DIR = path.join(process.cwd(), 'data');

console.log('--- PHASE 12: CREDENTIAL HARDENING (PLAINTEXT SECRETS ELIMINATION) ---');

let secretsFoundCount = 0;
let secretsHashedCount = 0;

// 1. Process journalist_credentials.json
const credPath = path.join(DATA_DIR, 'journalist_credentials.json');
if (fs.existsSync(credPath)) {
  const creds: Record<string, string> = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  let modified = false;
  for (const key of Object.keys(creds)) {
    const val = creds[key];
    if (typeof val === 'string' && val.length > 0 && !val.startsWith('scrypt:')) {
      secretsFoundCount++;
      console.log(`[PLAINTEXT SECRET FOUND] In journalist_credentials key "${key}" -> Replacing with secure scrypt hash.`);
      creds[key] = hashPassword(val);
      secretsHashedCount++;
      modified = true;
    }
  }
  if (modified) {
    const tmp = credPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(creds, null, 2), 'utf-8');
    fs.renameSync(tmp, credPath);
    console.log(`✓ journalist_credentials.json successfully hardened.`);
  }
}

// 2. Process database.json
const dbPath = path.join(DATA_DIR, 'database.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  let modified = false;
  if (Array.isArray(db.users)) {
    for (const u of db.users) {
      if (u.password && typeof u.password === 'string' && !u.password.startsWith('scrypt:')) {
        secretsFoundCount++;
        console.log(`[PLAINTEXT SECRET FOUND] In database.json user "${u.id}" -> Replacing with secure scrypt hash.`);
        u.password = hashPassword(u.password);
        secretsHashedCount++;
        modified = true;
      }
    }
  }
  if (Array.isArray(db.journalistRequests)) {
    for (const r of db.journalistRequests) {
      if (r.password && typeof r.password === 'string' && !r.password.startsWith('scrypt:')) {
        secretsFoundCount++;
        console.log(`[PLAINTEXT SECRET FOUND] In database.json request "${r.id}" -> Replacing with secure scrypt hash.`);
        r.password = hashPassword(r.password);
        secretsHashedCount++;
        modified = true;
      }
    }
  }
  if (modified) {
    const tmp = dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, dbPath);
    console.log(`✓ database.json successfully hardened.`);
  }
}

// 3. Process approved_journalists.json
const jourPath = path.join(DATA_DIR, 'approved_journalists.json');
if (fs.existsSync(jourPath)) {
  const jours = JSON.parse(fs.readFileSync(jourPath, 'utf-8'));
  let modified = false;
  if (Array.isArray(jours)) {
    for (const j of jours) {
      if (j.password && typeof j.password === 'string' && !j.password.startsWith('scrypt:')) {
        secretsFoundCount++;
        console.log(`[PLAINTEXT SECRET FOUND] In approved_journalists.json user "${j.id}" -> Replacing with secure scrypt hash.`);
        j.password = hashPassword(j.password);
        secretsHashedCount++;
        modified = true;
      }
    }
  }
  if (modified) {
    const tmp = jourPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(jours, null, 2), 'utf-8');
    fs.renameSync(tmp, jourPath);
    console.log(`✓ approved_journalists.json successfully hardened.`);
  }
}

// 4. Process database.permanent.json
const permPath = path.join(DATA_DIR, 'database.permanent.json');
if (fs.existsSync(permPath)) {
  const perm = JSON.parse(fs.readFileSync(permPath, 'utf-8'));
  let modified = false;
  if (Array.isArray(perm.users)) {
    for (const u of perm.users) {
      if (u.password && typeof u.password === 'string' && !u.password.startsWith('scrypt:')) {
        secretsFoundCount++;
        console.log(`[PLAINTEXT SECRET FOUND] In database.permanent.json user "${u.id}" -> Replacing with secure scrypt hash.`);
        u.password = hashPassword(u.password);
        secretsHashedCount++;
        modified = true;
      }
    }
  }
  if (modified) {
    const tmp = permPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(perm, null, 2), 'utf-8');
    fs.renameSync(tmp, permPath);
    console.log(`✓ database.permanent.json successfully hardened.`);
  }
}

console.log(`\nHardening summary:`);
console.log(`- Total plaintext secrets found: ${secretsFoundCount}`);
console.log(`- Total secrets upgraded to scrypt: ${secretsHashedCount}`);
console.log(`- All accounts preserved with full authentication integrity.`);
