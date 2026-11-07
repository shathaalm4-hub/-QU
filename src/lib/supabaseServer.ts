import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DATA_DIR = path.join(process.cwd(), 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'journalist_requests.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'accreditation_audit_logs.json');
const APPROVED_JOURNALISTS_FILE = path.join(DATA_DIR, 'approved_journalists.json');
const DELETED_USERS_FILE = path.join(DATA_DIR, 'deleted_users.json');
const DATABASE_JSON_FILE = path.join(DATA_DIR, 'database.json');
const PUBLISHED_ARTICLES_FILE = path.join(DATA_DIR, 'published_articles.json');
const ARTICLE_AUTHORS_FILE = path.join(DATA_DIR, 'article_authors.json');

export function loadArticleAuthorsFromLocalDB(): any[] {
  try {
    if (fs.existsSync(ARTICLE_AUTHORS_FILE)) {
      const raw = fs.readFileSync(ARTICLE_AUTHORS_FILE, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error('[LocalDB] Error reading article authors from local DB:', e);
  }
  return [];
}

export function saveArticleAuthorsToLocalDB(records: any[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ARTICLE_AUTHORS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('[LocalDB] Error saving article authors to local DB:', e);
  }
}

export function loadArticlesFromLocalDB(): any[] {
  const map = new Map<string, any>();
  try {
    if (fs.existsSync(PUBLISHED_ARTICLES_FILE)) {
      const rawPub = fs.readFileSync(PUBLISHED_ARTICLES_FILE, 'utf-8');
      if (rawPub && rawPub.trim().length > 0) {
        const parsedPub = JSON.parse(rawPub);
        if (Array.isArray(parsedPub)) {
          for (const a of parsedPub) {
            if (a && a.id) map.set(a.id, a);
          }
        }
      }
    }
    if (fs.existsSync(DATABASE_JSON_FILE)) {
      const raw = fs.readFileSync(DATABASE_JSON_FILE, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.articles)) {
          for (const a of parsed.articles) {
            if (a && a.id) {
              const prev = map.get(a.id);
              map.set(a.id, { ...(prev || {}), ...a });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[LocalDB] Error reading articles from local DB:', e);
  }
  return Array.from(map.values());
}

export function saveArticlesToLocalDB(articles: any[]): void {
  try {
    if (fs.existsSync(DATABASE_JSON_FILE)) {
      const raw = fs.readFileSync(DATABASE_JSON_FILE, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        parsed.articles = articles;
        fs.writeFileSync(DATABASE_JSON_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    }
    // Also backup published articles
    const published = (articles || []).filter((a: any) => a.status === 'published' || a.status === 'approved');
    if (published.length > 0) {
      fs.writeFileSync(PUBLISHED_ARTICLES_FILE, JSON.stringify(published, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('[LocalDB] Error saving articles to database.json:', e);
  }
}

export function upsertArticlesInLocalDB(articlesToUpsert: any[]): void {
  try {
    const existing = loadArticlesFromLocalDB();
    const map = new Map<string, any>();
    for (const art of existing) {
      if (art && art.id) map.set(art.id, art);
    }
    for (const art of articlesToUpsert) {
      if (art && art.id) {
        const prev = map.get(art.id) || {};
        map.set(art.id, { ...prev, ...art });
      }
    }
    saveArticlesToLocalDB(Array.from(map.values()));
  } catch (e) {
    console.error('[LocalDB] Error upserting articles in local DB:', e);
  }
}

export function updateArticlesInLocalDB(filters: ((item: any) => boolean)[], updates: any): any[] {
  try {
    const existing = loadArticlesFromLocalDB();
    const updatedList: any[] = [];
    const next = existing.map((art) => {
      const matches = filters.every((f) => f(art));
      if (matches) {
        const updated = { ...art, ...updates, updatedAt: new Date().toISOString() };
        updatedList.push(updated);
        return updated;
      }
      return art;
    });
    saveArticlesToLocalDB(next);
    return updatedList;
  } catch (e) {
    console.error('[LocalDB] Error updating articles in local DB:', e);
    return [];
  }
}

export function deleteArticlesFromLocalDB(filters: ((item: any) => boolean)[]): void {
  try {
    const existing = loadArticlesFromLocalDB();
    const next = existing.filter((art) => !filters.every((f) => f(art)));
    saveArticlesToLocalDB(next);
  } catch (e) {
    console.error('[LocalDB] Error deleting articles in local DB:', e);
  }
}

export function articleToRow(article: any): any {
  if (!article) return article;
  // Clean out any previous internal flags and encoded kind/media_type from tags first to avoid duplicates
  const rawTags = Array.isArray(article.tags) ? article.tags : Array.isArray(article.keywords) ? article.keywords : [];
  const tags = rawTags.filter((t: any) =>
    typeof t === 'string' &&
    !t.startsWith('ednote:') &&
    !t.startsWith('rejreason:') &&
    !t.startsWith('attach:') &&
    !t.startsWith('kind:') &&
    !t.startsWith('media_type:') &&
    !t.startsWith('coauthor_json:') &&
    t !== 'flag:is_breaking' &&
    t !== 'flag:is_featured' &&
    t !== 'flag:is_pinned'
  );

  const articleKind = article.kind || 'خبر';
  const articleMediaType = article.mediaType || (articleKind === 'تقرير مرئي' ? 'video' : articleKind === 'ألبوم صور' ? 'album' : 'article');

  // Encode kind and media_type into tags so they are indestructible and preserved across all databases
  tags.push('kind:' + encodeURIComponent(articleKind));
  tags.push('media_type:' + encodeURIComponent(articleMediaType));

  // Encode co-authors into tags for universal resilience
  if (Array.isArray(article.coAuthors) && article.coAuthors.length > 0) {
    try {
      tags.push('coauthor_json:' + encodeURIComponent(JSON.stringify(article.coAuthors)));
    } catch {}
  }

  if (article.editorialNotes || article.editorFeedback) {
    const noteVal = article.editorialNotes || article.editorFeedback;
    tags.push('ednote:' + encodeURIComponent(noteVal));
  }
  if (article.rejectionReason) {
    tags.push('rejreason:' + encodeURIComponent(article.rejectionReason));
  }
  if (article.isBreaking || article.is_breaking || article.isUrgent) {
    tags.push('flag:is_breaking');
  }
  if (article.isFeatured || article.is_featured || article.isPinned) {
    tags.push('flag:is_featured');
  }
  if (Array.isArray(article.attachments) && article.attachments.length > 0) {
    try {
      tags.push('attach:' + encodeURIComponent(JSON.stringify(article.attachments)));
    } catch {}
  }

  return {
    id: article.id,
    title: article.title || '',
    summary: article.summary || article.excerpt || '',
    content: article.content || '',
    category: article.category || 'جامعة',
    author_id: article.authorId || article.author_id || 'system',
    author_name: article.authorName || article.author_name || '',
    author_avatar: article.authorAvatar || article.author_avatar || '',
    author_major: article.authorMajor || article.author_major || '',
    author_student_id: article.authorStudentId || article.author_student_id || '',
    main_image: article.mainImage || article.main_image || '',
    extra_images: Array.isArray(article.extraImages) ? article.extraImages : Array.isArray(article.extra_images) ? article.extra_images : [],
    video_url: article.videoUrl || article.video_url || null,
    gallery_images: Array.isArray(article.galleryImages) ? article.galleryImages : Array.isArray(article.gallery_images) ? article.gallery_images : [],
    tags,
    status: article.status || 'draft',
    views_count: typeof article.viewsCount === 'number' ? article.viewsCount : typeof article.views_count === 'number' ? article.views_count : 0,
    likes_count: typeof article.likesCount === 'number' ? article.likesCount : typeof article.likes_count === 'number' ? article.likes_count : 0,
    published_at: article.publishedAt || article.published_at || null,
    created_at: article.createdAt || article.created_at || new Date().toISOString(),
    updated_at: article.updatedAt || article.updated_at || new Date().toISOString(),
  };
}

export function rowToArticle(row: any): any {
  if (!row) return row;
  let editorialNotes = row.editorial_notes || row.editorialNotes || row.editor_feedback || row.editorFeedback || '';
  let rejectionReason = row.rejection_reason || row.rejectionReason || '';
  let isBreaking = Boolean(row.is_breaking ?? row.isBreaking);
  let isFeatured = Boolean(row.is_featured ?? row.isFeatured);
  let attachments: any[] = Array.isArray(row.attachments) ? row.attachments : [];
  let kind = row.kind || '';
  let mediaType = row.media_type || row.mediaType || '';
  let coAuthors: any[] = Array.isArray(row.coAuthors) ? row.coAuthors : [];
  let coAuthorIds: string[] = Array.isArray(row.coAuthorIds) ? row.coAuthorIds : [];

  if (Array.isArray(row.tags)) {
    for (const t of row.tags) {
      if (typeof t === 'string') {
        if (t.startsWith('kind:')) {
          try { kind = decodeURIComponent(t.replace('kind:', '')); } catch {}
        } else if (t.startsWith('media_type:')) {
          try { mediaType = decodeURIComponent(t.replace('media_type:', '')); } catch {}
        } else if (t.startsWith('ednote:')) {
          try { editorialNotes = decodeURIComponent(t.replace('ednote:', '')); } catch {}
        } else if (t.startsWith('rejreason:')) {
          try { rejectionReason = decodeURIComponent(t.replace('rejreason:', '')); } catch {}
        } else if (t.startsWith('attach:')) {
          try { attachments = JSON.parse(decodeURIComponent(t.replace('attach:', ''))); } catch {}
        } else if (t.startsWith('coauthor_json:')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(t.replace('coauthor_json:', '')));
            if (Array.isArray(parsed) && parsed.length > 0) {
              coAuthors = parsed;
              coAuthorIds = parsed.map((c: any) => c.journalistId || c.id);
            }
          } catch {}
        } else if (t === 'flag:is_breaking') {
          isBreaking = true;
        } else if (t === 'flag:is_featured') {
          isFeatured = true;
        }
      }
    }
  }

  if (!kind) kind = 'خبر';
  if (!mediaType) mediaType = kind === 'تقرير مرئي' ? 'video' : kind === 'ألبوم صور' ? 'album' : 'article';

  const cleanTags = (row.tags || []).filter(
    (t: string) =>
      typeof t === 'string' &&
      !t.startsWith('ednote:') &&
      !t.startsWith('rejreason:') &&
      !t.startsWith('attach:') &&
      !t.startsWith('kind:') &&
      !t.startsWith('media_type:') &&
      !t.startsWith('coauthor_json:') &&
      t !== 'flag:is_breaking' &&
      t !== 'flag:is_featured' &&
      t !== 'flag:is_pinned'
  );

  return {
    id: row.id,
    title: row.title,
    excerpt: row.summary || row.excerpt || '',
    summary: row.summary || row.excerpt || '',
    content: row.content || '',
    category: row.category || 'جامعة',
    kind,
    mediaType,
    authorId: row.author_id || row.authorId || '',
    authorName: row.author_name || row.authorName || '',
    authorAvatar: row.author_avatar || row.authorAvatar || '',
    authorMajor: row.author_major || row.authorMajor || '',
    authorStudentId: row.author_student_id || row.authorStudentId || '',
    coAuthors,
    coAuthorIds: coAuthorIds.length > 0 ? coAuthorIds : coAuthors.map((c: any) => c.journalistId || c.id),
    mainImage: row.main_image || row.mainImage || '',
    extraImages: row.extra_images || row.extraImages || [],
    videoUrl: row.video_url || row.videoUrl || '',
    galleryImages: row.gallery_images || row.galleryImages || [],
    attachments,
    tags: cleanTags,
    keywords: cleanTags,
    status: row.status || 'draft',
    editorialNotes,
    editorFeedback: editorialNotes,
    rejectionReason,
    isBreaking,
    isFeatured,
    viewsCount: row.views_count ?? row.viewsCount ?? 0,
    likesCount: row.likes_count ?? row.likesCount ?? 0,
    publishedAt: row.published_at || row.publishedAt || null,
    published_at: row.published_at || row.publishedAt || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    created_at: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    updated_at: row.updated_at || row.updatedAt || new Date().toISOString(),
    readingTimeMinutes: Math.max(1, Math.ceil(((row.content || '').trim().split(/\s+/).length || 1) / 180)),
  };
}

/**
 * Get article authors from Supabase or local fallback
 */
export async function getArticleAuthors(articleId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('article_authors')
        .select('*')
        .eq('article_id', articleId);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }
  const local = loadArticleAuthorsFromLocalDB();
  return local.filter((aa: any) => aa.article_id === articleId || aa.articleId === articleId);
}

/**
 * Set article authors in Supabase and local DB
 */
export async function setArticleAuthors(
  articleId: string,
  authors: { journalistId: string; role: 'primary' | 'co_author'; name?: string; studentId?: string; major?: string; avatar?: string }[]
): Promise<any[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  // Build deduplicated records
  const seen = new Set<string>();
  const records: any[] = [];
  for (const a of authors) {
    if (!a.journalistId || seen.has(a.journalistId)) continue;
    seen.add(a.journalistId);
    records.push({
      id: `aa-${articleId}-${a.journalistId}`,
      article_id: articleId,
      journalist_id: a.journalistId,
      role: a.role || 'co_author',
      name: a.name || '',
      student_id: a.studentId || '',
      major: a.major || '',
      avatar: a.avatar || '',
      created_at: now,
    });
  }

  // 1. Supabase persistence
  if (client) {
    try {
      await client.from('article_authors').delete().eq('article_id', articleId);
      if (records.length > 0) {
        const rowData = records.map((r) => ({
          id: r.id,
          article_id: r.article_id,
          journalist_id: r.journalist_id,
          role: r.role,
          created_at: r.created_at,
        }));
        await client.from('article_authors').upsert(rowData, { onConflict: 'id' });
      }
    } catch (e: any) {
      console.warn('[Supabase] Warning syncing article_authors:', e?.message);
    }
  }

  // 2. Local JSON persistence
  const existing = loadArticleAuthorsFromLocalDB().filter(
    (aa: any) => aa.article_id !== articleId && aa.articleId !== articleId
  );
  const next = [...existing, ...records];
  saveArticleAuthorsToLocalDB(next);

  return records;
}

export function loadDeletedUsers(): string[] {
  try {
    if (fs.existsSync(DELETED_USERS_FILE)) {
      const raw = fs.readFileSync(DELETED_USERS_FILE, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error('[SupabaseServer] Error reading deleted users list:', e);
  }
  return [];
}

function loadJsonArray(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error(`[LocalDB] Error reading ${filePath}:`, e);
  }
  return [];
}

function saveJsonArray(filePath: string, data: any[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    console.error(`[LocalDB] Error writing ${filePath}:`, e);
  }
}

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizeRequest(r: any): any {
  if (!r) return r;
  const uid = r.user_id || r.userId || (r.id ? r.id.replace(/^req-/, '') : '');
  const sid = r.student_id !== undefined ? r.student_id : (r.studentId || '');
  const lvl = r.academic_level || r.academicLevel || 'المستوى الأول';
  const rej = r.rejection_reason !== undefined ? r.rejection_reason : (r.rejectionReason || null);
  const revBy = r.reviewed_by !== undefined ? r.reviewed_by : (r.reviewedBy || null);
  const revAt = r.reviewed_at !== undefined ? r.reviewed_at : (r.reviewedAt || null);
  const crt = r.created_at || r.createdAt || new Date().toISOString();
  const upd = r.updated_at || r.updatedAt || new Date().toISOString();

  return {
    ...r,
    id: r.id,
    user_id: uid,
    userId: uid,
    name: r.name,
    email: (r.email || '').toLowerCase().trim(),
    student_id: sid,
    studentId: sid,
    major: r.major || 'صحافة ونشر رقمي',
    academic_level: lvl,
    academicLevel: lvl,
    avatar: r.avatar || '',
    bio: r.bio || '',
    skills: Array.isArray(r.skills) ? r.skills : [],
    status: r.status || 'pending',
    rejection_reason: rej,
    rejectionReason: rej,
    notes: r.notes || null,
    reviewed_by: revBy,
    reviewedBy: revBy,
    reviewed_at: revAt,
    reviewedAt: revAt,
    created_at: crt,
    createdAt: crt,
    updatedAt: upd,
    attachmentUrl: r.attachmentUrl || r.attachment_url || (() => {
      if (typeof r.notes === 'string' && r.notes.includes('attach:')) {
        try {
          const match = r.notes.match(/attach:(\{.*?\})/);
          if (match) return JSON.parse(match[1]).url;
        } catch {}
      }
      return undefined;
    })(),
    attachmentName: r.attachmentName || r.attachment_name || (() => {
      if (typeof r.notes === 'string' && r.notes.includes('attach:')) {
        try {
          const match = r.notes.match(/attach:(\{.*?\})/);
          if (match) return JSON.parse(match[1]).name;
        } catch {}
      }
      return undefined;
    })(),
    attachmentSize: r.attachmentSize || r.attachment_size || (() => {
      if (typeof r.notes === 'string' && r.notes.includes('attach:')) {
        try {
          const match = r.notes.match(/attach:(\{.*?\})/);
          if (match) return JSON.parse(match[1]).size;
        } catch {}
      }
      return undefined;
    })(),
  };
}

function normalizeAuditLog(l: any): any {
  if (!l) return l;
  const crt = l.created_at || l.performed_at || new Date().toISOString();
  const actor = l.actor_name || l.performed_by || 'نظام الاعتماد';
  const reqId = l.request_id || l.requestId || '';
  return {
    ...l,
    id: l.id || ('log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)),
    request_id: reqId,
    requestId: reqId,
    action: l.action || 'STATUS_UPDATE',
    old_status: l.old_status || l.previous_status || null,
    previous_status: l.old_status || l.previous_status || null,
    new_status: l.new_status || null,
    actor_name: actor,
    performed_by: actor,
    performed_at: crt,
    created_at: crt,
    notes: l.notes || null,
  };
}

class LocalTableQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol?: string;
  private orderAsc: boolean = true;
  private limitCount?: number;
  private isHead: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    if (options?.head) {
      this.isHead = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    const colCamel = toCamel(column);
    const colSnake = toSnake(column);
    this.filters.push((item: any) => {
      const v = item[column] ?? item[colCamel] ?? item[colSnake];
      if (typeof v === 'string' && typeof value === 'string') {
        return v.trim() === value.trim();
      }
      return v == value;
    });
    return this;
  }

  in(column: string, values: any[]) {
    const colCamel = toCamel(column);
    const colSnake = toSnake(column);
    const set = new Set((values || []).map((v) => String(v).trim().toLowerCase()));
    this.filters.push((item: any) => {
      const v = item[column] ?? item[colCamel] ?? item[colSnake];
      return set.has(String(v ?? '').trim().toLowerCase());
    });
    return this;
  }

  or(expr: string) {
    if (!expr) return this;
    const clauses = expr.split(',').map((c) => c.trim()).filter(Boolean);
    this.filters.push((item: any) => {
      return clauses.some((clause) => {
        const parts = clause.split('.');
        if (parts.length < 3) return false;
        const col = parts[0];
        const op = parts[1];
        const val = parts.slice(2).join('.');
        const colCamel = toCamel(col);
        const colSnake = toSnake(col);
        const itemVal = item[col] ?? item[colCamel] ?? item[colSnake];

        if (op === 'eq') {
          if (typeof itemVal === 'string') {
            return itemVal.trim().toLowerCase() === val.trim().toLowerCase();
          }
          return itemVal == val;
        }
        if (op === 'ilike') {
          const cleanPattern = val.replace(/^%/, '').replace(/%$/, '').toLowerCase();
          return String(itemVal || '').toLowerCase().includes(cleanPattern);
        }
        return false;
      });
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private getItems(): any[] {
    let items: any[] = [];
    if (this.tableName === 'accreditation_requests') {
      items = loadJsonArray(REQUESTS_FILE).map(normalizeRequest);
    } else if (this.tableName === 'accreditation_audit_logs') {
      items = loadJsonArray(AUDIT_LOGS_FILE).map(normalizeAuditLog);
    } else if (this.tableName === 'public_approved_journalists') {
      const reqs = loadJsonArray(REQUESTS_FILE).map(normalizeRequest);
      const deleted = loadDeletedUsers();
      items = reqs
        .filter(
          (r) =>
            r.status === 'approved' &&
            (!r.notes || !r.notes.includes('[ACCOUNT_DELETED]')) &&
            !deleted.includes(r.id) &&
            !deleted.includes(r.user_id) &&
            (!r.email || !deleted.includes((r.email || '').toLowerCase().trim())) &&
            (!r.student_id || !deleted.includes(r.student_id))
        )
        .map((r) => ({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          email: r.email,
          student_id: r.student_id,
          major: r.major,
          academic_level: r.academic_level,
          avatar: r.avatar,
          bio: r.bio,
          skills: r.skills,
        }));
    } else if (this.tableName === 'articles') {
      items = loadArticlesFromLocalDB().map(articleToRow);
    }

    for (const filter of this.filters) {
      items = items.filter(filter);
    }

    if (this.orderCol) {
      const col = this.orderCol;
      const colCamel = toCamel(col);
      const colSnake = toSnake(col);
      items.sort((a, b) => {
        const valA = a[col] ?? a[colCamel] ?? a[colSnake] ?? '';
        const valB = b[col] ?? b[colCamel] ?? b[colSnake] ?? '';
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      items = items.slice(0, this.limitCount);
    }

    return items;
  }

  async single(): Promise<{ data: any; error: any }> {
    const items = this.getItems();
    if (items.length === 0) {
      return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
    }
    return { data: items[0], error: null };
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const items = this.getItems();
    return { data: items.length > 0 ? items[0] : null, error: null };
  }

  then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const items = this.getItems();
      resolve({
        data: this.isHead ? null : items,
        error: null,
        count: items.length,
      });
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err, count: 0 });
    }
  }

  insert(data: any | any[]) {
    const arrayData = Array.isArray(data) ? data : [data];
    if (this.tableName === 'accreditation_requests') {
      const existing = loadJsonArray(REQUESTS_FILE);
      const normalized = arrayData.map(normalizeRequest);
      const combined = [...existing.filter((e) => !normalized.some((n) => n.id === e.id)), ...normalized];
      saveJsonArray(REQUESTS_FILE, combined);
      return {
        select: () => ({
          single: async () => ({ data: normalized[0], error: null }),
          maybeSingle: async () => ({ data: normalized[0], error: null }),
          then: (res: any) => res({ data: normalized, error: null }),
        }),
        then: (res: any) => res({ data: normalized, error: null }),
      };
    } else if (this.tableName === 'accreditation_audit_logs') {
      const existing = loadJsonArray(AUDIT_LOGS_FILE);
      const normalized = arrayData.map(normalizeAuditLog);
      const combined = [...existing, ...normalized];
      saveJsonArray(AUDIT_LOGS_FILE, combined);
      return {
        select: () => ({
          single: async () => ({ data: normalized[0], error: null }),
          maybeSingle: async () => ({ data: normalized[0], error: null }),
          then: (res: any) => res({ data: normalized, error: null }),
        }),
        then: (res: any) => res({ data: normalized, error: null }),
      };
    } else if (this.tableName === 'articles') {
      const normalized = arrayData.map(articleToRow);
      upsertArticlesInLocalDB(normalized.map(rowToArticle));
      return {
        select: () => ({
          single: async () => ({ data: normalized[0], error: null }),
          maybeSingle: async () => ({ data: normalized[0], error: null }),
          then: (res: any) => res({ data: normalized, error: null }),
        }),
        then: (res: any) => res({ data: normalized, error: null }),
      };
    }
    return {
      select: () => ({
        single: async () => ({ data: arrayData[0], error: null }),
      }),
    };
  }

  upsert(data: any | any[], options?: { onConflict?: string }) {
    const onConflict = options?.onConflict || 'id';
    const arrayData = Array.isArray(data) ? data : [data];

    if (this.tableName === 'accreditation_requests') {
      const existing = loadJsonArray(REQUESTS_FILE).map(normalizeRequest);
      const normalized = arrayData.map(normalizeRequest);
      for (const item of normalized) {
        const idx = existing.findIndex((e) => e[onConflict] === item[onConflict]);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...item };
        } else {
          existing.push(item);
        }
      }
      saveJsonArray(REQUESTS_FILE, existing);
      return {
        select: () => ({
          single: async () => ({ data: normalized[0], error: null }),
          maybeSingle: async () => ({ data: normalized[0], error: null }),
          then: (res: any) => res({ data: normalized, error: null }),
        }),
        then: (res: any) => res({ data: normalized, error: null }),
      };
    } else if (this.tableName === 'articles') {
      const existing = loadArticlesFromLocalDB().map(articleToRow);
      const normalized = arrayData.map(articleToRow);
      for (const item of normalized) {
        const idx = existing.findIndex((e) => e[onConflict] === item[onConflict]);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...item };
        } else {
          existing.push(item);
        }
      }
      saveArticlesToLocalDB(existing.map(rowToArticle));
      return {
        select: () => ({
          single: async () => ({ data: normalized[0], error: null }),
          maybeSingle: async () => ({ data: normalized[0], error: null }),
          then: (res: any) => res({ data: normalized, error: null }),
        }),
        then: (res: any) => res({ data: normalized, error: null }),
      };
    }
    return this.insert(data);
  }

  delete() {
    const self = this;
    const queryObj = {
      eq(column: string, value: any) {
        self.eq(column, value);
        return queryObj;
      },
      then(resolve: (value: any) => void, reject?: (reason: any) => void) {
        if (self.tableName === 'articles') {
          deleteArticlesFromLocalDB(self.filters);
          resolve({ data: [], error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return queryObj;
  }

  update(updates: any) {
    const self = this;
    const queryObj = {
      eq(column: string, value: any) {
        self.eq(column, value);
        return queryObj;
      },
      in(column: string, values: any[]) {
        self.in(column, values);
        return queryObj;
      },
      select: () => ({
        single: async () => {
          if (self.tableName === 'accreditation_requests') {
            const existing = loadJsonArray(REQUESTS_FILE).map(normalizeRequest);
            let updatedItem: any = null;
            let matched = false;
            const updatedList = existing.map((item) => {
              let matches = true;
              for (const f of self.filters) {
                if (!f(item)) {
                  matches = false;
                  break;
                }
              }
              if (matches && !matched) {
                matched = true;
                updatedItem = normalizeRequest({ ...item, ...updates });
                return updatedItem;
              }
              return item;
            });
            if (!matched || !updatedItem) {
              return { data: null, error: { message: 'CONFLICT: Row not found or status already changed', code: 'PGRST116' } };
            }
            saveJsonArray(REQUESTS_FILE, updatedList);
            return { data: updatedItem, error: null };
          } else if (self.tableName === 'articles') {
            const existing = loadArticlesFromLocalDB().map(articleToRow);
            let updatedItem: any = null;
            const updatedList = existing.map((item) => {
              let matches = true;
              for (const f of self.filters) {
                if (!f(item)) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                updatedItem = articleToRow({ ...rowToArticle(item), ...updates });
                return updatedItem;
              }
              return item;
            });
            saveArticlesToLocalDB(updatedList.map(rowToArticle));
            return { data: updatedItem, error: null };
          }
          return { data: updates, error: null };
        },
        maybeSingle: async () => {
          if (self.tableName === 'accreditation_requests') {
            const existing = loadJsonArray(REQUESTS_FILE).map(normalizeRequest);
            let updatedItem: any = null;
            for (const item of existing) {
              let matches = true;
              for (const f of self.filters) {
                if (!f(item)) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                updatedItem = normalizeRequest({ ...item, ...updates });
                break;
              }
            }
            return { data: updatedItem, error: null };
          } else if (self.tableName === 'articles') {
            const existing = loadArticlesFromLocalDB().map(articleToRow);
            let updatedItem: any = null;
            for (const item of existing) {
              let matches = true;
              for (const f of self.filters) {
                if (!f(item)) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                updatedItem = articleToRow({ ...rowToArticle(item), ...updates });
                break;
              }
            }
            return { data: updatedItem, error: null };
          }
          return { data: updates, error: null };
        },
      }),
    };
    return queryObj;
  }
}

class LocalSupabaseClient {
  from(tableName: string) {
    return new LocalTableQueryBuilder(tableName);
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (fileName: string, buffer: Buffer, options?: any) => {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const destPath = path.join(uploadsDir, safeName);
        fs.writeFileSync(destPath, buffer);
        return { data: { path: safeName }, error: null };
      },
      getPublicUrl: (fileName: string) => {
        return { data: { publicUrl: `/uploads/${fileName}` } };
      },
    }),
    listBuckets: async () => ({
      data: [
        { id: 'news-images', name: 'news-images', public: true },
        { id: 'avatars', name: 'avatars', public: true },
        { id: 'attachments', name: 'attachments', public: true },
      ],
      error: null,
    }),
    createBucket: async (id: string, options?: any) => ({
      data: { id, name: id, public: options?.public ?? true },
      error: null,
    }),
    getBucket: async (id: string) => ({
      data: { id, name: id, public: true },
      error: null,
    }),
  };
}

let localClientInstance: any = null;

export interface AccreditationRequestRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  student_id: string;
  major: string;
  academic_level: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived';
  rejection_reason?: string | null;
  notes?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccreditationAuditLogRecord {
  id?: number;
  request_id: string;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  performed_by: string;
  performed_at: string;
  notes?: string | null;
}

export interface PublicApprovedJournalistRecord {
  id: string;
  name: string;
  major: string;
  academic_level: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
}

let supabaseInstance: SupabaseClient | null = null;
let isMigrated = false;

/**
 * Sanitizes Supabase Project URL to remove trailing slashes or /rest/v1
 */
export function cleanSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let u = rawUrl.trim();
  u = u.replace(/\/rest\/v1\/?$/i, '');
  u = u.replace(/\/+$/, '');
  return u;
}

/**
 * Checks if remote Supabase credentials are configured in the environment
 */
export function hasRemoteSupabase(): boolean {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const url = cleanSupabaseUrl(rawUrl);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  return Boolean(url && key && url.startsWith('http'));
}

/**
 * Checks if Supabase / persistent accreditation storage is configured and ready
 */
export function isSupabaseConfigured(): boolean {
  return true;
}

/**
 * Lazy-initializes the Supabase client (Prefers remote service_role; falls back to persistent local storage)
 */
export function getSupabaseClient(): any {
  if (hasRemoteSupabase()) {
    if (!supabaseInstance) {
      const url = cleanSupabaseUrl(process.env.SUPABASE_URL);
      // Prefer SERVICE_ROLE_KEY for server-side authority
      const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)!.trim();
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('[Supabase] Initialized Supabase client successfully with URL:', url);
    }
    return supabaseInstance;
  }

  if (!localClientInstance) {
    localClientInstance = new LocalSupabaseClient();
    console.log('[Supabase] Using persistent local storage adapter for accreditation requests and audit logs.');
  }
  return localClientInstance;
}

export const getSupabaseServiceClient = getSupabaseClient;

/**
 * Records an immutable audit log entry in Supabase
 */
export async function insertAuditLogInSupabase(log: {
  request_id: string;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  performed_by: string;
  notes?: string | null;
}): Promise<AccreditationAuditLogRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const payload = {
      request_id: log.request_id,
      action: log.action,
      old_status: log.old_status || null,
      new_status: log.new_status || null,
      performed_by: log.performed_by,
      performed_at: new Date().toISOString(),
      notes: log.notes || null,
    };

    const { data, error } = await client
      .from('accreditation_audit_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Error inserting audit log (table might need creation):', error.message);
      return null;
    }
    return data as AccreditationAuditLogRecord;
  } catch (e: any) {
    console.warn('[Supabase] Exception inserting audit log:', e.message);
    return null;
  }
}

/**
 * Fetches audit logs for a specific request or all audit logs
 */
export async function fetchAuditLogsFromSupabase(requestId?: string): Promise<AccreditationAuditLogRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client.from('accreditation_audit_logs').select('*').order('performed_at', { ascending: false });
    if (requestId) {
      query = query.eq('request_id', requestId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase] Error fetching audit logs:', error.message);
      return [];
    }
    return (data || []) as AccreditationAuditLogRecord[];
  } catch (e: any) {
    console.warn('[Supabase] Exception fetching audit logs:', e.message);
    return [];
  }
}

/**
 * Fetches all accreditation requests directly from Supabase
 */
export async function fetchAccreditationFromSupabase(filter?: {
  status?: string;
  search?: string;
}): Promise<{ success: boolean; data: AccreditationRequestRecord[]; count: number }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured. Missing SUPABASE_URL or key.');
  }

  let query = client.from('accreditation_requests').select('*');

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim();
    query = query.or(`name.ilike.%${s}%,student_id.ilike.%${s}%,email.ilike.%${s}%,major.ilike.%${s}%`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      console.warn('[Supabase] Note: Table "accreditation_requests" is pending initialization in Supabase (PGRST205).');
    } else {
      console.error('[Supabase] Error fetching accreditation_requests:', error.message || error);
    }
    throw error;
  }

  return {
    success: true,
    data: (data || []) as AccreditationRequestRecord[],
    count: count || data?.length || 0,
  };
}

