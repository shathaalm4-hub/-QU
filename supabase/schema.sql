-- ==============================================================================
-- QU Journalism Newspaper - Supabase Database Schema & Production Accreditation System
-- File: /supabase/schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ACCREDITATION REQUESTS TABLE
-- ------------------------------------------------------------------------------
-- Compatible 100% with server.ts, scripts/migrate-accreditation-to-supabase.ts,
-- and existing data/database.json schema.
CREATE TABLE IF NOT EXISTS public.accreditation_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    student_id TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    major TEXT NOT NULL DEFAULT 'صحافة ونشر رقمي',
    academic_level TEXT NOT NULL DEFAULT 'المستوى الأول',
    avatar TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    skills TEXT[] NOT NULL DEFAULT '{}',
    phone TEXT,
    national_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'archived')),
    rejection_reason TEXT,
    notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast queries and administrative filters
CREATE INDEX IF NOT EXISTS idx_accreditation_requests_status ON public.accreditation_requests(status);
CREATE INDEX IF NOT EXISTS idx_accreditation_requests_email ON public.accreditation_requests(email);
CREATE INDEX IF NOT EXISTS idx_accreditation_requests_student_id ON public.accreditation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_requests_user_id ON public.accreditation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_requests_created_at ON public.accreditation_requests(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. ACCREDITATION AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
-- Compatible with server.ts, supabaseServer.ts, and automatic PostgreSQL trigger.
CREATE TABLE IF NOT EXISTS public.accreditation_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('log-' || extract(epoch from now())::bigint || '-' || substring(md5(random()::text) from 1 for 6)),
    request_id TEXT NOT NULL REFERENCES public.accreditation_requests(id) ON DELETE RESTRICT,
    action TEXT NOT NULL DEFAULT 'STATUS_CHANGE',
    previous_status TEXT,
    new_status TEXT,
    actor_id TEXT,
    actor_name TEXT,
    actor_email TEXT,
    actor_role TEXT NOT NULL DEFAULT 'admin',
    performed_by TEXT NOT NULL DEFAULT 'نظام الاعتماد',
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accreditation_audit_logs_request_id ON public.accreditation_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_audit_logs_created_at ON public.accreditation_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accreditation_audit_logs_performed_at ON public.accreditation_audit_logs(performed_at DESC);

-- ------------------------------------------------------------------------------
-- 3. AUTOMATIC TIMESTAMP & AUDIT LOG TRIGGERS
-- ------------------------------------------------------------------------------

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_accreditation_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_accreditation_request_timestamp ON public.accreditation_requests;
CREATE TRIGGER trg_update_accreditation_request_timestamp
BEFORE UPDATE ON public.accreditation_requests
FOR EACH ROW EXECUTE FUNCTION update_accreditation_request_timestamp();

-- Function & Trigger: Automatically create immutable Audit Log whenever status changes
-- Privacy-safe: DOES NOT store personal identifiers (email, student_id) in metadata
CREATE OR REPLACE FUNCTION log_accreditation_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
    v_notes TEXT;
BEGIN
    -- Only trigger when status actually changes
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        v_actor_name := COALESCE(NEW.reviewed_by, 'المشرف العام - إدارة التحرير');
        v_notes := COALESCE(NEW.notes, NEW.rejection_reason, 'تغيير حالة الطلب من ' || OLD.status || ' إلى ' || NEW.status);

        INSERT INTO public.accreditation_audit_logs (
            id,
            request_id,
            action,
            previous_status,
            new_status,
            actor_name,
            actor_role,
            performed_by,
            performed_at,
            reason,
            notes,
            created_at,
            metadata
        ) VALUES (
            'log-' || extract(epoch from now())::bigint || '-' || substring(md5(random()::text) from 1 for 6),
            NEW.id,
            'STATUS_CHANGE_TO_' || UPPER(NEW.status),
            OLD.status,
            NEW.status,
            v_actor_name,
            'admin',
            v_actor_name,
            NOW(),
            NEW.rejection_reason,
            v_notes,
            NOW(),
            jsonb_build_object(
                'source', 'postgres_trigger',
                'change_timestamp', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_accreditation_status_change ON public.accreditation_requests;
CREATE TRIGGER trg_log_accreditation_status_change
AFTER UPDATE ON public.accreditation_requests
FOR EACH ROW EXECUTE FUNCTION log_accreditation_status_change();

-- ------------------------------------------------------------------------------
-- 4. DELETE PROTECTION & AUDIT IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------

-- Prevent deletion of accreditation requests in production (Must use archive)
CREATE OR REPLACE FUNCTION prevent_accreditation_requests_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Deletion of accreditation requests is strictly prohibited in production. Use archive status instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_accreditation_requests_delete ON public.accreditation_requests;
CREATE TRIGGER trg_prevent_accreditation_requests_delete
BEFORE DELETE ON public.accreditation_requests
FOR EACH ROW EXECUTE FUNCTION prevent_accreditation_requests_delete();

-- Prevent modification or deletion of audit logs (Immutable history)
CREATE OR REPLACE FUNCTION prevent_accreditation_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are strictly immutable. Updates and deletions are prohibited.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_logs_mutation ON public.accreditation_audit_logs;
CREATE TRIGGER trg_prevent_audit_logs_mutation
BEFORE UPDATE OR DELETE ON public.accreditation_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_accreditation_audit_logs_mutation();

-- ------------------------------------------------------------------------------
-- 5. FUNCTION EXECUTION SECURITY HARDENING (REVOKE DIRECT RPC INVOCATION)
-- ------------------------------------------------------------------------------
-- Explicitly revoke direct function execution privileges from PUBLIC, anon, and authenticated.
-- Note: In PostgreSQL, trigger functions execute automatically under table context / trigger caller,
-- while direct RPC invocation (e.g., via PostgREST /rpc endpoints) is strictly blocked.

REVOKE EXECUTE ON FUNCTION update_accreditation_request_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION log_accreditation_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION prevent_accreditation_requests_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION prevent_accreditation_audit_logs_mutation() FROM PUBLIC, anon, authenticated;

-- Ensure service_role and postgres maintain execution rights for triggers and server operations
GRANT EXECUTE ON FUNCTION update_accreditation_request_timestamp() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION log_accreditation_status_change() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION prevent_accreditation_requests_delete() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION prevent_accreditation_audit_logs_mutation() TO postgres, service_role;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Strict Zero-Trust Backend Enforcement)
-- ------------------------------------------------------------------------------
ALTER TABLE public.accreditation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service Role (Used exclusively by trusted backend server.ts via SUPABASE_SERVICE_ROLE_KEY)
DROP POLICY IF EXISTS "Service role full access on accreditation_requests" ON public.accreditation_requests;
CREATE POLICY "Service role full access on accreditation_requests"
ON public.accreditation_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on accreditation_audit_logs" ON public.accreditation_audit_logs;
CREATE POLICY "Service role full access on accreditation_audit_logs"
ON public.accreditation_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Drop any previous public or authenticated policies on accreditation_requests
DROP POLICY IF EXISTS "Public can submit accreditation requests" ON public.accreditation_requests;
DROP POLICY IF EXISTS "Public can read approved journalists requests" ON public.accreditation_requests;

-- Zero direct access for anon and authenticated users:
-- All inserts, reads, updates, and deletes from anon/authenticated are strictly DENIED by RLS.
-- Submission, approval, rejection, and archiving are exclusively handled by the trusted Backend API.

-- ------------------------------------------------------------------------------
-- 7. PUBLIC JOURNALISTS VIEW (Editorial Directory View Only)
-- ------------------------------------------------------------------------------
-- Exposes ONLY public editorial info for approved student journalists.
-- Excludes: user_id, email, student_id, national_id, phone, reviewed_by,
-- reviewed_at, notes, rejection_reason.
CREATE OR REPLACE VIEW public.public_approved_journalists AS
SELECT
    id,
    name,
    major,
    academic_level,
    avatar,
    bio,
    skills
FROM public.accreditation_requests
WHERE status = 'approved';

-- Grant SELECT on public view to anon and authenticated
GRANT SELECT ON public.public_approved_journalists TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. ARTICLES TABLE & RLS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'جامعة',
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT DEFAULT '',
    author_major TEXT DEFAULT '',
    author_student_id TEXT DEFAULT '',
    main_image TEXT DEFAULT '',
    extra_images TEXT[] DEFAULT '{}',
    video_url TEXT DEFAULT '',
    gallery_images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'needs_edit', 'rejected')),
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at DESC);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on articles" ON public.articles;
CREATE POLICY "Service role full access on articles"
ON public.articles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;
CREATE POLICY "Public can view published articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- ------------------------------------------------------------------------------
-- 9. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on categories" ON public.categories;
CREATE POLICY "Service role full access on categories"
ON public.categories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);

