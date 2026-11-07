import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  User, 
  Article, 
  VideoReport, 
  PhotoAlbum, 
  FullStory, 
  ContentCategory, 
  UserRole, 
  ArticleStatus, 
  JournalistStatus,
  JournalistRequest
} from '../types';
import { 
  getItem, 
  setItem, 
  savePermanentApprovedJournalists, 
  getPermanentApprovedJournalists, 
  savePermanentPublishedArticles, 
  getPermanentPublishedArticles 
} from '../utils/storage';
import { logTrace } from '../lib/traceLogger';

export const REMOVED_CATEGORIES = new Set(['حياة طلابية', 'حياه طلابيه', 'محلي', 'أخبار الطلاب', 'تعليم']);

export const DEFAULT_CATEGORIES: ContentCategory[] = [
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

let activeCurrentUser: User | null = null;

export function setActiveCurrentUser(user: User | null) {
  activeCurrentUser = user;
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        const serialized = JSON.stringify(user);
        window.sessionStorage?.setItem('qu_auth_user', serialized);
        window.localStorage?.setItem('qu_auth_user', serialized);
      } else {
        window.sessionStorage?.removeItem('qu_auth_user');
        window.localStorage?.removeItem('qu_auth_user');
      }
    } catch {}
  }
}

export function getAuthToken(): string {
  try {
    return sessionStorage.getItem('qu_auth_token') || localStorage.getItem('qu_auth_token') || '';
  } catch {
    return '';
  }
}

export function getAuthHeaders(options?: { isFormData?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!options?.isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    let u: any = activeCurrentUser;
    if (!u) {
      const raw =
        sessionStorage.getItem('qu_auth_user') ||
        sessionStorage.getItem('qu_current_user') ||
        localStorage.getItem('qu_auth_user') ||
        localStorage.getItem('qu_current_user');
      if (raw) {
        u = JSON.parse(raw);
      }
    }
    if (u) {
      if (u.id) headers['x-user-id'] = String(u.id);
      if (u.email) headers['x-user-email'] = String(u.email);
      if (u.role) headers['x-user-role'] = String(u.role);
      if (u.studentId) headers['x-user-student-id'] = String(u.studentId);
      if (u.name) headers['x-user-name'] = encodeURIComponent(String(u.name));
    }
  } catch {}
  return headers;
}

// Pre-configured Admin, Editor, and accredited student journalist
export const DEFAULT_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'المشرف العام - إدارة التحرير',
    email: 'admin@qu.edu.sa',
    password: 'Admin@QU2026',
    role: 'admin',
    status: 'approved',
    major: 'إعلام واتصال',
    academicLevel: 'هيئة التدريس / الإدارة',
    bio: 'المشرف العام على صحيفة QU الرقمية بقسم الإعلام والاتصال - جامعة القصيم.',
    registeredAt: '2026-01-15T08:00:00Z',
    stats: {
      articlesCount: 0,
      reportsCount: 0,
      albumsCount: 0,
      viewsCount: 0,
      likesCount: 0,
    },
  },
  {
    id: 'user-editor-1',
    name: 'رئيس التحرير التنفيذي',
    email: 'editor@qu.edu.sa',
    password: 'Editor@QU2026',
    role: 'editor',
    status: 'approved',
    major: 'صحافة ونشر رقمي',
    academicLevel: 'هيئة التحرير',
    bio: 'المحرر المسؤول عن مراجعة وتدقيق المواد الصحفية الطلابية قبل النشر.',
    registeredAt: '2026-02-01T08:00:00Z',
    stats: {
      articlesCount: 0,
      reportsCount: 0,
      albumsCount: 0,
      viewsCount: 0,
      likesCount: 0,
    },
  },
  {
    id: 'jour-sultan-1',
    name: 'سلطان الناصر (صحفي معتمد)',
    email: 'sultan.press@qu.edu.sa',
    password: 'TestPassword@2026',
    studentId: '4722355631',
    role: 'journalist',
    status: 'approved',
    major: 'صحافة ونشر رقمي',
    academicLevel: 'المستوى الثالث',
    bio: 'صحفي طلابي معتمد ومسؤول التغطيات المرئية والميدانية بقسم الإعلام والاتصال.',
    registeredAt: '2026-02-15T08:00:00Z',
    stats: {
      articlesCount: 1,
      reportsCount: 0,
      albumsCount: 0,
      viewsCount: 342,
      likesCount: 28,
    },
    badges: [
      {
        id: 'b-approved',
        name: 'صحفي معتمد',
        description: 'معتمد رسمياً في صحيفة QU',
        iconName: 'Award',
        awardedAt: '2026-02-15T08:00:00Z',
      }
    ],
  },
];