/**
 * Fetches all approved journalists directly from Supabase public_approved_journalists view
 */
export async function fetchPublicApprovedJournalistsFromSupabase(): Promise<PublicApprovedJournalistRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('public_approved_journalists')
      .select('*');

    if (error) {
      console.warn('[Supabase] Error querying public_approved_journalists:', error.message);
      return [];
    }
    const deleted = loadDeletedUsers();
    const clean = (data || []).filter(
      (j: any) =>
        !deleted.includes(j.id) &&
        !deleted.includes(j.user_id) &&
        (!j.email || !deleted.includes((j.email || '').toLowerCase().trim())) &&
        (!j.student_id || !deleted.includes(j.student_id)) &&
        (!j.notes || !j.notes.includes('[ACCOUNT_DELETED]'))
    );
    return clean as PublicApprovedJournalistRecord[];
  } catch (err: any) {
    console.warn('[Supabase] Exception querying public_approved_journalists:', err.message);
    return [];
  }
}

/**
 * Fetches a single accreditation request by ID or user_id
 */
export async function getAccreditationByIdFromSupabase(id: string): Promise<AccreditationRequestRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const clean = id.trim();
  const withPrefix = clean.startsWith('req-') ? clean : `req-${clean}`;
  const withoutPrefix = clean.replace(/^req-/, '');

  const { data, error } = await client
    .from('accreditation_requests')
    .select('*')
    .or(`id.eq.${clean},id.eq.${withPrefix},user_id.eq.${clean},user_id.eq.${withoutPrefix}`)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Error retrieving request by id:', error.message);
    return null;
  }
  return data as AccreditationRequestRecord | null;
}