-- Insert default categories
INSERT INTO public.categories (name) VALUES
    ('جامعة'), ('تعليم'), ('مجتمع'), ('اقتصاد'), ('رياضة'),
    ('ثقافة وفنون'), ('تقنية'), ('عالمي'), ('حياة طلابية'), ('قصص'), ('مقالات')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. ATOMIC STATUS UPDATE RPC (Race Condition Protection)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_accreditation_status_atomic(
    p_request_id TEXT,
    p_new_status TEXT,
    p_expected_status TEXT[],
    p_reviewed_by TEXT,
    p_rejection_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_updated public.accreditation_requests%ROWTYPE;
BEGIN
    UPDATE public.accreditation_requests
    SET status = p_new_status,
        reviewed_by = p_reviewed_by,
        reviewed_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE reviewed_at END,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_rejection_reason ELSE NULL END,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_request_id
      AND (p_expected_status IS NULL OR status = ANY(p_expected_status))
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'CONFLICT_OR_NOT_FOUND');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_accreditation_status_atomic(TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 11. SUPABASE STORAGE BUCKETS (news-images, avatars, attachments)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('news-images', 'news-images', true),
    ('avatars', 'avatars', true),
    ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Public read access on public media buckets
DROP POLICY IF EXISTS "Public media read access" ON storage.objects;
CREATE POLICY "Public media read access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('news-images', 'avatars'));

-- ------------------------------------------------------------------------------
-- 12. USERS TABLE & RLS (Zero Data Loss Persistence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'editor', 'journalist', 'student', 'supervisor')),
    password_hash TEXT, -- Stored exclusively in scrypt:salt:hash format
    student_id TEXT DEFAULT '',
    major TEXT DEFAULT '',
    academic_level TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    rejection_reason TEXT,
    badges JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{"articlesCount": 0, "reportsCount": 0, "albumsCount": 0, "viewsCount": 0}'::jsonb,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Zero direct public access to public.users table to prevent password_hash or PII leakage
REVOKE ALL ON public.users FROM anon, authenticated;

-- Public view exposing only non-sensitive profile details
CREATE OR REPLACE VIEW public.public_users AS
SELECT
    id,
    name,
    role,
    major,
    academic_level,
    avatar,
    bio,
    skills,
    status,
    badges,
    stats,
    registered_at
FROM public.users;

GRANT SELECT ON public.public_users TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 13. ARTICLE AUTHORS (CO-AUTHORS) TABLE & RLS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_authors (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    journalist_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'co_author' CHECK (role IN ('primary', 'co_author')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_authors_article_id ON public.article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_journalist_id ON public.article_authors(journalist_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_article_authors_unique_pair ON public.article_authors(article_id, journalist_id);

ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on article_authors" ON public.article_authors;
CREATE POLICY "Service role full access on article_authors"
ON public.article_authors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view article authors" ON public.article_authors;
CREATE POLICY "Public can view article authors"
ON public.article_authors
FOR SELECT
TO anon, authenticated
USING (true);



