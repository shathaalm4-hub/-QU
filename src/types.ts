export type UserRole = 'admin' | 'editor' | 'journalist' | 'reader';

export type ArticleStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'needs_edit' | 'rejected';

export type JournalistStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'active';

export interface JournalistRequest {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  email: string;
  password?: string;
  major: string;
  academicLevel: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived';
  rejectionReason?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  studentId?: string;
  major?: string;
  academicLevel?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  status: JournalistStatus;
  registeredAt: string;
  rejectionReason?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  badges?: JournalistBadge[];
  stats: {
    articlesCount: number;
    reportsCount: number;
    albumsCount: number;
    viewsCount: number;
    likesCount: number;
  };
}

export interface JournalistBadge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  awardedAt: string;
}

export interface ArticleAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

export type AuthorRole = 'primary' | 'co_author';

export interface CoAuthor {
  id: string;
  journalistId: string;
  name: string;
  studentId?: string;
  major?: string;
  avatar?: string;
  role: AuthorRole;
  createdAt?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  kind?: string;
  mediaType?: 'article' | 'video' | 'album' | 'photo';
  mainImage: string;
  extraImages?: string[];
  galleryImages?: string[];
  videoUrl?: string;
  attachments?: ArticleAttachment[];
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorMajor?: string;
  authorStudentId?: string;
  coAuthors?: CoAuthor[];
  coAuthorIds?: string[];
  status: ArticleStatus;
  editorialNotes?: string;
  editorFeedback?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  eventDate?: string;
  location?: string;
  sources?: string;
  source?: string;
  keywords?: string[];
  tags?: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  likesCount: number;
  readingTimeMinutes: number;
}

export interface VideoReport {
  id: string;
  title: string;
  summary: string;
  description?: string;
  videoUrl: string;
  coverImage?: string;
  thumbnailUrl?: string;
  category: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorMajor?: string;
  authorStudentId?: string;
  coAuthors?: CoAuthor[];
  coAuthorIds?: string[];
  status?: ArticleStatus;
  duration?: string;
  publishedAt: string;
  viewsCount: number;
  likesCount?: number;
}

export interface PhotoAlbum {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  images: {
    id: string;
    url: string;
    caption?: string;
  }[];
  authorId: string;
  authorName: string;
  photographerName?: string;
  authorAvatar?: string;
  coverageDate: string;
  location?: string;
  publishedAt: string;
  viewsCount: number;
}

export interface FullStoryUpdate {
  id: string;
  timestamp: string;
  title: string;
  content: string;
  mediaUrl?: string;
  authorName: string;
}

export interface FullStory {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
  category: string;
  status: 'ongoing' | 'concluded';
  startDate: string;
  lastUpdated: string;
  viewsCount: number;
  updates: FullStoryUpdate[];
}

export interface AcademyLesson {
  id: string;
  title: string;
  category: string;
  readingTime: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  summary: string;
  content: string[];
  keyRules: string[];
  examples?: {
    good: string;
    bad: string;
    explanation: string;
  };
}

export type ContentCategory = 
  | 'جامعة'
  | 'مجتمع'
  | 'اقتصاد'
  | 'رياضة'
  | 'ثقافة وفنون'
  | 'تقنية'
  | 'عالمي'
  | 'قصص'
  | 'مقالات';

export type ContentKind =
  | 'تقارير وتحقيقات'
  | 'فيديو'
  | 'صور'
  | 'خبر'
  | 'تقرير'
  | 'مقابلة'
  | 'قصص'
  | 'مقالات'
  | 'ألبوم صور'
  | 'تقرير مرئي';

export interface SystemStats {
  totalArticles: number;
  underReviewArticles: number;
  publishedArticles: number;
  totalJournalists: number;
  pendingJournalists: number;
  totalViews: number;
  totalVideoReports: number;
  totalPhotoAlbums: number;
}