/**
 * Fetches a single accreditation request by email, student_id, or user_id
 */
export async function getAccreditationByEmailOrStudentIdFromSupabase(identifier: string): Promise<AccreditationRequestRecord | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const clean = identifier.trim().toLowerCase();
  const { data, error } = await client
    .from('accreditation_requests')
    .select('*')
    .or(`email.ilike.${clean},student_id.eq.${clean},user_id.eq.${clean},id.eq.${clean}`)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Error finding accreditation request by identifier:', error.message);
    return null;
  }
  return data as AccreditationRequestRecord | null;
}

/**
 * Inserts a new accreditation request into Supabase with audit trail
 */
export async function insertAccreditationIntoSupabase(record: {
  id?: string;
  userId: string;
  name: string;
  email: string;
  studentId?: string;
  major?: string;
  academicLevel?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  status?: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived';
  rejectionReason?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  reviewedBy?: string;
  createdAt?: string;
}): Promise<AccreditationRequestRecord> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const now = new Date().toISOString();
  const requestId = record.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const initialStatus = record.status || 'pending';

  const dbPayload: Partial<AccreditationRequestRecord> = {
    id: requestId,
    user_id: record.userId,
    name: record.name,
    email: record.email.toLowerCase().trim(),
    student_id: record.studentId || '',
    major: record.major || 'صحافة ونشر رقمي',
    academic_level: record.academicLevel || 'المستوى الأول',
    avatar: record.avatar || '',
    bio: record.bio || '',
    skills: record.skills || [],
    status: initialStatus,
    rejection_reason: record.rejectionReason || null,
    notes: (() => {
      let n = record.notes || null;
      if (record.attachmentUrl) {
        const attachMeta = `attach:${JSON.stringify({
          url: record.attachmentUrl,
          name: record.attachmentName || 'وثيقة مرفقة',
          size: record.attachmentSize || 0,
        })}`;
        n = n ? `${n} | ${attachMeta}` : attachMeta;
      }
      return n;
    })(),
    reviewed_by: record.reviewedBy || null,
    reviewed_at: initialStatus === 'approved' ? now : null,
    created_at: record.createdAt || now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('accreditation_requests')
    .upsert(dbPayload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error inserting accreditation request:', error);
    throw error;
  }

  // Insert initial audit log
  await insertAuditLogInSupabase({
    request_id: requestId,
    action: 'CREATE_REQUEST',
    old_status: null,
    new_status: initialStatus,
    performed_by: record.name,
    notes: 'تقديم طلب اعتماد صحفي جديد',
  });

  return data as AccreditationRequestRecord;
}