export const DEFAULT_ARTICLES: Article[] = [
  {
    id: 'art-video-demo-1',
    title: 'تغطية مرئية: انطلاق الملتقى الإعلامي السنوي الثاني في رحاب جامعة القصيم',
    excerpt: 'شهد الحرم الجامعي حضوراً وتفاعلاً كبيراً مع افتتاح فعاليات الملتقى الإعلامي الطلابي بمشاركة نخبة من الأكاديميين والممارسين الإعلاميين.',
    content: 'افتتحت جامعة القصيم صباح اليوم أعمال الملتقى الإعلامي السنوي الثاني، الذي ينظمه قسم الإعلام والاتصال بالتعاون مع صحيفة QU الطلابية. وتضمن الحفل جلسات حوارية وورش عمل متخصصة في صحافة الموبايل، والإنتاج المرئي، والذكاء الاصطناعي في غرف الأخبار.\n\nورافق التغطية إنتاج تقرير مرئي ميداني يوثق آراء الطلاب والمسؤولين المشاركين في المعرض المصاحب.',
    category: 'جامعة',
    kind: 'خبر',
    mediaType: 'article',
    mainImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    videoUrl: '',
    authorId: 'jour-sultan-1',
    authorName: 'سلطان الناصر (صحفي معتمد)',
    authorEmail: 'sultan.press@qu.edu.sa',
    authorMajor: 'صحافة ونشر رقمي',
    authorStudentId: '4722355631',
    status: 'published',
    publishedAt: '2026-10-06T10:00:00.000Z',
    createdAt: '2026-10-06T09:30:00.000Z',
    updatedAt: '2026-10-06T10:00:00.000Z',
    viewsCount: 342,
    likesCount: 28,
    readingTimeMinutes: 3,
    isFeatured: true,
    isBreaking: false,
    eventDate: '2026-10-06',
    location: 'المركز الثقافي - المدينة الجامعية',
    sources: 'المركز الإعلامي لجامعة القصيم',
    keywords: ['الملتقى الإعلامي', 'جامعة القصيم', 'تغطية مرئية', 'طلاب الإعلام'],
  },
];
export const DEFAULT_VIDEOS: VideoReport[] = [];
export const DEFAULT_ALBUMS: PhotoAlbum[] = [];

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface NewsContextType {
  // Auth
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<{
    success: boolean;
    message: string;
    status?: string;
    requiresPasswordSetup?: boolean;
    userInfo?: { userId?: string; studentId?: string; email?: string; name?: string };
  }>;
  setupLegacyPassword: (identifier: string, newPassword: string, isReset?: boolean) => Promise<{
    success: boolean;
    message: string;
    user?: User;
  }>;
  logout: () => void;
  registerJournalist: (userData: Partial<User>) => Promise<{ success: boolean; message: string }>;
  approveJournalist: (userId: string) => Promise<void>;
  rejectJournalist: (userId: string, reason?: string) => Promise<void>;
  deleteJournalist: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateJournalistProfile: (profileData: {
    name?: string;
    avatar?: string;
    bio?: string;
    major?: string;
    academicLevel?: string;
    skills?: string[];
  }) => Promise<{ success: boolean; message: string; user?: User }>;

  // Accreditation Requests
  journalistRequests: JournalistRequest[];
  pendingJournalists: User[];
  updateAccreditationStatus: (requestId: string, status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived', reason?: string, notes?: string) => Promise<{ success: boolean; message: string }>;
  fetchAccreditationRequests: (filter?: { status?: string; search?: string }) => Promise<void>;

  // Articles
  articles: Article[];
  publishedArticles: Article[];
  breakingArticles: Article[];
  featuredArticle: Article | null;
  submitArticle: (articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'likesCount' | 'readingTimeMinutes'>) => Promise<string>;
  updateArticle: (id: string, articleData: Partial<Article>) => Promise<void>;
  approveArticle: (id: string) => Promise<void>;
  requestArticleEdits: (id: string, notes: string) => Promise<void>;
  requestEditArticle: (id: string, notes: string) => Promise<void>;
  rejectArticle: (id: string, reason: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  deleteArticleVideo: (articleId: string) => Promise<{ success: boolean; message: string }>;
  toggleArticleBreaking: (id: string) => Promise<void>;
  toggleBreaking: (id: string) => Promise<void>;
  toggleArticleFeatured: (id: string) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  incrementArticleViews: (id: string) => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
  toggleArticleLike: (id: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  hasLiked: (id: string) => boolean;

  // Video Reports
  videoReports: VideoReport[];
  submitVideoReport: (reportData: Omit<VideoReport, 'id' | 'publishedAt' | 'viewsCount'>) => Promise<string>;
  updateVideoReport: (id: string, updates: Partial<VideoReport>) => Promise<void>;
  deleteVideoReport: (id: string) => Promise<void>;
  incrementVideoViews: (id: string) => Promise<void>;
  syncVideoReports: () => Promise<VideoReport[]>;

  // Photo Albums
  photoAlbums: PhotoAlbum[];
  submitPhotoAlbum: (albumData: Omit<PhotoAlbum, 'id' | 'publishedAt' | 'viewsCount'>) => Promise<string>;
  deletePhotoAlbum: (id: string) => Promise<void>;
  incrementAlbumViews: (id: string) => Promise<void>;

  // Full Story
  fullStories: FullStory[];
  submitFullStory: (storyData: Omit<FullStory, 'id' | 'viewsCount' | 'lastUpdated'>) => Promise<string>;
  addFullStoryUpdate: (storyId: string, update: Omit<FullStory['updates'][0], 'id' | 'timestamp'>) => Promise<void>;
  deleteFullStory: (id: string) => Promise<void>;

  // Categories
  categories: string[];
  addCategory: (categoryName: string) => void;
  deleteCategory: (categoryName: string) => void;
  removeCategory: (categoryName: string) => void;

  // Search & Global state
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Dev sample content seeder (optional helper button for admin preview if desired)
  seedDemoContent: () => Promise<void>;
  resetToEmptyState: () => Promise<void>;
  refreshData: (silent?: boolean) => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const isDisallowedArticle = (a: any): boolean => {
  if (!a || !a.id) return true;
  const id = String(a.id);
  const title = String(a.title || '');
  return Boolean(
    id.startsWith('art-demo-') ||
    id.startsWith('art-qu-10') ||
    id.startsWith('art-e2e-') ||
    id === 'vid-a518ia2' ||
    id.includes('a518ia2') ||
    id.includes('1791219023276') ||
    title.includes('1791219023276') ||
    title.includes('تقرير مرئي اختباري') ||
    title.includes('تجربه لمسار') ||
    title.includes('تجربة لمسار') ||
    title.includes('المسار الجديد') ||
    title.includes('مسار الاخبار الجديد') ||
    title.includes('مسار الأخبار الجديد') ||
    a.authorId === 'jour-demo-1'
  );
};

export const isDisallowedVideo = (v: any): boolean => {
  if (!v || !v.id) return true;
  const id = String(v.id);
  const title = String(v.title || '');
  return Boolean(
    id.startsWith('vid-demo-') ||
    id.startsWith('vid-qu-') ||
    id.startsWith('vid-test-') ||
    id.startsWith('vid-e2e-') ||
    id === 'vid-a518ia2' ||
    id.includes('a518ia2') ||
    id.includes('1791219023276') ||
    id === 'vid-86ocmpt' ||
    title.includes('1791219023276') ||
    title.includes('تقرير مرئي اختباري') ||
    title.includes('تجربه لمسار') ||
    title.includes('تجربة لمسار') ||
    title.includes('المسار الجديد') ||
    title.includes('مسار الاخبار الجديد') ||
    title.includes('مسار الأخبار الجديد') ||
    v.authorId === 'jour-demo-1'
  );
};

export const NewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const setCurrentUser = useCallback((userOrUpdater: User | null | ((prev: User | null) => User | null)) => {
    if (typeof userOrUpdater !== 'function') {
      setActiveCurrentUser(userOrUpdater);
    }
    setCurrentUserState((prev) => {
      const next = typeof userOrUpdater === 'function' ? userOrUpdater(prev) : userOrUpdater;
      setActiveCurrentUser(next);
      return next;
    });
  }, []);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [journalistRequests, setJournalistRequests] = useState<JournalistRequest[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [videoReports, setVideoReports] = useState<VideoReport[]>([]);
  const [photoAlbums, setPhotoAlbums] = useState<PhotoAlbum[]>([]);
  const [fullStories, setFullStories] = useState<FullStory[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Toast helper
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load persistent data
  useEffect(() => {
    async function loadData() {
      try {
        // Immediately purge test or unwanted items from client browser storage
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            ['qu_videos', 'qu_articles', 'qu_permanent_published_articles'].forEach((k) => {
              const item = window.localStorage.getItem(k);
              if (item) {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed)) {
                  const cleaned = parsed.filter((x: any) => !isDisallowedVideo(x) && !isDisallowedArticle(x));
                  window.localStorage.setItem(k, JSON.stringify(cleaned));
                }
              }
            });
          } catch {}
        }

        const rawUsers = await getItem<User[]>('qu_users', DEFAULT_USERS);
        const rawRequests = await getItem<JournalistRequest[]>('qu_journalist_requests', []);
        const rawArticles = await getItem<Article[]>('qu_articles', DEFAULT_ARTICLES);
        const rawVideos = await getItem<VideoReport[]>('qu_videos', []);
        const rawAlbums = await getItem<PhotoAlbum[]>('qu_albums', []);
        const savedStories = await getItem<FullStory[]>('qu_stories', []);
        const savedCategories = await getItem<string[]>('qu_categories', DEFAULT_CATEGORIES);
        const savedAuth = await getItem<User | null>('qu_auth_user', null);
        const savedTheme = await getItem<boolean>('qu_dark_mode', false);

        // Fail-safe permanent cache loading
        const permJournalists = await getPermanentApprovedJournalists<User>(DEFAULT_USERS);
        const permArticles = await getPermanentPublishedArticles<Article>(DEFAULT_ARTICLES);

        // Filter out any legacy demo accounts or dummy articles
        const savedUsers = (rawUsers || [])
          .filter((u) => u.id !== 'jour-demo-1' && u.name !== 'عبدالرحمن الشهري');
        const savedArticles = (rawArticles || []).filter((a) => !isDisallowedArticle(a));
        const savedVideos = (rawVideos || []).filter((v) => !isDisallowedVideo(v));
        const savedAlbums = (rawAlbums || [])
          .filter((alb) => !alb.id?.startsWith('alb-demo-') && !alb.id?.startsWith('alb-qu-') && alb.authorId !== 'jour-demo-1');

        // Auto-migrate to new categories if old list detected or missing new categories
        let currentCategories = (savedCategories || []).filter((c) => !REMOVED_CATEGORIES.has(String(c).trim()));
        if (
          !currentCategories.length ||
          currentCategories.includes('أخبار الجامعة') ||
          !currentCategories.includes('جامعة') ||
          !currentCategories.includes('قصص') ||
          !currentCategories.includes('مقالات')
        ) {
          currentCategories = DEFAULT_CATEGORIES;
          await setItem('qu_categories', DEFAULT_CATEGORIES);
        } else if (savedCategories && savedCategories.length !== currentCategories.length) {
          await setItem('qu_categories', currentCategories);
        }

        // Merge saved articles with immutable permanent published articles
        const allArticlesMap = new Map<string, Article>();
        for (const pa of (permArticles || []).filter((a) => !isDisallowedArticle(a))) {
          allArticlesMap.set(pa.id, pa);
        }
        for (const a of savedArticles) {
          if (!isDisallowedArticle(a)) {
            allArticlesMap.set(a.id, a);
          }
        }
        if (allArticlesMap.size === 0) {
          for (const da of DEFAULT_ARTICLES) {
            allArticlesMap.set(da.id, da);
          }
        }

        // Migrate and normalize articles
        const normalizedArticles = Array.from(allArticlesMap.values()).map((art) => {
          let updatedCat = art.category;
          if (art.category === 'أخبار الجامعة') updatedCat = 'جامعة';
          if (art.category === 'تحقيقات ومقالات' || (art.category as string) === 'تعليم') updatedCat = 'جامعة';
          if ((art.category as string) === 'أخبار الطلاب' || (art.category as string) === 'حياة طلابية' || (art.category as string) === 'محلي') updatedCat = 'جامعة';
          if (art.category === 'المجتمع') updatedCat = 'مجتمع';
          if (art.category === 'ثقافة') updatedCat = 'ثقافة وفنون';
          
          const validStatuses = ['draft', 'under_review', 'needs_edit', 'rejected', 'published', 'approved'];
          const updatedStatus = validStatuses.includes(art.status) ? art.status : 'published';
          return { 
            ...art, 
            category: updatedCat, 
            kind: art.kind || 'خبر',
            status: updatedStatus,
            publishedAt: art.publishedAt || art.createdAt || new Date().toISOString(),
          };
        });

        // Only filter out legacy dummy demo accounts (never filter real users or newly created journalists)
        const isTestUser = (u: any) =>
          !u ||
          u.id === 'jour-demo-1' ||
          u.name === 'عبدالرحمن الشهري';

        const isTestRequest = (r: any) =>
          !r ||
          r.userId === 'jour-demo-1' ||
          r.name === 'عبدالرحمن الشهري';

        let localDeleted: string[] = [];
        try {
          localDeleted = JSON.parse(localStorage.getItem('qu_deleted_user_ids') || '[]');
          if (Array.isArray(localDeleted)) {
            const restoredIds = [
              'jour-mtywkghfu9l1',
              'req-jour-mtywkghfu9l1',
              '472211562',
              '472211562@qu.edu.sa',
            ];
            const cleaned = localDeleted.filter(
              (id) => !restoredIds.includes((id || '').toLowerCase().trim())
            );
            if (cleaned.length !== localDeleted.length) {
              localDeleted = cleaned;
              localStorage.setItem('qu_deleted_user_ids', JSON.stringify(cleaned));
            }
          }
        } catch {}

        const isDeleted = (u?: any) => {
          if (!u) return false;
          const uid = (u.id || '').trim();
          const email = (u.email || '').toLowerCase().trim();
          const studentId = (u.studentId || u.student_id || '').trim();
          return localDeleted.some((d) => {
            const clean = d.toLowerCase().trim();
            return clean === uid.toLowerCase() || (email && clean === email) || (studentId && clean === studentId.toLowerCase());
          });
        };

        const usersMap = new Map<string, User>();
        for (const defU of DEFAULT_USERS) {
          if (!isTestUser(defU) && !isDeleted(defU)) {
            usersMap.set(defU.id, defU);
          }
        }
        for (const pj of permJournalists) {
          if (pj.id && !isTestUser(pj) && !isDeleted(pj)) {
            usersMap.set(pj.id, { ...pj, status: 'approved' });
          }
        }
        for (const su of savedUsers) {
          if (su.id && !isTestUser(su) && !isDeleted(su)) {
            const existing = usersMap.get(su.id);
            usersMap.set(su.id, existing?.status === 'approved' ? { ...su, status: 'approved' } : su);
          }
        }

        const mergedUsers = Array.from(usersMap.values());

        setUsers(mergedUsers);
        // Persist clean users immediately
        setItem('qu_users', mergedUsers);
        const approvedClean = mergedUsers.filter((u) => u.status === 'approved');
        savePermanentApprovedJournalists(approvedClean);

        const cleanInitialRequests = (rawRequests && Array.isArray(rawRequests))
          ? rawRequests.filter((r) => !isTestRequest(r))
          : [];
        setJournalistRequests(cleanInitialRequests);
        setItem('qu_journalist_requests', cleanInitialRequests);

        setArticles(normalizedArticles);
        setVideoReports(savedVideos);
        setPhotoAlbums(savedAlbums);
        setFullStories(savedStories || []);
        setCategories(currentCategories);
        
        // Prefer per-tab sessionStorage user if present so multi-tab sessions don't collide
        let tabAuth: User | null = null;
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            const rawTab = window.sessionStorage.getItem('qu_auth_user');
            if (rawTab) {
              const parsedTab = JSON.parse(rawTab);
              if (parsedTab && parsedTab.id && !isTestUser(parsedTab)) {
                tabAuth = parsedTab;
              }
            }
          } catch {}
        }

        // If current saved auth user was a deleted test account, log out
        const activeAuth = tabAuth || (savedAuth && !isTestUser(savedAuth) ? savedAuth : null);
        if (!activeAuth && savedAuth) {
          setItem('qu_auth_user', null);
        } else if (activeAuth) {
          setActiveCurrentUser(activeAuth);
        }
        setCurrentUser(activeAuth);
        setIsDarkMode(savedTheme);

        if (savedTheme) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        console.error('Failed to load storage data:', e);
      } finally {
        setIsInitialized(true);

        // Verify active session with server
        const token = getAuthToken();
        if (token || activeCurrentUser) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: getAuthHeaders(),
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success && meData.user) {
                // Only update if no activeCurrentUser was loaded, or if it matches the same user
                if (
                  !activeCurrentUser ||
                  activeCurrentUser.id === meData.user.id ||
                  activeCurrentUser.id?.replace(/^req-/, '') === meData.user.id?.replace(/^req-/, '') ||
                  (activeCurrentUser.email && meData.user.email && activeCurrentUser.email.toLowerCase() === meData.user.email.toLowerCase())
                ) {
                  setCurrentUser(meData.user);
                  await setItem('qu_auth_user', meData.user);
                }
              }
            }
          } catch {
            // offline or network fallback
          }
        }

        // Immediately fetch latest shared data directly from server database table
        try {
          const res = await fetch('/api/data', {
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.users) && data.users.length > 0) {
              const cleanUsers = data.users.filter(
                (u: User) => u.id !== 'jour-demo-1' && u.name !== 'عبدالرحمن الشهري'
              );
              setUsers(cleanUsers);
              await setItem('qu_users', cleanUsers);
              const approvedList = cleanUsers.filter((u: User) => u.status === 'approved');
              await savePermanentApprovedJournalists(approvedList);
            }
            if (Array.isArray(data.journalistRequests)) {
              setJournalistRequests(data.journalistRequests);
              await setItem('qu_journalist_requests', data.journalistRequests);
            }
            if (Array.isArray(data.articles)) {
              const cleanArticles = data.articles.filter((a: Article) => !isDisallowedArticle(a));
              if (cleanArticles.length > 0) {
                setArticles((prev) => {
                  const serverMap = new Map<string, Article>();
                  for (const a of cleanArticles) {
                    serverMap.set(a.id, a);
                  }
                  // Preserve any recently submitted local articles (e.g. under_review / draft) not yet in server response
                  const now = Date.now();
                  for (const localArt of prev) {
                    if (!localArt || !localArt.id || isDisallowedArticle(localArt)) continue;
                    if (!serverMap.has(localArt.id)) {
                      const createdMs = new Date(localArt.createdAt || localArt.updatedAt || 0).getTime();
                      const isRecentSubmission = now - createdMs < 5 * 60 * 1000;
                      const isOwnedByCurrent = Boolean(
                        activeCurrentUser &&
                        (localArt.authorId === activeCurrentUser.id ||
                         localArt.authorId?.replace(/^req-/, '') === activeCurrentUser.id?.replace(/^req-/, '') ||
                         (activeCurrentUser.studentId && localArt.authorStudentId === activeCurrentUser.studentId))
                      );
                      if (isRecentSubmission || (isOwnedByCurrent && localArt.status !== 'published')) {
                        serverMap.set(localArt.id, localArt);
                      }
                    }
                  }
                  const merged = Array.from(serverMap.values());
                  setItem('qu_articles', merged);
                  const publishedList = merged.filter((a: Article) => a.status === 'published' || (a.status as string) === 'approved');
                  if (publishedList.length > 0) {
                    savePermanentPublishedArticles(publishedList);
                  }
                  return merged;
                });
              } else {
                console.warn('[Sync-Safeguard] Initial server fetch returned empty articles array; retaining local articles.');
              }
            }
            if (Array.isArray(data.videoReports)) {
              const cleanVideos = data.videoReports.filter((v: VideoReport) => !isDisallowedVideo(v));
              setVideoReports(cleanVideos);
              await setItem('qu_videos', cleanVideos);
            }
            if (Array.isArray(data.photoAlbums)) {
              const cleanAlbums = data.photoAlbums.filter(
                (alb: PhotoAlbum) =>
                  !alb.id?.startsWith('alb-demo-') &&
                  !alb.id?.startsWith('alb-qu-') &&
                  alb.authorId !== 'jour-demo-1'
              );
              setPhotoAlbums(cleanAlbums);
              await setItem('qu_albums', cleanAlbums);
            }
            if (Array.isArray(data.fullStories)) {
              const cleanStories = data.fullStories.filter(
                (s: FullStory) =>
                  !s.id?.startsWith('story-demo-') &&
                  !s.id?.startsWith('story-qu-')
              );
              setFullStories(cleanStories);
              await setItem('qu_stories', cleanStories);
            }
            if (Array.isArray(data.categories) && data.categories.length) {
              const cleanedCats = data.categories.filter((c: string) => !REMOVED_CATEGORIES.has(String(c).trim()));
              setCategories(cleanedCats);
              await setItem('qu_categories', cleanedCats);
            }
          }
        } catch (err) {
          // ignore server fetch errors on initial load
        }
      }
    }
    loadData();
  }, []);

  // Periodic real-time sync with server database
  const syncWithServer = useCallback(async () => {
    logTrace('SYNC_WITH_SERVER_START');
    try {
      const res = await fetch('/api/data', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        logTrace('SYNC_WITH_SERVER_DATA_RECEIVED', {
          articlesCount: data.articles?.length,
          categoriesCount: data.categories?.length,
          usersCount: data.users?.length,
        });
        if (Array.isArray(data.users) && data.users.length > 0) {
          const cleanUsers = data.users.filter(
            (u: User) => u.id !== 'jour-demo-1' && u.name !== 'عبدالرحمن الشهري'
          );
          setUsers(cleanUsers);
          await setItem('qu_users', cleanUsers);
        }
        if (Array.isArray(data.journalistRequests)) {
          setJournalistRequests(data.journalistRequests);
          await setItem('qu_journalist_requests', data.journalistRequests);
        }
        if (Array.isArray(data.articles)) {
          const cleanArticles = data.articles.filter((a: Article) => !isDisallowedArticle(a));
          setArticles((prev) => {
            // Guard: If server returned empty articles, but local state already has articles,
            // DO NOT wipe local articles! Retain existing local articles.
            if (cleanArticles.length === 0 && prev.length > 0) {
              console.warn('[Sync-Safeguard] Server returned empty articles array while local state has articles. Keeping local articles.');
              return prev;
            }
            if (cleanArticles.length > 0) {
              const serverMap = new Map<string, Article>();
              for (const a of cleanArticles) {
                serverMap.set(a.id, a);
              }
              // Safeguard recently submitted/edited local articles so an in-flight sync never drops a just-submitted article
              const now = Date.now();
              for (const localArt of prev) {
                if (!localArt || !localArt.id || isDisallowedArticle(localArt)) continue;
                if (!serverMap.has(localArt.id)) {
                  const createdMs = new Date(localArt.createdAt || localArt.updatedAt || 0).getTime();
                  const isRecentSubmission = now - createdMs < 5 * 60 * 1000;
                  const isOwnedByCurrent = Boolean(
                    activeCurrentUser &&
                    (localArt.authorId === activeCurrentUser.id ||
                     localArt.authorId?.replace(/^req-/, '') === activeCurrentUser.id?.replace(/^req-/, '') ||
                     (activeCurrentUser.studentId && localArt.authorStudentId === activeCurrentUser.studentId))
                  );
                  if (isRecentSubmission || (isOwnedByCurrent && localArt.status !== 'published')) {
                    serverMap.set(localArt.id, localArt);
                  }
                }
              }
              const merged = Array.from(serverMap.values());
              setItem('qu_articles', merged);
              const publishedList = merged.filter((a: Article) => a.status === 'published' || (a.status as string) === 'approved');
              if (publishedList.length > 0) {
                savePermanentPublishedArticles(publishedList);
              }
              return merged;
            }
            return prev;
          });
        }
        if (Array.isArray(data.videoReports)) {
          const cleanVideos = data.videoReports.filter((v: VideoReport) => !isDisallowedVideo(v));
          setVideoReports(cleanVideos);
          await setItem('qu_videos', cleanVideos);
        }
        if (Array.isArray(data.photoAlbums)) {
          const cleanAlbums = data.photoAlbums.filter(
            (alb: PhotoAlbum) =>
              !alb.id?.startsWith('alb-demo-') &&
              !alb.id?.startsWith('alb-qu-') &&
              alb.authorId !== 'jour-demo-1'
          );
          setPhotoAlbums(cleanAlbums);
          await setItem('qu_albums', cleanAlbums);
        }
        if (Array.isArray(data.fullStories)) {
          const cleanStories = data.fullStories.filter(
            (s: FullStory) =>
              !s.id?.startsWith('story-demo-') &&
              !s.id?.startsWith('story-qu-')
          );
          setFullStories(cleanStories);
          await setItem('qu_stories', cleanStories);
        }
        if (Array.isArray(data.categories) && data.categories.length) {
          setCategories((prev) => {
            const cleaned = data.categories.filter((c: string) => !REMOVED_CATEGORIES.has(String(c).trim()));
            if (prev.length === cleaned.length && prev.every((c, idx) => c === cleaned[idx])) {
              return prev;
            }
            setItem('qu_categories', cleaned);
            return cleaned;
          });
        }
        logTrace('SYNC_WITH_SERVER_COMPLETED');
      }
    } catch {
      // silent fallback
    }
  }, []);

  // Production-optimized sync: event-driven (visibility/focus) + lightweight 60s fallback interval (Phase 5)
  useEffect(() => {
    if (!isInitialized) return;

    let lastSyncTime = Date.now();

    const handleVisibilityOrFocus = () => {
      const now = Date.now();
      // Sync on tab resume if at least 20 seconds have passed since last sync
      if (document.visibilityState === 'visible' && now - lastSyncTime >= 20000) {
        lastSyncTime = now;
        syncWithServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Lightweight 60-second background sync interval (replaces aggressive 3s polling)
    const timer = setInterval(() => {
      lastSyncTime = Date.now();
      syncWithServer();
    }, 60000);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isInitialized, syncWithServer]);

  const refreshData = async (silent?: boolean) => {
    await syncWithServer();
    if (!silent) {
      addToast('info', 'تحديث البيانات', 'تمت مزامنة أحدث البيانات وطلبات الانضمام بنجاح');
    }
  };

  // Sync users
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_users', users);
    }
  }, [users, isInitialized]);

  // Sync journalist requests
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_journalist_requests', journalistRequests);
    }
  }, [journalistRequests, isInitialized]);

  // Sync articles
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_articles', articles);
    }
  }, [articles, isInitialized]);

  // Sync videos
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_videos', videoReports);
    }
  }, [videoReports, isInitialized]);

  // Sync albums
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_albums', photoAlbums);
    }
  }, [photoAlbums, isInitialized]);

  // Sync stories
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_stories', fullStories);
    }
  }, [fullStories, isInitialized]);

  // Sync auth
  useEffect(() => {
    if (isInitialized) {
      setItem('qu_auth_user', currentUser);
    }
  }, [currentUser, isInitialized]);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      setItem('qu_dark_mode', next);
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Auth Methods
  const login = async (
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
    requiresPasswordSetup?: boolean;
    userInfo?: { userId?: string; studentId?: string; email?: string; name?: string };
  }> => {
    const trimmed = email.trim().toLowerCase();

    // 1. Authenticate strictly against persistent server endpoint (authoritative source of truth)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, password }),
      });

      let data: any = null;
      try {
        const text = await resp.text();
        data = JSON.parse(text);
      } catch {
        if (resp.status === 403 || resp.status === 401) {
          return { success: false, message: 'هذا الحساب غير متاح أو تمت أرشفته' };
        }
        return { success: false, message: 'حدث خطأ في قراءة استجابة خادم المصادقة' };
      }

      if (data.success && data.user) {
        if (data.token) {
          sessionStorage.setItem('qu_auth_token', data.token);
          localStorage.setItem('qu_auth_token', data.token);
        }
        setActiveCurrentUser(data.user);
        setCurrentUser(data.user);
        await setItem('qu_auth_user', data.user);
        addToast('success', 'مرحباً بك مجدداً', `تم تسجيل الدخول بنجاح كـ ${data.user.name}`);
        await syncWithServer();
        return { success: true, message: data.message || 'تم تسجيل الدخول بنجاح' };
      } else {
        // Special case: Legacy approved account requiring first-time password setup
        if (data.status === 'password_not_configured' || data.requiresPasswordSetup) {
          return {
            success: false,
            status: 'password_not_configured',
            requiresPasswordSetup: true,
            userInfo: {
              userId: data.userId,
              studentId: data.studentId,
              email: data.email,
              name: data.name,
            },
            message: data.message || 'يحتاج هذا الحساب إلى إعداد كلمة مرور لأول مرة.',
          };
        }

        // Any other response from the server (400, 401, 403, 404, etc.) is definitive.
        // Client-side auth fallback is NEVER permitted to bypass server verdict.
        return { success: false, message: data.message || 'بيانات الدخول غير صحيحة' };
      }
    } catch {
      // Server unreachable (network error)
    }

    // 2. Client-side fallback check:
    // STRICT RULE: All journalist accounts MUST authenticate server-side only.
    // Client-side auth bypass is strictly disabled for journalist accounts.
    const user = users.find(
      (u) =>
        u.email.trim().toLowerCase() === trimmed ||
        (u.studentId && u.studentId.trim().toLowerCase() === trimmed)
    );

    if (!user || user.role === 'journalist') {
      return {
        success: false,
        message: 'تعذر الاتصال بخادم المصادقة للتحقق من بيانات الدخول. يلزم التحقق عبر الخادم لحسابات الصحفيين.',
      };
    }

    // Emergency offline login ONLY for core staff accounts (admin/editor) if server is down
    if (user.password && user.password !== password) {
      return { success: false, message: 'كلمة المرور غير صحيحة' };
    }

    if (user.status === 'suspended') {
      return { success: false, message: 'هذا الحساب موقوف من قبل إدارة الصحيفة' };
    }

    setCurrentUser(user);
    await setItem('qu_auth_user', user);
    addToast('warning', 'وضع غير متصل', `تم تسجيل الدخول محلياً كـ ${user.name}`);
    return { success: true, message: 'تم تسجيل الدخول محلياً' };
  };

  const setupLegacyPassword = async (
    identifier: string,
    newPassword: string,
    isReset?: boolean
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      const resp = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          newPassword: newPassword.trim(),
          isReset: !!isReset,
        }),
      });
      let data: any = null;
      try {
        const text = await resp.text();
        data = JSON.parse(text);
      } catch {
        return { success: false, message: 'حدث خطأ في قراءة استجابة الخادم أثناء إعداد كلمة المرور' };
      }
      if (data.success && data.user) {
        if (data.token) {
          sessionStorage.setItem('qu_auth_token', data.token);
          localStorage.setItem('qu_auth_token', data.token);
        }
        setActiveCurrentUser(data.user);
        setCurrentUser(data.user);
        await setItem('qu_auth_user', data.user);
        addToast('success', 'تم إعداد كلمة المرور', data.message || 'تم إعداد وتثبيت كلمة المرور بنجاح');
        await syncWithServer();
        return { success: true, message: data.message, user: data.user };
      } else {
        return { success: false, message: data.message || 'تعذر إعداد كلمة المرور' };
      }
    } catch (err: any) {
      return { success: false, message: 'حدث خطأ في الاتصال بالخادم أثناء إعداد كلمة المرور' };
    }
  };

  const logout = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    try {
      sessionStorage.removeItem('qu_auth_token');
      localStorage.removeItem('qu_auth_token');
      sessionStorage.removeItem('qu_auth_user');
      localStorage.removeItem('qu_auth_user');
      sessionStorage.removeItem('qu_current_user');
      localStorage.removeItem('qu_current_user');
    } catch {}
    setActiveCurrentUser(null);
    setCurrentUser(null);
    await setItem('qu_auth_user', null);
    addToast('info', 'تسجيل الخروج', 'تم تسجيل الخروج بنجاح');
    syncWithServer();
  };

  const registerJournalist = async (userData: Partial<User>): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = (userData.email || '').trim().toLowerCase();
    
    // Check if email already approved locally
    const existing = users.find((u) => u.email.trim().toLowerCase() === trimmedEmail);
    if (existing && (existing.status === 'approved' || existing.role === 'admin' || existing.role === 'editor')) {
      return { success: false, message: 'هذا البريد الإلكتروني معتمد بالفعل، يمكنك تسجيل الدخول مباشرة ببياناتك' };
    }

    try {
      const res = await fetch('/api/journalists/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUsers((prev) => {
          const next = [...prev.filter((u) => u.email.toLowerCase() !== trimmedEmail), data.user];
          setItem('qu_users', next);
          return next;
        });
        if (data.request) {
          setJournalistRequests((prev) => [
            ...prev.filter((r) => r.id !== data.request.id && r.email?.toLowerCase() !== trimmedEmail),
            data.request,
          ]);
        }
        addToast('success', 'تم تقديم الطلب', 'تم إرسال طلب الانضمام بنجاح وهو قيد مراجعة هيئة التحرير والمشرف العام');
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'تعذر إرسال الطلب' };
      }
    } catch (err: any) {
      addToast('error', 'خدمة الاعتماد', 'خدمة الاعتماد غير متاحة حاليًا، يرجى المحاولة لاحقًا.');
      return { success: false, message: 'خدمة الاعتماد غير متاحة حاليًا، يرجى المحاولة لاحقًا.' };
    }
  };

  const updateAccreditationStatus = async (
    requestId: string,
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived',
    reason?: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/accreditation/requests/${requestId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          reason,
          notes,
          reviewerName: currentUser?.name || 'المشرف العام - إدارة التحرير',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Sync local request state with Supabase response
        setJournalistRequests((prev) =>
          prev.map((r) =>
            r.id === requestId || r.userId === requestId
              ? { ...r, status, rejectionReason: reason, notes, updatedAt: new Date().toISOString() }
              : r
          )
        );

        // Sync local users list immediately for reactive directory & account activation
        const reqObj = data.request || journalistRequests.find((r) => r.id === requestId || r.userId === requestId);
        const targetUserId = reqObj?.userId || (requestId.startsWith('req-') ? requestId.replace('req-', '') : requestId);
        const targetEmail = (reqObj?.email || '').toLowerCase().trim();
        const targetStudentId = (reqObj?.studentId || '').trim();

        setUsers((prev) => {
          let found = false;
          const next = prev.map((u) => {
            const isMatch =
              u.id === targetUserId ||
              (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail) ||
              (targetStudentId && u.studentId && u.studentId.trim() === targetStudentId);

            if (isMatch) {
              found = true;
              return {
                ...u,
                role: 'journalist' as const,
                status: (status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : status) as any,
                major: reqObj?.major || u.major,
                academicLevel: reqObj?.academicLevel || u.academicLevel,
                avatar: reqObj?.avatar || u.avatar,
                bio: reqObj?.bio || u.bio,
                skills: reqObj?.skills || u.skills,
                rejectionReason: status === 'rejected' ? reason : u.rejectionReason,
              };
            }
            return u;
          });

          if (!found && reqObj && status === 'approved') {
            next.push({
              id: targetUserId,
              name: reqObj.name || '',
              email: reqObj.email || '',
              studentId: reqObj.studentId || '',
              role: 'journalist' as const,
              status: 'approved' as const,
              major: reqObj.major || 'صحافة ونشر رقمي',
              academicLevel: reqObj.academicLevel || 'المستوى الأول',
              avatar: reqObj.avatar || '',
              bio: reqObj.bio || '',
              skills: reqObj.skills || ['التحرير الصحفي'],
              registeredAt: reqObj.createdAt || new Date().toISOString(),
              stats: { articlesCount: 0, reportsCount: 0, albumsCount: 0, viewsCount: 0, likesCount: 0 },
              badges: [
                {
                  id: 'b-approved',
                  name: 'صحفي معتمد',
                  description: 'معتمد رسمياً في صحيفة QU',
                  iconName: 'Award',
                  awardedAt: new Date().toISOString(),
                },
              ],
            });
          }

          const stripSensitiveUsers = (list: any[]) => list.map(({ password, ...u }) => u);
          setItem('qu_users', stripSensitiveUsers(next));
          const approvedJournalists = stripSensitiveUsers(next.filter((u) => u.status === 'approved' && u.role === 'journalist'));
          savePermanentApprovedJournalists(approvedJournalists);
          return next;
        });

        // Background server resync
        setTimeout(() => {
          syncWithServer();
        }, 300);

        addToast(
          status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
          'طلب الاعتماد',
          data.message || 'تم تحديث حالة الطلب بنجاح'
        );
        return { success: true, message: data.message };
      } else {
        addToast('error', 'تعذر التحديث', data.message || 'فشل تحديث حالة الطلب');
        return { success: false, message: data.message || 'فشل التحديث' };
      }
    } catch {
      addToast('error', 'خدمة الاعتماد', 'خدمة الاعتماد غير متاحة حاليًا، يرجى المحاولة لاحقًا.');
      return { success: false, message: 'خدمة الاعتماد غير متاحة حاليًا، يرجى المحاولة لاحقًا.' };
    }
  };

  const fetchAccreditationRequests = async (filter?: { status?: string; search?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filter?.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter?.search) params.append('search', filter.search);
      const res = await fetch(`/api/accreditation/requests?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.requests)) {
          setJournalistRequests(data.requests);
          await setItem('qu_journalist_requests', data.requests);
        }
      }
    } catch {
      // ignore
    }
  };

  const approveJournalist = async (userId: string) => {
    await updateAccreditationStatus(userId, 'approved');
  };

  const rejectJournalist = async (userId: string, reason?: string) => {
    const target = users.find((u) => u.id === userId);
    if (target && (target.status === 'approved' || target.role === 'admin' || target.role === 'editor' || target.id === 'jour-shatha-1')) {
      addToast('error', 'إجراء محظور', 'لا يمكن رفض أو إلغاء حساب صحفي معتمد رسمياً أو حساب إداري.');
      return;
    }
    await updateAccreditationStatus(userId, 'rejected', reason || 'لم يستوفِ الشروط المحددة');
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
    addToast('info', 'تحديث الصلاحية', `تم تعديل دور المستخدم إلى ${role}`);
  };

  const toggleUserStatus = async (userId: string) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'suspended' ? 'approved' : 'suspended';
          return { ...u, status: newStatus as JournalistStatus };
        }
        return u;
      });
      setItem('qu_users', next);
      return next;
    });
    addToast('info', 'تحديث الحالة', 'تم تغيير حالة الحساب');
  };

  const updateUserPassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = newPassword.trim();
    if (!trimmed) {
      addToast('warning', 'حقل مطلوب', 'يرجى إدخال كلمة مرور غير فارغة');
      return { success: false, message: 'كلمة المرور لا يمكن أن تكون فارغة' };
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      const data = await res.json();
      if (!data.success) {
        addToast('error', 'فشل التحديث', data.message || 'تعذر تحديث كلمة المرور');
        return { success: false, message: data.message || 'تعذر تحديث كلمة المرور' };
      }
    } catch (e) {
      console.warn('API password update failed, fallback to local update', e);
    }

    setUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? { ...u, password: trimmed } : u));
      setItem('qu_users', next);
      const approved = next.filter((u) => u.status === 'approved');
      if (approved.length > 0) {
        savePermanentApprovedJournalists(approved);
      }
      return next;
    });

    addToast('success', 'تم التحديث والتثبيت', 'تم تحديث كلمة المرور وتثبيتها بنجاح في قاعدة البيانات الدائمة');
    return { success: true, message: 'تم تحديث كلمة المرور بنجاح' };
  };

  const updateJournalistProfile = async (profileData: {
    name?: string;
    avatar?: string;
    bio?: string;
    major?: string;
    academicLevel?: string;
    skills?: string[];
  }): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      const res = await fetch('/api/journalists/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.message || 'حدث خطأ أثناء حفظ التعديلات في Supabase';
        addToast('error', 'فشل تحديث الملف الشخصي', errorMsg);
        return { success: false, message: errorMsg };
      }

      // Update currentUser reactive state
      if (currentUser) {
        const updatedCurrent: User = {
          ...currentUser,
          ...(data.user || {}),
          name: profileData.name || currentUser.name,
          avatar: profileData.avatar !== undefined ? profileData.avatar : currentUser.avatar,
          bio: profileData.bio !== undefined ? profileData.bio : currentUser.bio,
          major: profileData.major || currentUser.major,
          academicLevel: profileData.academicLevel || currentUser.academicLevel,
          skills: profileData.skills || currentUser.skills,
        };
        setCurrentUser(updatedCurrent);
        setItem('qu_auth_user', updatedCurrent);
      }

      // Update users array in local state
      setUsers((prev) => {
        const next = prev.map((u) => {
          if (
            u.id === currentUser?.id ||
            (currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
          ) {
            return {
              ...u,
              name: profileData.name || u.name,
              avatar: profileData.avatar !== undefined ? profileData.avatar : u.avatar,
              bio: profileData.bio !== undefined ? profileData.bio : u.bio,
              major: profileData.major || u.major,
              academicLevel: profileData.academicLevel || u.academicLevel,
              skills: profileData.skills || u.skills,
            };
          }
          return u;
        });
        setItem('qu_users', next);
        return next;
      });

      // Update articles author info in local state
      setArticles((prev) =>
        prev.map((a) => {
          if (
            a.authorId === currentUser?.id ||
            (currentUser?.email && a.authorEmail && a.authorEmail.toLowerCase() === currentUser.email.toLowerCase())
          ) {
            return {
              ...a,
              authorName: profileData.name || a.authorName,
              authorAvatar: profileData.avatar !== undefined ? profileData.avatar : a.authorAvatar,
              authorMajor: profileData.major || a.authorMajor,
            };
          }
          return a;
        })
      );

      // Background sync with server
      syncWithServer();

      addToast('success', 'تم حفظ التعديلات بنجاح', 'تم حفظ التعديلات في Supabase وتحديث ملفك الصحفي العام.');
      return { success: true, message: data.message || 'تم تحديث البيانات بنجاح', user: data.user };
    } catch (err: any) {
      console.error('Error updating journalist profile:', err);
      addToast('error', 'خطأ في الاتصال', 'تعذر الاتصال بالخادم لحفظ التعديلات');
      return { success: false, message: 'تعذر الاتصال بالخادم لحفظ التعديلات' };
    }
  };

  const deleteJournalist = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast(
        'error',
        'صلاحية مرفوضة',
        'حذف حسابات الصحفيين مقتصر حصرياً على المشرف العام (الأدمن) فقط من لوحة التحكم.'
      );
      return;
    }

    const rawId = (userId || '').trim();
    const normalizedId = rawId.replace(/^req-/, '');

    const target = users.find(
      (u) =>
        u.id === rawId ||
        u.id === normalizedId ||
        u.id === ('req-' + rawId) ||
        ('req-' + u.id) === rawId
    );

    const targetReq = journalistRequests.find(
      (r) =>
        r.id === rawId ||
        r.userId === rawId ||
        r.userId === normalizedId ||
        r.id === ('req-' + rawId)
    );

    const resolvedId = target?.id || targetReq?.userId || normalizedId;
    const resolvedEmail = (target?.email || targetReq?.email || '').toLowerCase().trim();

    if (
      (target && target.role === 'admin') ||
      resolvedId === 'user-admin-1' ||
      resolvedEmail === 'admin@qu.edu.sa'
    ) {
      addToast(
        'error',
        'إجراء محظور',
        'حساب المشرف العام الأساسي محمي لضمان استقرار وأمان لوحة التحكم ولا يمكن حذفه.'
      );
      return;
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(resolvedId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success && res.status !== 404 && data.message !== 'المستخدم غير موجود') {
        addToast('error', 'تعذر الحذف', data.message || 'لا يمكن حذف هذا الحساب');
        return;
      }
    } catch (e) {
      console.warn('API delete user communication notice:', e);
    }

    setUsers((prev) => {
      const next = prev.filter(
        (u) =>
          u.id !== resolvedId &&
          u.id !== rawId &&
          u.id !== normalizedId &&
          (!resolvedEmail || !u.email || u.email.toLowerCase().trim() !== resolvedEmail)
      );
      setItem('qu_users', next);
      const approved = next.filter((u) => u.status === 'approved');
      savePermanentApprovedJournalists(approved);
      return next;
    });

    // Retain accreditation requests as permanent immutable audit logs
    // Requests are never purged, maintaining complete compliance history
    setJournalistRequests((prev) => {
      setItem('qu_journalist_requests', prev);
      return prev;
    });

    // Clean permanent cache
    try {
      const permKey = 'qu_permanent_approved_journalists_v2';
      const existingPerm = await getItem<any[]>(permKey, []);
      if (Array.isArray(existingPerm)) {
        const cleaned = existingPerm.filter(
          (j) =>
            j.id !== resolvedId &&
            j.id !== rawId &&
            j.id !== normalizedId &&
            (!resolvedEmail || !j.email || j.email.toLowerCase().trim() !== resolvedEmail)
        );
        await setItem(permKey, cleaned);
        try {
          localStorage.setItem(permKey, JSON.stringify(cleaned));
        } catch {}
      }
    } catch {}

    // Record in local deleted blacklist cache to prevent any ghost reappearance on reload
    try {
      const currentDeleted: string[] = JSON.parse(localStorage.getItem('qu_deleted_user_ids') || '[]');
      const candidates = [
        resolvedId,
        rawId,
        normalizedId,
        resolvedEmail,
        target?.studentId,
        targetReq?.studentId,
      ].filter(Boolean) as string[];
      for (const c of candidates) {
        if (!currentDeleted.includes(c)) {
          currentDeleted.push(c);
        }
      }
      localStorage.setItem('qu_deleted_user_ids', JSON.stringify(currentDeleted));
      await setItem('qu_deleted_user_ids', currentDeleted);
    } catch {}

    addToast('success', 'تم الحذف', `تم حذف حساب الصحفي ${target?.name || targetReq?.name || ''} بنجاح مع الاحتفاظ بسجل الاعتماد.`);
  };

  // Article Methods
  const submitArticle = async (
    articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'likesCount' | 'readingTimeMinutes'>
  ): Promise<string> => {
    const id = 'art-' + Math.random().toString(36).substring(2, 9);
    const wordsCount = (articleData.content || '').trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordsCount / 180));

    const rawStatus = (articleData.status as string) || 'under_review';
    const targetStatus: ArticleStatus = rawStatus === 'pending' ? 'under_review' : (rawStatus as ArticleStatus);
    const publishedAt = targetStatus === 'published' 
      ? (articleData.publishedAt || new Date().toISOString()) 
      : undefined;

    const effectiveAuthorId = articleData.authorId || currentUser?.id || activeCurrentUser?.id || '';
    const effectiveAuthorName = articleData.authorName || currentUser?.name || activeCurrentUser?.name || '';
    const effectiveAuthorStudentId = articleData.authorStudentId || currentUser?.studentId || activeCurrentUser?.studentId || '';
    const effectiveAuthorMajor = articleData.authorMajor || currentUser?.major || activeCurrentUser?.major || '';
    const effectiveAuthorAvatar = articleData.authorAvatar || currentUser?.avatar || activeCurrentUser?.avatar || '';

    const newArticle: Article = {
      ...articleData,
      id,
      authorId: effectiveAuthorId,
      authorName: effectiveAuthorName,
      authorStudentId: effectiveAuthorStudentId,
      authorMajor: effectiveAuthorMajor,
      authorAvatar: effectiveAuthorAvatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt,
      viewsCount: 0,
      likesCount: 0,
      readingTimeMinutes,
      status: targetStatus,
    };

    // Ensure active user is synced before building headers
    if (currentUser) {
      setActiveCurrentUser(currentUser);
    }

    // Save to server database with strict res.ok validation
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newArticle),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg =
        errData.message ||
        (res.status === 401
          ? 'غير مصرح: يلزم تسجيل الدخول لإرسال المادة الصحفية'
          : res.status === 403
          ? 'غير مصرح: ليس لديك صلاحية إرسال هذه المادة'
          : 'فشل حفظ وإرسال المادة الصحفية إلى الخادم');
      throw new Error(errorMsg);
    }

    const resJson = await res.json().catch(() => ({}));
    const persistedArticle: Article = {
      ...newArticle,
      ...(resJson.article || {}),
      authorId: resJson.article?.authorId || newArticle.authorId,
      authorName: resJson.article?.authorName || newArticle.authorName,
      authorStudentId: resJson.article?.authorStudentId || newArticle.authorStudentId,
      status: (resJson.article?.status === 'pending' ? 'under_review' : (resJson.article?.status || newArticle.status)) as ArticleStatus,
    };

    setArticles((prev) => {
      const next = [persistedArticle, ...prev.filter((a) => a.id !== persistedArticle.id)];
      setItem('qu_articles', next);
      return next;
    });

    // Update journalist article count if published
    if (persistedArticle.status === 'published' || persistedArticle.status === 'approved') {
      setUsers((prev) => {
        const next = prev.map((u) =>
          u.id === persistedArticle.authorId
            ? { ...u, stats: { ...u.stats, articlesCount: (u.stats?.articlesCount || 0) + 1 } }
            : u
        );
        setItem('qu_users', next);
        return next;
      });
    }

    if (persistedArticle.status === 'published' || persistedArticle.status === 'approved') {
      addToast('success', 'تم النشر بنجاح', 'تم نشر المادة الصحفية بنجاح، وهي متاحة الآن لجميع زوار الموقع');
    } else if (persistedArticle.status === 'under_review') {
      addToast('success', 'تم الإرسال لهيئة التحرير', 'تم إرسال المادة لهيئة التحرير بنجاح للمراجعة والاعتماد');
    } else {
      addToast('info', 'تم الحفظ', 'تم حفظ المادة الصحفية كمسودة خاصة بنجاح');
    }

    // Trigger background sync so server and client state stay 100% consistent
    setTimeout(() => {
      syncWithServer();
    }, 400);

    return persistedArticle.id;
  };

  const updateArticle = async (id: string, articleData: Partial<Article>) => {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(articleData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg =
        errData.message ||
        (res.status === 401
          ? 'غير مصرح: يلزم تسجيل الدخول لتعديل المادة الصحفية'
          : res.status === 403
          ? 'غير مصرح: لا يمكنك تعديل مادة صحفية لكاتب آخر'
          : 'فشل حفظ التعديلات على الخادم');
      throw new Error(errorMsg);
    }

    const resJson = await res.json().catch(() => ({}));
    const returnedArticle = resJson.article;

    setArticles((prev) => {
      const next = prev.map((art) => {
        if (art.id === id) {
          const merged = {
            ...art,
            ...articleData,
            ...(returnedArticle || {}),
            category: returnedArticle?.category || articleData.category || art.category,
            kind: returnedArticle?.kind || articleData.kind || art.kind || 'خبر',
            mediaType: returnedArticle?.mediaType || articleData.mediaType || art.mediaType || 'article',
            keywords: returnedArticle?.keywords || articleData.keywords || art.keywords || [],
            tags: returnedArticle?.tags || articleData.tags || art.tags || [],
            updatedAt: new Date().toISOString(),
          };
          return merged;
        }
        return art;
      });
      setItem('qu_articles', next);
      const publishedList = next.filter((a) => a.status === 'published' || (a.status as string) === 'approved');
      if (publishedList.length > 0) {
        savePermanentPublishedArticles(publishedList);
      }
      return next;
    });
    addToast('success', 'تم التحديث', 'تم حفظ التعديلات بنجاح');
  };

  const approveArticle = async (id: string) => {
    let targetAuthorId = '';
    const nowIso = new Date().toISOString();

    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'published', publishedAt: nowIso }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      addToast('error', 'فشل الاعتماد', errData.message || 'تعذر اعتماد المادة الصحفية على الخادم');
      return;
    }

    const resJson = await res.json().catch(() => ({}));
    const returnedArticle = resJson.article;

    setArticles((prev) => {
      const next = prev.map((art) => {
        if (art.id === id) {
          targetAuthorId = art.authorId;
          return {
            ...art,
            ...(returnedArticle || {}),
            status: 'published' as ArticleStatus,
            publishedAt: returnedArticle?.publishedAt || art.publishedAt || nowIso,
            updatedAt: nowIso,
          };
        }
        return art;
      });
      setItem('qu_articles', next);
      const publishedList = next.filter((a) => a.status === 'published' || a.status === 'approved');
      savePermanentPublishedArticles(publishedList);
      return next;
    });

    if (targetAuthorId) {
      setUsers((prev) => {
        const next = prev.map((u) =>
          u.id === targetAuthorId
            ? { ...u, stats: { ...u.stats, articlesCount: (u.stats?.articlesCount || 0) + 1 } }
            : u
        );
        setItem('qu_users', next);
        return next;
      });
    }

    addToast('success', 'تمت الموافقة والنشر', 'أصبح الخبر منشوراً ومتاحاً لجميع القراء في الموقع الآن');
  };

  const requestArticleEdits = async (id: string, notes: string) => {
    const nowIso = new Date().toISOString();
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'needs_edit',
        editorialNotes: notes,
        editorFeedback: notes,
        updatedAt: nowIso,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      addToast('error', 'فشل الإرسال', errData.message || 'تعذر تحديث حالة المادة على الخادم');
      return;
    }

    setArticles((prev) => {
      const next = prev.map((art) => {
        if (art.id === id) {
          return {
            ...art,
            status: 'needs_edit' as ArticleStatus,
            editorialNotes: notes,
            editorFeedback: notes,
            updatedAt: nowIso,
          };
        }
        return art;
      });
      setItem('qu_articles', next);
      return next;
    });
    addToast('warning', 'طُلب تعديل', 'تم إرجاع الخبر للصحفي مع ملاحظات التدقيق التحريري');
  };

  const rejectArticle = async (id: string, reason: string) => {
    const nowIso = new Date().toISOString();
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'rejected',
        editorialNotes: reason,
        editorFeedback: reason,
        updatedAt: nowIso,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      addToast('error', 'فشل الرفض', errData.message || 'تعذر تسجيل قرار الرفض على الخادم');
      return;
    }

    setArticles((prev) => {
      const next = prev.map((art) => {
        if (art.id === id) {
          return {
            ...art,
            status: 'rejected' as ArticleStatus,
            editorialNotes: reason,
            editorFeedback: reason,
            updatedAt: nowIso,
          };
        }
        return art;
      });
      setItem('qu_articles', next);
      return next;
    });
    addToast('error', 'تم رفض الخبر', 'تم رفض نشر المادة الصحفية مع توضيح السبب');
  };

  const deleteArticle = async (id: string) => {
    const target = articles.find((a) => a.id === id);
    if (target && (target.status === 'published' || target.status === 'approved')) {
      addToast(
        'warning',
        'مادة صحفية منشورة',
        'المواد الصحفية المعتمدة والمنشورة محفوظة في الأرشيف الدائم للصحيفة ولا يمكن حذفها للحفاظ على السجلات التوثيقية.'
      );
      return;
    }

    const res = await fetch(`/api/articles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      addToast('error', 'فشل الحذف', errData.message || 'تعذر حذف المسودة من الخادم');
      return;
    }

    setArticles((prev) => {
      const next = prev.filter((a) => a.id !== id);
      setItem('qu_articles', next);
      return next;
    });
    addToast('info', 'تم الحذف', 'تم حذف المسودة بنجاح');
  };

  const deleteArticleVideo = async (articleId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/articles/${articleId}/video`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setArticles((prev) => {
          const next = prev.map((art) =>
            art.id === articleId
              ? { ...art, videoUrl: '', video_url: null, updatedAt: new Date().toISOString() }
              : art
          );
          setItem('qu_articles', next);
          return next;
        });
        addToast('success', 'تم حذف الفيديو', 'تمت إزالة مقطع الفيديو من المادة الصحفية بنجاح.');
        return { success: true, message: data.message || 'تم حذف مقطع الفيديو بنجاح.' };
      } else {
        addToast('error', 'فشل الحذف', data.message || 'تعذر إتمام عملية حذف الفيديو');
        return { success: false, message: data.message || 'فشل حذف الفيديو' };
      }
    } catch (err: any) {
      addToast('error', 'خطأ في الاتصال', 'تعذر الاتصال بالخادم لحذف الفيديو');
      return { success: false, message: err.message };
    }
  };

  const toggleArticleBreaking = async (id: string) => {
    const art = articles.find((a) => a.id === id);
    if (!art) return;
    const newBreaking = !art.isBreaking;

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isBreaking: newBreaking }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        addToast('error', 'خطأ في الحفظ', errorData.message || 'تعذر حفظ حالة الخبر العاجل في قاعدة البيانات');
        return;
      }

      // Success from server: sync latest data from server/database
      await syncWithServer();
      addToast('info', 'شريط العاجل', newBreaking ? 'تم تعيين الخبر كعاجل بنجاح وحفظه في قاعدة البيانات' : 'تم إلغاء حالة الخبر العاجل');
    } catch (err: any) {
      addToast('error', 'خطأ في الاتصال', 'فشل إرسال التحديث إلى الخادم');
    }
  };

  const toggleArticleFeatured = async (id: string) => {
    const art = articles.find((a) => a.id === id);
    if (!art) return;
    const newFeatured = !art.isFeatured;

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isFeatured: newFeatured }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        addToast('error', 'خطأ في الحفظ', errorData.message || 'تعذر حفظ حالة تثبيت الخبر في قاعدة البيانات');
        return;
      }

      // Success from server: sync latest data from server/database
      await syncWithServer();
      addToast('info', 'الخبر الرئيسي', newFeatured ? 'تم تثبيت الخبر في الواجهة بنجاح وحفظه في قاعدة البيانات' : 'تم إلغاء تثبيت الخبر');
    } catch (err: any) {
      addToast('error', 'خطأ في الاتصال', 'فشل إرسال التحديث إلى الخادم');
    }
  };

  const incrementArticleViews = async (id: string) => {
    let authorId = '';

    try {
      await fetch(`/api/articles/${id}/view`, { method: 'POST' });
    } catch {
      // fallback
    }

    setArticles((prev) =>
      prev.map((art) => {
        if (art.id === id) {
          authorId = art.authorId;
          return { ...art, viewsCount: (art.viewsCount || 0) + 1 };
        }
        return art;
      })
    );
    if (authorId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === authorId
            ? { ...u, stats: { ...u.stats, viewsCount: (u.stats?.viewsCount || 0) + 1 } }
            : u
        )
      );
    }
  };

  const toggleArticleLike = async (id: string) => {
    let authorId = '';

    try {
      await fetch(`/api/articles/${id}/like`, { method: 'POST' });
    } catch {
      // fallback
    }

    setArticles((prev) =>
      prev.map((art) => {
        if (art.id === id) {
          authorId = art.authorId;
          return { ...art, likesCount: (art.likesCount || 0) + 1 };
        }
        return art;
      })
    );
    if (authorId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === authorId
            ? { ...u, stats: { ...u.stats, likesCount: (u.stats?.likesCount || 0) + 1 } }
            : u
        )
      );
    }
    addToast('success', 'شكراً لتفاعلك', 'تم تسجيل إعجابك بالمادة الصحفية وحفظه في السجل');
  };

  const [likedArticles, setLikedArticles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('qu_liked_articles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const hasLiked = (id: string): boolean => {
    return likedArticles.includes(id);
  };

  const toggleLike = async (id: string) => {
    if (!hasLiked(id)) {
      setLikedArticles((prev) => {
        const next = [...prev, id];
        try {
          localStorage.setItem('qu_liked_articles', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      await toggleArticleLike(id);
    }
  };

  // Video Reports (Fully synced with backend and Supabase Storage)
  const submitVideoReport = async (
    reportData: Omit<VideoReport, 'id' | 'publishedAt' | 'viewsCount'>
  ): Promise<string> => {
    const id = 'vid-' + Math.random().toString(36).substring(2, 9);
    const newReport: VideoReport = {
      ...reportData,
      id,
      publishedAt: new Date().toISOString(),
      viewsCount: 0,
    };

    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(newReport),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg =
        errData.message ||
        (res.status === 401
          ? 'غير مصرح: يلزم تسجيل الدخول لرفع التقرير المرئي'
          : 'فشل حفظ وتوثيق التقرير المرئي في الخادم');
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const persistedVideo = data.video || newReport;

    setVideoReports((prev) => [persistedVideo, ...prev.filter((v) => v.id !== persistedVideo.id)]);
    const existing = await getItem<VideoReport[]>('qu_videos', []);
    await setItem('qu_videos', [persistedVideo, ...existing.filter((v) => v.id !== persistedVideo.id)]);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === newReport.authorId
          ? { ...u, stats: { ...u.stats, reportsCount: (u.stats?.reportsCount || 0) + 1 } }
          : u
      )
    );

    addToast('success', 'تم نشر التقرير المرئي', 'تم حفظ وتوثيق الفيديو بشكل دائم في السحابة');
    return persistedVideo.id;
  };

  const updateVideoReport = async (id: string, updates: Partial<VideoReport>): Promise<void> => {
    const res = await fetch(`/api/videos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'فشل تحديث بيانات التقرير المرئي على الخادم');
    }

    const data = await res.json();
    const updatedVideo = data.video || updates;

    setVideoReports((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates, ...(data.video || {}) } : v))
    );
    const existing = await getItem<VideoReport[]>('qu_videos', []);
    await setItem(
      'qu_videos',
      existing.map((v) => (v.id === id ? { ...v, ...updates, ...(data.video || {}) } : v))
    );

    addToast('success', 'تم تحديث التقرير المرئي', 'تم حفظ التعديلات بنجاح');
  };

  const syncVideoReports = useCallback(async (): Promise<VideoReport[]> => {
    try {
      // First attempt dedicated endpoint /api/videos, fallback to /api/data
      let cleanVideos: VideoReport[] = [];
      const res = await fetch('/api/videos', {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videoReports)) {
          cleanVideos = data.videoReports.filter((v: VideoReport) => !isDisallowedVideo(v));
        }
      } else {
        const fallbackRes = await fetch('/api/data', {
          headers: getAuthHeaders(),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData.videoReports)) {
            cleanVideos = fallbackData.videoReports.filter((v: VideoReport) => !isDisallowedVideo(v));
          }
        }
      }

      // Map to merge videos by ID and guarantee journalist's videos are included regardless of status
      const videoMap = new Map<string, VideoReport>();
      cleanVideos.forEach((v) => {
        videoMap.set(v.id, {
          ...v,
          status: v.status || 'published',
        });
      });

      // 1. Retrieve cached videos from local storage to include draft/pending/under_review items
      const cachedVideos = await getItem<VideoReport[]>('qu_videos', []);
      if (Array.isArray(cachedVideos)) {
        cachedVideos.forEach((cv) => {
          if (cv && cv.id && !isDisallowedVideo(cv)) {
            if (!videoMap.has(cv.id)) {
              videoMap.set(cv.id, cv);
            } else {
              const current = videoMap.get(cv.id)!;
              videoMap.set(cv.id, {
                ...cv,
                ...current,
                status: current.status || cv.status || 'published',
                coAuthors: current.coAuthors || cv.coAuthors,
                coAuthorIds: current.coAuthorIds || cv.coAuthorIds,
              });
            }
          }
        });
      }

      // 2. Scan articles and include any video materials authored or co-authored by currentUser regardless of status
      if (currentUser && Array.isArray(articles)) {
        articles.forEach((art) => {
          const hasVideo = Boolean(art.videoUrl || (art as any).video_url);
          if (!hasVideo) return;

          const isPrimary =
            art.authorId === currentUser.id ||
            art.authorId === `req-${currentUser.id}` ||
            (Boolean(currentUser.studentId) && art.authorId === currentUser.studentId) ||
            (Boolean(art.authorName) && art.authorName === currentUser.name);

          const isCoAuthor = Boolean(
            (art.coAuthorIds && (art.coAuthorIds.includes(currentUser.id) || (currentUser.studentId && art.coAuthorIds.includes(currentUser.studentId)))) ||
            (art.coAuthors && art.coAuthors.some((ca) =>
              ca.id === currentUser.id ||
              ca.journalistId === currentUser.id ||
              (currentUser.studentId && (ca.studentId === currentUser.studentId || ca.id === currentUser.studentId)) ||
              ca.name === currentUser.name
            ))
          );

          if (isPrimary || isCoAuthor) {
            const vidId = art.id.startsWith('vid-') ? art.id : `vid-${art.id}`;
            const targetVid = videoMap.get(vidId) || videoMap.get(art.id);
            if (!targetVid) {
              videoMap.set(vidId, {
                id: vidId,
                title: art.title,
                summary: art.excerpt || art.content?.slice(0, 150) || '',
                description: art.content || art.excerpt || '',
                videoUrl: (art.videoUrl || (art as any).video_url)!,
                coverImage: art.mainImage,
                thumbnailUrl: art.mainImage,
                category: art.category || 'تقارير مرئية',
                authorId: art.authorId,
                authorName: art.authorName,
                authorAvatar: art.authorAvatar,
                authorMajor: art.authorMajor,
                authorStudentId: art.authorStudentId,
                coAuthors: art.coAuthors,
                coAuthorIds: art.coAuthorIds,
                status: art.status, // preserve status regardless of draft, under_review, needs_edit, rejected, published
                duration: '02:30',
                publishedAt: art.publishedAt || art.createdAt,
                viewsCount: art.viewsCount || 0,
              });
            } else {
              videoMap.set(targetVid.id, {
                ...targetVid,
                status: art.status || targetVid.status || 'published',
                coAuthors: art.coAuthors || targetVid.coAuthors,
                coAuthorIds: art.coAuthorIds || targetVid.coAuthorIds,
              });
            }
          }
        });
      }

      const finalVideos = Array.from(videoMap.values());

      // Synchronize in-memory React state and IndexedDB/localStorage
      setVideoReports(finalVideos);
      await setItem('qu_videos', finalVideos);
      return finalVideos;
    } catch (err) {
      console.warn('[Videos] Exception during syncVideoReports:', err);
      return [];
    }
  }, [currentUser, articles]);

  const deleteVideoReport = async (id: string) => {
    // 1. Immediately purge from in-memory state and local storage
    setVideoReports((prev) => prev.filter((v) => v.id !== id));
    try {
      const existing = await getItem<VideoReport[]>('qu_videos', []);
      await setItem('qu_videos', existing.filter((v) => v.id !== id));
    } catch {
      // ignore storage err
    }

    // 2. Call backend to remove permanently from Supabase articles table
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        addToast('info', 'تم الحذف', 'تم حذف التقرير المرئي من السحابة بنجاح');
      }
    } catch (err) {
      console.error('[Videos] Network error deleting video:', err);
    }

    // 3. Re-sync immediately to ensure complete alignment with Supabase
    await syncVideoReports();
  };

  const incrementVideoViews = async (id: string) => {
    setVideoReports((prev) =>
      prev.map((v) => (v.id === id ? { ...v, viewsCount: v.viewsCount + 1 } : v))
    );
  };

  // Photo Albums
  const submitPhotoAlbum = async (
    albumData: Omit<PhotoAlbum, 'id' | 'publishedAt' | 'viewsCount'>
  ): Promise<string> => {
    const id = 'alb-' + Math.random().toString(36).substring(2, 9);
    const newAlbum: PhotoAlbum = {
      ...albumData,
      id,
      publishedAt: new Date().toISOString(),
      viewsCount: 0,
    };
    setPhotoAlbums((prev) => [newAlbum, ...prev]);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === newAlbum.authorId
          ? { ...u, stats: { ...u.stats, albumsCount: u.stats.albumsCount + 1 } }
          : u
      )
    );

    addToast('success', 'تم نشر ألبوم الصور', 'تم حفظ ونشر ألبوم الصور بنجاح');
    return id;
  };

  const deletePhotoAlbum = async (id: string) => {
    setPhotoAlbums((prev) => prev.filter((a) => a.id !== id));
    addToast('info', 'تم الحذف', 'تم حذف ألبوم الصور');
  };

  const incrementAlbumViews = async (id: string) => {
    setPhotoAlbums((prev) =>
      prev.map((a) => (a.id === id ? { ...a, viewsCount: a.viewsCount + 1 } : a))
    );
  };

  // Full Story
  const submitFullStory = async (
    storyData: Omit<FullStory, 'id' | 'viewsCount' | 'lastUpdated'>
  ): Promise<string> => {
    const id = 'story-' + Math.random().toString(36).substring(2, 9);
    const newStory: FullStory = {
      ...storyData,
      id,
      viewsCount: 0,
      lastUpdated: new Date().toISOString(),
    };
    setFullStories((prev) => [newStory, ...prev]);
    addToast('success', 'القصة الكاملة', 'تم إنشاء ملف التغطية الصحفية الشاملة');
    return id;
  };

  const addFullStoryUpdate = async (
    storyId: string,
    update: Omit<FullStory['updates'][0], 'id' | 'timestamp'>
  ) => {
    const updateId = 'upd-' + Math.random().toString(36).substring(2, 9);
    const fullUpdate = {
      ...update,
      id: updateId,
      timestamp: new Date().toISOString(),
    };

    setFullStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          return {
            ...s,
            lastUpdated: new Date().toISOString(),
            updates: [fullUpdate, ...s.updates],
          };
        }
        return s;
      })
    );
    addToast('success', 'تحديث جديد', 'تمت إضافة تحديث جديد للقصة الكاملة');
  };

  const deleteFullStory = async (id: string) => {
    setFullStories((prev) => prev.filter((s) => s.id !== id));
    addToast('info', 'تم الحذف', 'تم حذف ملف القصة الكاملة');
  };

  // Categories (Synchronized with backend and Supabase)
  const addCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const next = [...categories, trimmed];
    setCategories(next);
    setItem('qu_categories', next);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ category: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
          await setItem('qu_categories', data.categories);
        }
        addToast('success', 'تمت الإضافة', `تمت إضافة قسم ${trimmed} وحفظه بنجاح`);
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast('error', 'فشل الحفظ', errData.message || 'تعذر توثيق القسم في السحابة');
      }
    } catch (err) {
      console.error('[Categories] Error adding category:', err);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    const next = categories.filter((c) => c !== categoryName);
    setCategories(next);
    setItem('qu_categories', next);

    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
          await setItem('qu_categories', data.categories);
        }
        addToast('info', 'تم الحذف', `تم حذف القسم ${categoryName} بنجاح`);
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast('error', 'فشل الحذف', errData.message || 'تعذر حذف القسم من السحابة');
      }
    } catch (err) {
      console.error('[Categories] Error deleting category:', err);
    }
  };

  // Published articles filter (strictly include both published and admin-approved articles)
  const publishedArticles = articles.filter(
    (a) =>
      (a.status === 'published' || a.status === 'approved') &&
      !a.id?.startsWith('art-demo-') &&
      a.authorId !== 'jour-demo-1'
  );
  const breakingArticles = publishedArticles.filter((a) => a.isBreaking);
  const featuredArticle = publishedArticles.find((a) => a.isFeatured) || publishedArticles[0] || null;

  // Restore and query real student journalists and approved records directly from persistent database table
  const seedDemoContent = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users) && data.users.length > 0) {
          const cleanUsers = data.users.filter(
            (u: User) => u.id !== 'jour-demo-1' && u.name !== 'عبدالرحمن الشهري'
          );
          setUsers(cleanUsers);
          await setItem('qu_users', cleanUsers);
        }
        if (Array.isArray(data.articles)) {
          const cleanArticles = data.articles.filter(
            (a: Article) => !a.id?.startsWith('art-demo-') && a.authorId !== 'jour-demo-1'
          );
          if (cleanArticles.length > 0) {
            setArticles(cleanArticles);
            await setItem('qu_articles', cleanArticles);
          } else {
            console.warn('[Sync-Safeguard] Database refresh returned empty articles; retaining local articles.');
          }
        }
        if (Array.isArray(data.videoReports)) {
          const cleanVideos = data.videoReports.filter((v: VideoReport) => !isDisallowedVideo(v));
          setVideoReports(cleanVideos);
          await setItem('qu_videos', cleanVideos);
        }
        if (Array.isArray(data.photoAlbums)) {
          const cleanAlbums = data.photoAlbums.filter(
            (alb: PhotoAlbum) => !alb.id?.startsWith('alb-demo-') && alb.authorId !== 'jour-demo-1'
          );
          setPhotoAlbums(cleanAlbums);
          await setItem('qu_albums', cleanAlbums);
        }
        addToast('success', 'تحديث قاعدة البيانات', 'تم استرداد وتحديث سجلات الصحفيين والمقالات الحقيقية من قاعدة البيانات بنجاح');
      }
    } catch {
      addToast('info', 'تحديث البيانات', 'تمت المزامنة مع قاعدة البيانات المحلية');
    }
  };

  const resetToEmptyState = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      await syncWithServer();
    } catch {
      // silent fallback
    }
    // Strictly preserve all approved/published articles and all student journalists
    setArticles((prev) => {
      const preserved = prev.filter((a) => a.status === 'published' || a.status === 'approved');
      setItem('qu_articles', preserved);
      return preserved;
    });
    addToast(
      'info',
      'حفظ البيانات الإلزامية',
      'تم تنظيف المسودات غير المعتمدة مع الحفاظ التام والنهائي على المقالات المنشورة وحسابات الصحفيين المعتمدين.'
    );
  };

  const pendingJournalists = users.filter(
    (u) => u.role === 'journalist' && (u.status === 'pending' || u.status === 'under_review')
  );

  return (
    <NewsContext.Provider
      value={{
        currentUser,
        users,
        login,
        setupLegacyPassword,
        logout,
        registerJournalist,
        approveJournalist,
        rejectJournalist,
        deleteJournalist,
        updateUserRole,
        toggleUserStatus,
        updateUserPassword,
        updateJournalistProfile,
        journalistRequests,
        pendingJournalists,
        updateAccreditationStatus,
        fetchAccreditationRequests,
        articles,
        publishedArticles,
        breakingArticles,
        featuredArticle,
        submitArticle,
        updateArticle,
        approveArticle,
        requestArticleEdits,
        requestEditArticle: requestArticleEdits,
        rejectArticle,
        deleteArticle,
        deleteArticleVideo,
        toggleArticleBreaking,
        toggleBreaking: toggleArticleBreaking,
        toggleArticleFeatured,
        toggleFeatured: toggleArticleFeatured,
        incrementArticleViews,
        incrementViews: incrementArticleViews,
        toggleArticleLike,
        toggleLike,
        hasLiked,
        videoReports,
        submitVideoReport,
        updateVideoReport,
        deleteVideoReport,
        incrementVideoViews,
        syncVideoReports,
        photoAlbums,
        submitPhotoAlbum,
        deletePhotoAlbum,
        incrementAlbumViews,
        fullStories,
        submitFullStory,
        addFullStoryUpdate,
        deleteFullStory,
        categories,
        addCategory,
        deleteCategory,
        removeCategory: deleteCategory,
        isSearchOpen,
        setIsSearchOpen,
        isDarkMode,
        toggleDarkMode,
        toasts,
        addToast,
        removeToast,
        seedDemoContent,
        resetToEmptyState,
        refreshData,
      }}
    >
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};
