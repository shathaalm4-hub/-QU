import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_ROOT = path.join(DATA_DIR, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const PHASE0_BACKUP_DIR = path.join(BACKUP_ROOT, `phase0_pre_hardening_backup_${timestamp}`);

if (!fs.existsSync(BACKUP_ROOT)) {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
}
fs.mkdirSync(PHASE0_BACKUP_DIR, { recursive: true });

function getSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const dataFiles = [
  'database.json',
  'published_articles.json',
  'database.permanent.json',
  'database.backup.json',
  'approved_journalists.json',
  'approved_journalists.backup.json',
  'journalist_requests.json',
  'journalist_requests.backup.json',
  'published_articles.backup.json',
  'journalist_credentials.json',
  'deleted_users.json',
  'accreditation_audit_logs.json'
];

console.log('--- PHASE 0: BACKUP & INTEGRITY VERIFICATION ---');
console.log(`Backup Destination: ${PHASE0_BACKUP_DIR}\n`);

const checksumManifest: Record<string, { size: number; sha256: string; destination: string }> = {};

for (const fileName of dataFiles) {
  const sourcePath = path.join(DATA_DIR, fileName);
  if (fs.existsSync(sourcePath)) {
    const destPath = path.join(PHASE0_BACKUP_DIR, fileName);
    fs.copyFileSync(sourcePath, destPath);
    const stat = fs.statSync(sourcePath);
    const hash = getSha256(sourcePath);
    checksumManifest[fileName] = {
      size: stat.size,
      sha256: hash,
      destination: destPath
    };
    console.log(`✓ Backed up ${fileName} (${stat.size} bytes) - SHA256: ${hash}`);
  } else {
    console.log(`- File not present: ${fileName}`);
  }
}

// Write checksum manifest inside backup dir
fs.writeFileSync(
  path.join(PHASE0_BACKUP_DIR, 'checksum_manifest.json'),
  JSON.stringify(checksumManifest, null, 2),
  'utf-8'
);

// Count records across all entities
let totalArticles = 0;
let publishedArticles = 0;
let draftArticles = 0;
let approvedArticles = 0;
let underReviewArticles = 0;
let otherStatusArticles = 0;
let totalUsers = 0;
let totalJournalists = 0;
let totalRequests = 0;
let totalMedia = 0; // videos + albums + images
let videoReportsCount = 0;
let photoAlbumsCount = 0;
let articleMediaCount = 0;

const dbPath = path.join(DATA_DIR, 'database.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const articles: any[] = db.articles || [];
  totalArticles = articles.length;
  
  for (const art of articles) {
    if (art.status === 'published') publishedArticles++;
    else if (art.status === 'draft') draftArticles++;
    else if (art.status === 'approved') approvedArticles++;
    else if (art.status === 'under_review') underReviewArticles++;
    else otherStatusArticles++;

    if (art.mainImage) articleMediaCount++;
    if (Array.isArray(art.extraImages)) articleMediaCount += art.extraImages.length;
    if (Array.isArray(art.galleryImages)) articleMediaCount += art.galleryImages.length;
    if (art.videoUrl) articleMediaCount++;
  }

  const users: any[] = db.users || [];
  totalUsers = users.length;

  const journalists: any[] = users.filter((u: any) => u.role === 'journalist' || u.status === 'approved');
  totalJournalists = journalists.length;

  const requests: any[] = db.journalistRequests || [];
  totalRequests = requests.length;

  const videos: any[] = db.videoReports || [];
  videoReportsCount = videos.length;

  const albums: any[] = db.photoAlbums || [];
  photoAlbumsCount = albums.length;

  totalMedia = videoReportsCount + photoAlbumsCount + articleMediaCount;
}

// Check published_articles.json separately
const pubPath = path.join(DATA_DIR, 'published_articles.json');
let dedicatedPublishedCount = 0;
if (fs.existsSync(pubPath)) {
  const pubs = JSON.parse(fs.readFileSync(pubPath, 'utf-8'));
  if (Array.isArray(pubs)) dedicatedPublishedCount = pubs.length;
}

const statsSummary = {
  timestamp: new Date().toISOString(),
  counts: {
    totalArticles,
    publishedArticles,
    draftArticles,
    approvedArticles,
    underReviewArticles,
    otherStatusArticles,
    dedicatedPublishedArticlesJsonCount: dedicatedPublishedCount,
    totalUsers,
    totalJournalists,
    totalAccreditationRequests: totalRequests,
    videoReportsCount,
    photoAlbumsCount,
    articleMediaCount,
    totalMedia
  }
};

fs.writeFileSync(
  path.join(PHASE0_BACKUP_DIR, 'stats_summary.json'),
  JSON.stringify(statsSummary, null, 2),
  'utf-8'
);

console.log('\n--- PHASE 0 RECORD COUNTS ---');
console.log(JSON.stringify(statsSummary, null, 2));