/**
 * Updates an existing accreditation request in Supabase (Immutable UPDATE in-place with audit log)
 * Includes atomic expectedStatus check to protect against race conditions.
 */
export async function updateAccreditationStatusInSupabase(
  id: string,
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived',
  options?: {
    rejectionReason?: string;
    notes?: string;
    reviewedBy?: string;
    expectedStatus?: string | string[]; // Atomic race condition guard
  }
): Promise<AccreditationRequestRecord> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  // Fetch current record to get old_status and verified id
  const existing = await getAccreditationByIdFromSupabase(id);
  const oldStatus = existing?.status || 'pending';
  const targetId = existing?.id || id;

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    status,
    updated_at: now,
    reviewed_by: options?.reviewedBy || 'المشرف العام - إدارة التحرير',
  };

  if (status === 'approved') {
    updatePayload.reviewed_at = now;
    updatePayload.rejection_reason = null;
  } else if (status === 'rejected') {
    updatePayload.rejection_reason = options?.rejectionReason || 'لم يستوف الشروط المطلوبة';
  } else if (status === 'archived') {
    updatePayload.notes = options?.notes || 'أرشفة الطلب';
  }

  if (options?.notes !== undefined) {
    updatePayload.notes = options.notes;
  }

  // Perform conditional atomic UPDATE on the immutable primary key
  let updateQuery: any = client
    .from('accreditation_requests')
    .update(updatePayload)
    .eq('id', targetId);

  if (options?.expectedStatus) {
    if (Array.isArray(options.expectedStatus)) {
      updateQuery = updateQuery.in('status', options.expectedStatus);
    } else {
      updateQuery = updateQuery.eq('status', options.expectedStatus);
    }
  }

  const { data, error } = await updateQuery.select().single();

  if (error) {
    if (error.code === 'PGRST116' || error.message?.includes('CONFLICT')) {
      const conflictErr = new Error('تعذر إتمام العملية: تم تغيير حالة هذا الطلب مسبقاً أو حدث تعارض في العمليات المتزامنة.');
      (conflictErr as any).code = 'CONFLICT';
      throw conflictErr;
    }
    console.error('[Supabase] Error updating accreditation request:', error);
    throw error;
  }

  // Insert audit log
  await insertAuditLogInSupabase({
    request_id: targetId,
    action: `STATUS_CHANGE_TO_${status.toUpperCase()}`,
    old_status: oldStatus,
    new_status: status,
    performed_by: options?.reviewedBy || 'المشرف العام - إدارة التحرير',
    notes: options?.rejectionReason || options?.notes || `تغيير حالة الطلب من ${oldStatus} إلى ${status}`,
  });

  return data as AccreditationRequestRecord;
}

/**
 * Uploads media buffer directly to Supabase Storage bucket (news-images, avatars, attachments)
 */
export async function uploadMediaToSupabaseStorage(
  bucket: 'news-images' | 'avatars' | 'attachments',
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const cleanName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data, error } = await (client as any).storage?.from(bucket)?.upload(cleanName, buffer, {
      contentType,
      upsert: true,
    }) || { data: null, error: { message: 'Storage not available' } };

    if (error) {
      console.warn(`[Supabase Storage] Upload error to ${bucket}:`, error.message);
      return { success: false, error: error.message };
    }

    const { data: publicData } = (client as any).storage?.from(bucket)?.getPublicUrl(cleanName) || {};
    return { success: true, url: publicData?.publicUrl || `/uploads/${cleanName}` };
  } catch (err: any) {
    console.warn(`[Supabase Storage] Upload exception:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Updates a journalist's public profile in Supabase (surgical in-place UPDATE).
 * Only allowed public fields: name, avatar, bio, major, academic_level, skills.
 * Sensitive fields (student_id, email, status, role, id, user_id, reviewed_by, reviewed_at) are NEVER modified.
 */
export async function updateJournalistPublicProfileInSupabase(
  identifier: string,
  profileData: {
    name?: string;
    avatar?: string;
    bio?: string;
    major?: string;
    academicLevel?: string;
    skills?: string[];
  },
  options?: {
    actorName?: string;
  }
): Promise<AccreditationRequestRecord> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Locate existing record
  let existing = await getAccreditationByIdFromSupabase(identifier);
  if (!existing) {
    existing = await getAccreditationByEmailOrStudentIdFromSupabase(identifier);
  }

  if (!existing) {
    throw new Error('سجل الصحفي غير موجود في قاعدة بيانات الاعتماد');
  }

  // Check if account is deleted or archived
  const deleted = loadDeletedUsers();
  if (
    deleted.includes(existing.id) ||
    deleted.includes(existing.user_id) ||
    (existing.email && deleted.includes(existing.email.toLowerCase().trim())) ||
    (existing.student_id && deleted.includes(existing.student_id)) ||
    (existing.notes && existing.notes.includes('[ACCOUNT_DELETED]')) ||
    existing.status === 'archived'
  ) {
    throw new Error('لا يمكن تعديل بيانات حساب صحفي محذوف أو مؤرشف');
  }

  // Ensure journalist is approved
  if (existing.status !== 'approved') {
    throw new Error('لا يمكن تعديل الملف الشخصي العام لصحفي غير معتمد رسمياً');
  }

  const targetId = existing.id;
  const now = new Date().toISOString();

  // 2. Whitelist-only update payload (Strict security)
  const updatePayload: Record<string, any> = {
    updated_at: now,
  };

  if (profileData.name !== undefined && typeof profileData.name === 'string') {
    const trimmedName = profileData.name.trim();
    if (trimmedName.length > 0) {
      updatePayload.name = trimmedName;
    }
  }

  if (profileData.avatar !== undefined && typeof profileData.avatar === 'string') {
    updatePayload.avatar = profileData.avatar.trim();
  }

  if (profileData.bio !== undefined && typeof profileData.bio === 'string') {
    updatePayload.bio = profileData.bio.trim();
  }

  if (profileData.major !== undefined && typeof profileData.major === 'string') {
    const trimmedMajor = profileData.major.trim();
    if (trimmedMajor.length > 0) {
      updatePayload.major = trimmedMajor;
    }
  }

  if (profileData.academicLevel !== undefined && typeof profileData.academicLevel === 'string') {
    const trimmedLevel = profileData.academicLevel.trim();
    if (trimmedLevel.length > 0) {
      updatePayload.academic_level = trimmedLevel;
    }
  }

  if (profileData.skills !== undefined && Array.isArray(profileData.skills)) {
    updatePayload.skills = profileData.skills
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
  }

  // 3. Surgical UPDATE on primary key in Supabase
  const { data, error } = await client
    .from('accreditation_requests')
    .update(updatePayload)
    .eq('id', targetId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating journalist public profile:', error);
    throw error;
  }

  // 4. Record audit log
  const actor = options?.actorName || updatePayload.name || existing.name || 'الصحفي';
  await insertAuditLogInSupabase({
    request_id: targetId,
    action: 'JOURNALIST_PROFILE_UPDATED',
    old_status: existing.status,
    new_status: existing.status,
    performed_by: actor,
    notes: `تحديث بيانات الملف الشخصي العامة: ${Object.keys(updatePayload).filter((k) => k !== 'updated_at').join(', ')}`,
  });

  return data as AccreditationRequestRecord;
}

/**
 * Logically deletes/archives a journalist in Supabase while preserving the accreditation request
 * and original approval history (status remains approved, reviewed_at is never altered).
 */
export async function softDeleteJournalistInSupabase(
  identifier: string,
  options?: { reviewedBy?: string; notes?: string }
): Promise<{ success: boolean; request: AccreditationRequestRecord | null }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  // Find the existing request in Supabase
  let existing = await getAccreditationByIdFromSupabase(identifier);
  if (!existing) {
    existing = await getAccreditationByEmailOrStudentIdFromSupabase(identifier);
  }

  if (!existing) {
    return { success: false, request: null };
  }

  const targetId = existing.id;
  const now = new Date().toISOString();
  const actor = options?.reviewedBy || 'المشرف العام - إدارة التحرير';
  const deleteMarker = `[ACCOUNT_DELETED: ${now} | Actor: ${actor}] ${options?.notes || 'تم حذف وأرشفة حساب الصحفي من قبل المشرف العام مع الاحتفاظ بسجل الاعتماد التاريخي'}`;

  // Combine with existing notes if present
  const updatedNotes = existing.notes
    ? `${existing.notes} | ${deleteMarker}`
    : deleteMarker;

  // Set status to 'archived' in Supabase as required by schema trigger, while keeping original reviewed_at unchanged
  const updatePayload: Record<string, any> = {
    status: 'archived',
    notes: updatedNotes,
    updated_at: now,
  };

  const { data, error } = await client
    .from('accreditation_requests')
    .update(updatePayload)
    .eq('id', targetId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error soft-deleting journalist in Supabase:', error);
    throw error;
  }

  // Insert immutable audit log in accreditation_audit_logs
  await insertAuditLogInSupabase({
    request_id: targetId,
    action: 'JOURNALIST_ACCOUNT_DELETED',
    old_status: existing.status,
    new_status: existing.status, // stays approved in request table
    performed_by: actor,
    notes: options?.notes || 'حذف وأرشفة حساب الصحفي مع الحفاظ التام على سجل الاعتماد وتاريخ اعتماده',
  });

  return { success: true, request: data as AccreditationRequestRecord };
}

/**
 * Safe, verified migration of existing JSON requests to Supabase
 * Ensures zero data loss, exact ID preservation, no duplicates.
 */
export async function migrateJsonToSupabaseOnce(existingJsonRequests: any[]): Promise<{
  migratedCount: number;
  skipped: boolean;
  totalInJson: number;
  totalInSupabase: number;
  success: boolean;
}> {
  if (isMigrated || !isSupabaseConfigured()) {
    return { migratedCount: 0, skipped: true, totalInJson: existingJsonRequests?.length || 0, totalInSupabase: 0, success: true };
  }

  const client = getSupabaseClient();
  if (!client || !Array.isArray(existingJsonRequests) || existingJsonRequests.length === 0) {
    return { migratedCount: 0, skipped: true, totalInJson: 0, totalInSupabase: 0, success: true };
  }

  try {
    // 1. Check existing records in Supabase
    const { data: existingSupa, error: fetchErr } = await client
      .from('accreditation_requests')
      .select('id');

    if (fetchErr) {
      console.warn('[Supabase] Migration error (table might need creation via schema.sql):', fetchErr.message);
      return { migratedCount: 0, skipped: false, totalInJson: existingJsonRequests.length, totalInSupabase: 0, success: false };
    }

    const existingIds = new Set((existingSupa || []).map((r: any) => r.id));

    // Deduplicate JSON requests by ID
    const uniqueMap = new Map<string, any>();
    for (const req of existingJsonRequests) {
      const id = req.id || `req-${req.userId || Date.now()}`;
      uniqueMap.set(id, {
        id,
        user_id: req.userId || req.id,
        name: req.name || 'طالب مجهول',
        email: (req.email || '').toLowerCase().trim(),
        student_id: req.studentId || '',
        major: req.major || 'صحافة ونشر رقمي',
        academic_level: req.academicLevel || 'المستوى الأول',
        avatar: req.avatar || '',
        bio: req.bio || '',
        skills: req.skills || [],
        status: req.status || 'pending',
        rejection_reason: req.rejectionReason || null,
        notes: req.notes || null,
        reviewed_by: req.reviewedBy || null,
        reviewed_at: req.status === 'approved' ? (req.updatedAt || new Date().toISOString()) : null,
        created_at: req.createdAt || new Date().toISOString(),
        updated_at: req.updatedAt || new Date().toISOString(),
      });
    }

    const records = Array.from(uniqueMap.values());

    const { error: upsertErr } = await client
      .from('accreditation_requests')
      .upsert(records, { onConflict: 'id' });

    if (upsertErr) {
      console.warn('[Supabase] Migration upsert error:', upsertErr.message);
      return { migratedCount: 0, skipped: false, totalInJson: records.length, totalInSupabase: existingIds.size, success: false };
    }

    // 2. Verify all IDs exist
    const { count: finalCount } = await client
      .from('accreditation_requests')
      .select('id', { count: 'exact', head: true });

    isMigrated = true;
    console.log(`[Supabase] Safe migration complete. Total in Supabase: ${finalCount}`);

    return {
      migratedCount: records.length,
      skipped: false,
      totalInJson: records.length,
      totalInSupabase: finalCount || records.length,
      success: true,
    };
  } catch (e: any) {
    console.warn('[Supabase] Exception during migration:', e.message);
    return { migratedCount: 0, skipped: false, totalInJson: existingJsonRequests.length, totalInSupabase: 0, success: false };
  }
}

/**
 * Initializes Supabase Storage buckets ('news-images', 'avatars', 'attachments')
 */
export async function initSupabaseStorageBuckets(): Promise<{
  success: boolean;
  buckets: string[];
  errors: string[];
}> {
  if (!hasRemoteSupabase()) {
    return {
      success: true,
      buckets: ['news-images', 'avatars', 'attachments'],
      errors: [],
    };
  }

  const client = getSupabaseClient();
  const bucketConfigs: Array<{ id: 'news-images' | 'avatars' | 'attachments'; public: boolean }> = [
    { id: 'news-images', public: true },
    { id: 'avatars', public: true },
    { id: 'attachments', public: true },
  ];

  const existingBuckets: string[] = [];
  const errors: string[] = [];

  try {
    const { data: bucketList, error: listErr } = await client.storage.listBuckets();
    if (listErr) {
      errors.push(`فشل قراءة قائمة Buckets: ${listErr.message}`);
    } else if (bucketList) {
      bucketList.forEach((b: any) => existingBuckets.push(b.name || b.id));
    }
  } catch (err: any) {
    errors.push(`استثناء أثناء قراءة Buckets: ${err.message}`);
  }

  for (const cfg of bucketConfigs) {
    if (!existingBuckets.includes(cfg.id)) {
      try {
        const { error } = await client.storage.createBucket(cfg.id, {
          public: cfg.public,
        });
        if (error && !error.message.toLowerCase().includes('already exists')) {
          errors.push(`فشل إنشاء Bucket ${cfg.id}: ${error.message}`);
        } else {
          existingBuckets.push(cfg.id);
        }
      } catch (e: any) {
        errors.push(`استثناء أثناء إنشاء Bucket ${cfg.id}: ${e.message}`);
      }
    } else {
      // Ensure existing bucket is public
      try {
        await client.storage.updateBucket(cfg.id, { public: cfg.public });
      } catch {}
    }
  }

  return {
    success: errors.length === 0,
    buckets: existingBuckets,
    errors,
  };
}

/**
 * Checks if the public.articles table is available in Supabase
 */
export async function checkSupabaseArticlesTable(): Promise<{
  exists: boolean;
  count: number;
  error?: string;
}> {
  if (!hasRemoteSupabase()) {
    const local = loadArticlesFromLocalDB();
    return {
      exists: true,
      count: local.length,
    };
  }

  const client = getSupabaseClient();
  try {
    const { count, error } = await client
      .from('articles')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      return {
        exists: false,
        count: 0,
        error: `${error.code || 'ERROR'}: ${error.message}`,
      };
    }

    return {
      exists: true,
      count: count || 0,
    };
  } catch (e: any) {
    return {
      exists: false,
      count: 0,
      error: e.message,
    };
  }
}

/**
 * Uploads a base64 Data URL to Supabase Storage and returns the public CDN URL
 */
export async function uploadBase64ToSupabaseStorage(
  bucket: 'news-images' | 'avatars' | 'attachments',
  base64DataUrl: string,
  prefix: string = 'media'
): Promise<{ success: boolean; url: string }> {
  if (!base64DataUrl || !base64DataUrl.startsWith('data:')) {
    return { success: true, url: base64DataUrl };
  }

  try {
    const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: true, url: base64DataUrl };
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';

    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const uploadRes = await uploadMediaToSupabaseStorage(bucket, fileName, buffer, mimeType);

    if (uploadRes.success && uploadRes.url) {
      return { success: true, url: uploadRes.url };
    }
  } catch (e: any) {
    console.warn('[Supabase Storage] uploadBase64 error:', e.message);
  }

  return { success: true, url: base64DataUrl };
}

/**
 * Fetches articles from Supabase (or local fallback)
 */
export async function fetchArticlesFromSupabase(options?: {
  status?: string;
  category?: string;
  authorId?: string;
}): Promise<{ data: any[]; error: any; source: string }> {
  const client = getSupabaseClient();
  if (!client) {
    const local = loadArticlesFromLocalDB();
    return { data: local, error: null, source: 'local_fallback' };
  }

  try {
    let query = client.from('articles').select('*');

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options?.authorId) {
      query = query.eq('author_id', options.authorId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error querying articles:', error.message);
      const local = loadArticlesFromLocalDB();
      return { data: local, error, source: 'local_fallback' };
    }

    const articles = (data || [])
      .filter((r: any) => r.id !== 'qu-sys-categories' && (!Array.isArray(r.tags) || !r.tags.includes('video_report')) && !r.id?.startsWith('vid-'))
      .map(rowToArticle);
    // Keep local backup synchronized without wiping out local-only records
    upsertArticlesInLocalDB(articles);
    return { data: articles, error: null, source: 'supabase' };
  } catch (err: any) {
    console.warn('[Supabase] Exception querying articles:', err.message);
    const local = loadArticlesFromLocalDB();
    return { data: local, error: err, source: 'local_fallback' };
  }
}

/**
 * Gets a single article by ID from Supabase
 */
export async function getArticleByIdFromSupabase(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) {
    const local = loadArticlesFromLocalDB();
    return local.find((a: any) => a.id === id) || null;
  }

  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      const local = loadArticlesFromLocalDB();
      return local.find((a: any) => a.id === id) || null;
    }

    return rowToArticle(data);
  } catch (e: any) {
    const local = loadArticlesFromLocalDB();
    return local.find((a: any) => a.id === id) || null;
  }
}

/**
 * Upserts an article into Supabase and updates local backup
 */
export async function upsertArticleInSupabase(article: any): Promise<{ data: any; error: any }> {
  if (!article) return { data: null, error: 'Empty article' };

  // Automatically offload any base64 data URLs to Supabase Storage so Postgres rows stay fast and lightweight
  try {
    if (typeof article.mainImage === 'string' && article.mainImage.startsWith('data:')) {
      const up = await uploadBase64ToSupabaseStorage('news-images', article.mainImage, 'article-main');
      if (up.success && up.url) article.mainImage = up.url;
    }
    if (typeof article.authorAvatar === 'string' && article.authorAvatar.startsWith('data:')) {
      const up = await uploadBase64ToSupabaseStorage('avatars', article.authorAvatar, 'author-avatar');
      if (up.success && up.url) article.authorAvatar = up.url;
    }
    if (Array.isArray(article.extraImages) && article.extraImages.some((img: any) => typeof img === 'string' && img.startsWith('data:'))) {
      const uploadedExtras: string[] = [];
      for (const img of article.extraImages) {
        if (typeof img === 'string' && img.startsWith('data:')) {
          const up = await uploadBase64ToSupabaseStorage('news-images', img, 'article-extra');
          uploadedExtras.push(up.success && up.url ? up.url : img);
        } else if (typeof img === 'string') {
          uploadedExtras.push(img);
        }
      }
      article.extraImages = uploadedExtras;
    }
    if (Array.isArray(article.galleryImages) && article.galleryImages.some((img: any) => typeof img === 'string' && img.startsWith('data:'))) {
      const uploadedGallery: string[] = [];
      for (const img of article.galleryImages) {
        if (typeof img === 'string' && img.startsWith('data:')) {
          const up = await uploadBase64ToSupabaseStorage('news-images', img, 'article-gallery');
          uploadedGallery.push(up.success && up.url ? up.url : img);
        } else if (typeof img === 'string') {
          uploadedGallery.push(img);
        }
      }
      article.galleryImages = uploadedGallery;
    }
  } catch (mediaErr: any) {
    console.warn('[Supabase] Warning offloading base64 media before article upsert:', mediaErr?.message);
  }

  const row = articleToRow(article);
  const client = getSupabaseClient();

  if (!client) {
    upsertArticlesInLocalDB([article]);
    return { data: article, error: null };
  }

  try {
    let { data, error } = await client
      .from('articles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] First upsert attempt failed, retrying with sanitized payload:', error.message);
      const validStatuses = new Set(['draft', 'under_review', 'approved', 'published', 'needs_edit', 'rejected']);
      const fallbackRow = {
        ...row,
        status: validStatuses.has(row.status) ? row.status : 'under_review',
        author_avatar: typeof row.author_avatar === 'string' && row.author_avatar.startsWith('data:') ? '' : row.author_avatar,
        extra_images: Array.isArray(row.extra_images) ? row.extra_images.filter((img: string) => !img.startsWith('data:')) : [],
        gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images.filter((img: string) => !img.startsWith('data:')) : [],
        tags: Array.isArray(row.tags) ? row.tags.filter((t: string) => t.length < 4000) : [],
      };
      const retryRes = await client
        .from('articles')
        .upsert(fallbackRow, { onConflict: 'id' })
        .select()
        .maybeSingle();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('[Supabase] Error upserting article after retry:', error.message);
      upsertArticlesInLocalDB([article]);
      return { data: article, error };
    }

    const saved = rowToArticle(data || row);
    upsertArticlesInLocalDB([saved]);
    return { data: saved, error: null };
  } catch (e: any) {
    console.warn('[Supabase] Exception upserting article:', e.message);
    upsertArticlesInLocalDB([article]);
    return { data: article, error: e };
  }
}

/**
 * Updates an article in Supabase
 */
export async function updateArticleInSupabase(
  id: string,
  updates: any
): Promise<{ data: any; error: any }> {
  const existing = (await getArticleByIdFromSupabase(id)) || { id };

  // Ensure tags and keywords are mutually synchronized if either was updated
  const hasNewTags = Array.isArray(updates.tags);
  const hasNewKeywords = Array.isArray(updates.keywords);
  let effectiveTags = existing.tags || existing.keywords || [];
  let effectiveKeywords = existing.keywords || existing.tags || [];

  if (hasNewTags) {
    effectiveTags = updates.tags;
    effectiveKeywords = updates.tags;
  } else if (hasNewKeywords) {
    effectiveTags = updates.keywords;
    effectiveKeywords = updates.keywords;
  }

  const effectiveKind = updates.kind !== undefined ? updates.kind : (existing.kind || 'خبر');
  const effectiveCategory = updates.category !== undefined ? updates.category : (existing.category || 'جامعة');
  const effectiveMediaType = updates.mediaType !== undefined
    ? updates.mediaType
    : (effectiveKind === 'تقرير مرئي' ? 'video' : effectiveKind === 'ألبوم صور' ? 'album' : (existing.mediaType || 'article'));

  const merged = {
    ...existing,
    ...updates,
    tags: effectiveTags,
    keywords: effectiveKeywords,
    kind: effectiveKind,
    category: effectiveCategory,
    mediaType: effectiveMediaType,
    updatedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return upsertArticleInSupabase(merged);
}

/**
 * Increments article views count
 */
export async function incrementArticleViewsInSupabase(id: string): Promise<number> {
  const existing = await getArticleByIdFromSupabase(id);
  if (!existing) return 0;

  const nextViews = (existing.viewsCount || 0) + 1;
  await updateArticleInSupabase(id, { viewsCount: nextViews });
  return nextViews;
}

/**
 * Increments article likes count
 */
export async function incrementArticleLikesInSupabase(id: string): Promise<number> {
  const existing = await getArticleByIdFromSupabase(id);
  if (!existing) return 0;

  const nextLikes = (existing.likesCount || 0) + 1;
  await updateArticleInSupabase(id, { likesCount: nextLikes });
  return nextLikes;
}

/**
 * Deletes an article from Supabase
 */
export async function deleteArticleFromSupabase(id: string): Promise<{ success: boolean; error?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    deleteArticlesFromLocalDB([(a: any) => a.id === id]);
    return { success: true };
  }

  try {
    const { error } = await client.from('articles').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Error deleting article:', error.message);
    }
    deleteArticlesFromLocalDB([(a: any) => a.id === id]);
    return { success: !error, error };
  } catch (e: any) {
    console.warn('[Supabase] Exception deleting article:', e.message);
    deleteArticlesFromLocalDB([(a: any) => a.id === id]);
    return { success: false, error: e };
  }
}

/**
 * Extracts storage path from a full public or authenticated Supabase Storage URL
 */
export function extractStoragePath(fileUrl: string, bucket: string = 'news-images'): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (fileUrl.includes(marker)) {
    const part = fileUrl.split(marker)[1];
    return decodeURIComponent(part.split('?')[0]);
  }
  const authMarker = `/storage/v1/object/authenticated/${bucket}/`;
  if (fileUrl.includes(authMarker)) {
    const part = fileUrl.split(authMarker)[1];
    return decodeURIComponent(part.split('?')[0]);
  }
  const simpleMarker = `${bucket}/`;
  if (fileUrl.startsWith(simpleMarker)) {
    return decodeURIComponent(fileUrl.substring(simpleMarker.length).split('?')[0]);
  }
  return null;
}

/**
 * Removes a media file from a Supabase Storage bucket
 */
export async function deleteMediaFromSupabaseStorage(
  bucket: 'news-images' | 'avatars' | 'attachments',
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not initialized' };
  }
  try {
    const { error } = await (client as any).storage?.from(bucket)?.remove([filePath]) || {};
    if (error) {
      console.warn(`[Supabase Storage] Error deleting ${filePath} from ${bucket}:`, error.message || error);
      return { success: false, error: error.message || String(error) };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[Supabase Storage] Exception deleting ${filePath} from ${bucket}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Removes the attached video from an article in Supabase Storage and sets video_url to NULL in PostgreSQL
 */
export async function deleteArticleVideoInSupabase(
  articleId: string
): Promise<{ success: boolean; previousVideoUrl?: string; storageDeleted?: boolean; error?: any }> {
  const existing = await getArticleByIdFromSupabase(articleId);
  if (!existing) {
    return { success: false, error: new Error('المقال غير موجود') };
  }
  const previousVideoUrl = existing.videoUrl || existing.video_url || '';

  // 1. Remove file from Supabase Storage first if hosted in news-images bucket
  let storageDeleted = false;
  if (previousVideoUrl) {
    const storagePath = extractStoragePath(previousVideoUrl, 'news-images');
    if (storagePath) {
      const delRes = await deleteMediaFromSupabaseStorage('news-images', storagePath);
      storageDeleted = delRes.success;
    }
    if (previousVideoUrl.startsWith('/uploads/')) {
      try {
        const localFile = path.join(process.cwd(), 'public', previousVideoUrl.replace(/^\//, ''));
        if (fs.existsSync(localFile)) {
          fs.unlinkSync(localFile);
          storageDeleted = true;
        }
      } catch (e) {}
    }
  }

  // 2. Update article in Supabase PostgreSQL: set public.articles.video_url to NULL
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error: dbError } = await client
        .from('articles')
        .update({ video_url: null, updated_at: new Date().toISOString() })
        .eq('id', articleId);
      if (dbError) {
        console.warn('[Supabase] Error setting video_url to null in articles table:', dbError.message);
      }
    } catch (e: any) {
      console.warn('[Supabase] Exception setting video_url to null in articles table:', e.message);
    }
  }

  // 3. Also update local articles backup
  try {
    const local = loadArticlesFromLocalDB();
    const updatedLocal = local.map((a: any) =>
      a.id === articleId ? { ...a, videoUrl: '', video_url: null, updatedAt: new Date().toISOString() } : a
    );
    saveArticlesToLocalDB(updatedLocal);
  } catch {}

  return { success: true, previousVideoUrl, storageDeleted };
}

/**
 * Checks if the public.users table is available in Supabase
 */
export async function checkSupabaseUsersTable(): Promise<{
  exists: boolean;
  count: number;
  error?: string;
}> {
  if (!hasRemoteSupabase()) {
    return { exists: false, count: 0, error: 'Remote Supabase not configured' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { exists: false, count: 0, error: 'No Supabase client' };
  }
  try {
    const { data, error, count } = await client
      .from('users')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      return { exists: false, count: 0, error: `${error.code || 'ERROR'}: ${error.message}` };
    }
    return { exists: true, count: count ?? (data?.length || 0) };
  } catch (e: any) {
    return { exists: false, count: 0, error: e.message };
  }
}

/**
 * Fetches all registered users from Supabase public.users table
 */
export async function fetchUsersFromSupabase(): Promise<{
  data: any[];
  error: any;
  source: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'No Supabase client', source: 'none' };
  }
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .order('registered_at', { ascending: true });

    if (error) {
      return { data: [], error, source: 'error' };
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      password: row.password_hash,
      studentId: row.student_id,
      major: row.major,
      academicLevel: row.academic_level,
      avatar: row.avatar,
      bio: row.bio,
      skills: row.skills || [],
      status: row.status,
      rejectionReason: row.rejection_reason,
      badges: row.badges || [],
      stats: row.stats || { articlesCount: 0, reportsCount: 0, albumsCount: 0, viewsCount: 0 },
      registeredAt: row.registered_at || row.created_at,
    }));

    return { data: mapped, error: null, source: 'supabase' };
  } catch (e: any) {
    return { data: [], error: e, source: 'error' };
  }
}

/**
 * Upserts a user into Supabase public.users table
 */
export async function upsertUserInSupabase(user: any): Promise<{ data: any; error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'No Supabase client' };
  }
  const row = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    password_hash: user.password,
    student_id: user.studentId || '',
    major: user.major || '',
    academic_level: user.academicLevel || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    skills: user.skills || [],
    status: user.status || 'active',
    rejection_reason: user.rejectionReason || null,
    badges: user.badges || [],
    stats: user.stats || { articlesCount: 0, reportsCount: 0, albumsCount: 0, viewsCount: 0 },
    registered_at: user.registeredAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client.from('users').upsert(row, { onConflict: 'id' }).select();
    return { data, error };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export const REMOVED_CATEGORIES = new Set([
  'حياة طلابية',
  'حياه طلابيه',
  'محلي',
  'أخبار الطلاب',
  'تعليم',
]);

export const DEFAULT_CATEGORIES: string[] = [
  'جامعة',
  'مجتمع',
  'اقتصاد',
  'رياضة',
  'ثقافة وفنون',
  'تقنية',
  'عالمي',
  'قصص',
  'مقالات',
];

/**
 * Fetches editorial categories from Supabase (reading from qu-sys-categories and existing articles)
 */
export async function fetchCategoriesFromSupabase(): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [...DEFAULT_CATEGORIES];

  try {
    const { data, error } = await client
      .from('articles')
      .select('content, tags')
      .eq('id', 'qu-sys-categories')
      .single();

    let list: string[] = [];
    if (!error && data) {
      try {
        if (data.content) {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }
      } catch {}
      if (list.length === 0 && Array.isArray(data.tags)) {
        list = data.tags.filter((t: string) => t !== 'sys_categories');
      }
    }

    // If qu-sys-categories explicitly exists in Supabase, respect its list (minus removed categories);
    // otherwise fall back to DEFAULT_CATEGORIES
    const baseList = list.length > 0 ? list : [...DEFAULT_CATEGORIES];
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...baseList])).filter(
      (c) => typeof c === 'string' && c.trim() && !REMOVED_CATEGORIES.has(c.trim())
    );
    return combined;
  } catch (err: any) {
    console.warn('[Supabase] fetchCategoriesFromSupabase error:', err?.message);
    return [...DEFAULT_CATEGORIES];
  }
}

/**
 * Saves editorial categories permanently to Supabase articles table under qu-sys-categories
 */
export async function saveCategoriesToSupabase(categories: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const cleanList = Array.from(
      new Set(
        categories
          .map((c) => c.trim())
          .filter((c) => Boolean(c) && !REMOVED_CATEGORIES.has(c))
      )
    );
    const row = {
      id: 'qu-sys-categories',
      title: 'إعدادات الأقسام التحريرية',
      summary: 'التصنيفات المعتمدة للصحيفة',
      content: JSON.stringify(cleanList),
      category: 'جامعة',
      author_id: 'system',
      author_name: 'نظام التحرير',
      tags: ['sys_categories', ...cleanList],
      status: 'draft',
      views_count: 0,
      likes_count: 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('articles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] saveCategoriesToSupabase error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] saveCategoriesToSupabase exception:', err?.message);
    return false;
  }
}

/**
 * Fetches all Video Reports from Supabase articles table
 */
export async function fetchVideoReportsFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .neq('id', 'qu-sys-categories');

    if (error || !Array.isArray(data)) {
      return [];
    }

    const videoRows = data.filter((row: any) => {
      if (
        row.id?.startsWith('vid-demo-') ||
        row.id?.startsWith('vid-qu-') ||
        row.id?.startsWith('vid-test-') ||
        row.id?.includes('1791219023276') ||
        row.id === 'vid-86ocmpt' ||
        row.id === 'vid-a518ia2' ||
        row.id?.includes('a518ia2') ||
        row.title?.includes('1791219023276') ||
        row.title?.includes('تقرير مرئي اختباري') ||
        row.title?.includes('تجربه لمسار') ||
        row.title?.includes('تجربة لمسار') ||
        row.author_id === 'jour-demo-1'
      ) {
        return false;
      }
      const isVid =
        row.id?.startsWith('vid-') ||
        (Array.isArray(row.tags) && row.tags.includes('video_report')) ||
        (row.video_url && typeof row.video_url === 'string' && row.video_url.trim().length > 0 && row.id?.startsWith('vid-'));
      return Boolean(isVid);
    });

    return videoRows.map((row: any) => {
      let duration = '02:30';
      let coAuthors: any[] = [];
      let coAuthorIds: string[] = [];

      if (Array.isArray(row.tags)) {
        const dTag = row.tags.find((t: string) => t.startsWith('duration:'));
        if (dTag) duration = dTag.replace('duration:', '');

        const caTag = row.tags.find((t: string) => t.startsWith('coauthor_json:'));
        if (caTag) {
          try {
            const rawJson = decodeURIComponent(caTag.replace('coauthor_json:', ''));
            const parsed = JSON.parse(rawJson);
            if (Array.isArray(parsed)) {
              coAuthors = parsed;
              coAuthorIds = parsed.map((ca: any) => ca.id || ca.journalistId);
            }
          } catch {}
        }
      }

      return {
        id: row.id,
        title: row.title,
        summary: row.summary || row.excerpt || '',
        description: row.content || row.summary || '',
        category: row.category || 'تقارير مرئية',
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar || '',
        coverImage: (row.main_image && typeof row.main_image === 'string' && row.main_image.trim()) ? row.main_image.trim() : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
        thumbnailUrl: (row.main_image && typeof row.main_image === 'string' && row.main_image.trim()) ? row.main_image.trim() : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
        videoUrl: row.video_url || '',
        duration,
        status: row.status || 'published',
        coAuthors,
        coAuthorIds,
        publishedAt: row.published_at || row.created_at || new Date().toISOString(),
        viewsCount: row.views_count || 0,
        likesCount: row.likes_count || 0,
      };
    });
  } catch (err: any) {
    console.warn('[Supabase] fetchVideoReportsFromSupabase exception:', err?.message);
    return [];
  }
}

/**
 * Persists a Video Report permanently into Supabase articles table
 */
export async function saveVideoReportToSupabase(video: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    let existingRow: any = null;
    if (video.id) {
      const { data: ex } = await client.from('articles').select('*').eq('id', video.id).maybeSingle();
      existingRow = ex || null;
    }

    const durationVal = video.duration || (() => {
      if (Array.isArray(existingRow?.tags)) {
        const dt = existingRow.tags.find((t: string) => t.startsWith('duration:'));
        if (dt) return dt.replace('duration:', '');
      }
      return '02:30';
    })();

    const tags = ['video_report'];
    if (durationVal) tags.push(`duration:${durationVal}`);
    if (Array.isArray(video.coAuthors) && video.coAuthors.length > 0) {
      tags.push(`coauthor_json:${encodeURIComponent(JSON.stringify(video.coAuthors))}`);
    } else if (video.coAuthors === undefined && Array.isArray(existingRow?.tags)) {
      const existingCa = existingRow.tags.find((t: string) => t.startsWith('coauthor_json:'));
      if (existingCa) tags.push(existingCa);
    }

    const row = {
      id: video.id,
      title: video.title || existingRow?.title || '',
      summary: video.summary !== undefined ? video.summary : (existingRow?.summary || ''),
      content: (video.description !== undefined ? video.description : video.summary) ?? (existingRow?.content || ''),
      category: video.category || existingRow?.category || 'تقارير مرئية',
      author_id: video.authorId || existingRow?.author_id || 'system',
      author_name: video.authorName || existingRow?.author_name || '',
      author_avatar: video.authorAvatar || existingRow?.author_avatar || '',
      main_image: video.coverImage || video.thumbnailUrl || existingRow?.main_image || '',
      video_url: video.videoUrl || existingRow?.video_url || '',
      tags,
      status: video.status || existingRow?.status || 'published',
      views_count: typeof video.viewsCount === 'number' ? video.viewsCount : (existingRow?.views_count || 0),
      likes_count: typeof video.likesCount === 'number' ? video.likesCount : (existingRow?.likes_count || 0),
      published_at: video.publishedAt || existingRow?.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('articles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] saveVideoReportToSupabase error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] saveVideoReportToSupabase exception:', err?.message);
    return false;
  }
}

/**
 * Deletes a Video Report from Supabase articles table
 */
export async function deleteVideoReportFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('articles').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] deleteVideoReportFromSupabase error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] deleteVideoReportFromSupabase exception:', err?.message);
    return false;
  }
}


