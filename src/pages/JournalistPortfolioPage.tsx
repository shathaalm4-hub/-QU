import React, { useState } from 'react';
import { ArrowRight, Eye, Share2, Check, Edit3, Play, Film, X, Users } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { NewsCard } from '../components/NewsCard';
import { EmptyState } from '../components/EmptyState';
import { EditJournalistProfileModal } from '../components/EditJournalistProfileModal';
import { UniversalVideoPlayer } from '../components/UniversalVideoPlayer';
import { Article, VideoReport } from '../types';

interface JournalistPortfolioPageProps {
  journalistId: string;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  onEditArticle?: (article: Article) => void;
  onEditVideo?: (video: VideoReport) => void;
}

const normalizeName = (s?: string) =>
  (s || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');

export const JournalistPortfolioPage: React.FC<JournalistPortfolioPageProps> = ({
  journalistId,
  onBack,
  onSelectArticle,
  onEditArticle,
  onEditVideo,
}) => {
  const { currentUser, users, publishedArticles, videoReports, addToast } = useNews();
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'primary' | 'coauthor'>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoReport | null>(null);

  const journalist = users.find(
    (u) =>
      u.id === journalistId ||
      u.id === journalistId.replace(/^req-/, '') ||
      `req-${u.id}` === journalistId
  );

  const isOwner = Boolean(
    currentUser &&
      journalist &&
      (currentUser.id === journalist.id ||
        (currentUser.email && journalist.email && currentUser.email.toLowerCase() === journalist.email.toLowerCase()) ||
        currentUser.role === 'admin' ||
        currentUser.role === 'editor')
  );

  if (!journalist) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center space-y-4" dir="rtl">
        <p className="text-muted-foreground">لم يتم العثور على هذا الصحفي.</p>
        <button
          onClick={onBack}
          className="rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-semibold cursor-pointer"
        >
          العودة للدليل
        </button>
      </div>
    );
  }

  const normJournalistName = normalizeName(journalist.name);

  const isPrimaryArticle = (a: Article) =>
    a.authorId === journalist.id ||
    a.authorId === `req-${journalist.id}` ||
    a.authorId?.replace(/^req-/, '') === journalist.id.replace(/^req-/, '') ||
    (Boolean(journalist.studentId) && (a.authorId === journalist.studentId || a.authorStudentId === journalist.studentId)) ||
    (Boolean(a.authorName) && normalizeName(a.authorName) === normJournalistName);

  const isCoAuthorArticle = (a: Article) => {
    if (isPrimaryArticle(a)) return false;
    const hasId = Boolean(
      a.coAuthorIds &&
        (a.coAuthorIds.includes(journalist.id) ||
          a.coAuthorIds.includes(`req-${journalist.id}`) ||
          (journalist.studentId && a.coAuthorIds.includes(journalist.studentId)))
    );
    const hasObj = Boolean(
      a.coAuthors &&
        a.coAuthors.some(
          (ca) =>
            ca.id === journalist.id ||
            ca.journalistId === journalist.id ||
            ca.journalistId?.replace(/^req-/, '') === journalist.id.replace(/^req-/, '') ||
            (journalist.studentId && (ca.studentId === journalist.studentId || ca.id === journalist.studentId)) ||
            normalizeName(ca.name) === normJournalistName
        )
    );
    return hasId || hasObj;
  };

  const isPrimaryVideo = (v: VideoReport) =>
    v.authorId === journalist.id ||
    v.authorId === `req-${journalist.id}` ||
    v.authorId?.replace(/^req-/, '') === journalist.id.replace(/^req-/, '') ||
    (Boolean(journalist.studentId) && (v.authorId === journalist.studentId || v.authorStudentId === journalist.studentId)) ||
    (Boolean(v.authorName) && normalizeName(v.authorName) === normJournalistName);

  const isCoAuthorVideo = (v: VideoReport) => {
    if (isPrimaryVideo(v)) return false;
    const hasId = Boolean(
      v.coAuthorIds &&
        (v.coAuthorIds.includes(journalist.id) ||
          v.coAuthorIds.includes(`req-${journalist.id}`) ||
          (journalist.studentId && v.coAuthorIds.includes(journalist.studentId)))
    );
    const hasObj = Boolean(
      v.coAuthors &&
        v.coAuthors.some(
          (ca) =>
            ca.id === journalist.id ||
            ca.journalistId === journalist.id ||
            ca.journalistId?.replace(/^req-/, '') === journalist.id.replace(/^req-/, '') ||
            (journalist.studentId && (ca.studentId === journalist.studentId || ca.id === journalist.studentId)) ||
            normalizeName(ca.name) === normJournalistName
        )
    );
    return hasId || hasObj;
  };

  const allJournalistArticles = publishedArticles.filter((a) => isPrimaryArticle(a) || isCoAuthorArticle(a));
  const primaryArticles = allJournalistArticles.filter((a) => isPrimaryArticle(a));
  const coAuthoredArticles = allJournalistArticles.filter((a) => isCoAuthorArticle(a));

  // Filter out videos that are already represented in allJournalistArticles by same ID
  const articleIdsSet = new Set(allJournalistArticles.map((a) => a.id));
  const allJournalistVideos = (videoReports || []).filter(
    (v) => !articleIdsSet.has(v.id) && (isPrimaryVideo(v) || isCoAuthorVideo(v))
  );
  const primaryVideos = allJournalistVideos.filter((v) => isPrimaryVideo(v));
  const coAuthoredVideos = allJournalistVideos.filter((v) => isCoAuthorVideo(v));

  const filteredArticles = allJournalistArticles.filter((a) => {
    if (activeTabFilter === 'primary') return isPrimaryArticle(a);
    if (activeTabFilter === 'coauthor') return isCoAuthorArticle(a);
    return true;
  });

  const filteredVideos = allJournalistVideos.filter((v) => {
    if (activeTabFilter === 'primary') return isPrimaryVideo(v);
    if (activeTabFilter === 'coauthor') return isCoAuthorVideo(v);
    return true;
  });

  const totalWorksCount = allJournalistArticles.length + allJournalistVideos.length;
  const totalPrimaryCount = primaryArticles.length + primaryVideos.length;
  const totalCoAuthoredCount = coAuthoredArticles.length + coAuthoredVideos.length;

  const totalViews =
    allJournalistArticles.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0) +
    allJournalistVideos.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);

  // Gamified Badges calculation
  const badges: { label: string; tone: string }[] = [];
  if (totalWorksCount >= 1) badges.push({ label: 'أول نشر', tone: 'teal' });
  if (allJournalistVideos.length >= 1) badges.push({ label: 'إنتاج مرئي', tone: 'brand' });
  if (totalWorksCount >= 5) badges.push({ label: 'صحفي نشِط', tone: 'brand' });
  if (totalWorksCount >= 15) badges.push({ label: 'قلم متميز', tone: 'gold' });
  if (totalViews >= 500) badges.push({ label: 'الأكثر قراءة', tone: 'gold' });
  if (totalViews >= 2000) badges.push({ label: 'صانع رأي', tone: 'brand' });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    addToast('success', 'تم النسخ', 'تم نسخ رابط الملف الصحفي بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const canEditVideoItem = (v: VideoReport) =>
    Boolean(
      currentUser &&
        (currentUser.role === 'admin' ||
          currentUser.role === 'editor' ||
          v.authorId === currentUser.id ||
          (currentUser.studentId && v.authorId === currentUser.studentId) ||
          normalizeName(v.authorName) === normalizeName(currentUser.name) ||
          (v.coAuthors &&
            v.coAuthors.some(
              (ca) =>
                ca.id === currentUser.id ||
                ca.journalistId === currentUser.id ||
                normalizeName(ca.name) === normalizeName(currentUser.name)
            )))
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" dir="rtl">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <ArrowRight className="size-4" />
        <span>العودة لدليل الصحفيين</span>
      </button>

      {/* Journalist Profile Hero Box */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="size-24 rounded-full overflow-hidden bg-accent flex items-center justify-center font-bold text-3xl text-foreground ring-4 ring-background shadow-md shrink-0">
            {journalist.avatar && journalist.avatar.trim() ? (
              <img src={journalist.avatar.trim()} alt={journalist.name} className="size-full object-cover" />
            ) : (
              <span>{journalist.name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl font-black text-foreground">{journalist.name}</h1>
              <span className="rounded bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                صحفي طالب معتمد
              </span>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {journalist.major || 'قسم الإعلام والاتصال'} • {journalist.academicLevel || 'طالب إعلام'}
            </p>

            {journalist.bio && (
              <p className="mt-3 text-sm text-foreground/80 max-w-2xl leading-relaxed">
                {journalist.bio}
              </p>
            )}

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="rounded-full bg-brand-soft text-brand text-xs font-bold px-3 py-1 border border-brand/20 shadow-2xs"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex sm:flex-col gap-3 text-center shrink-0">
            <div className="surface-card bg-accent/40 p-3 rounded-lg min-w-[100px]">
              <div className="text-2xl font-black text-brand">{totalWorksCount}</div>
              <div className="text-xs text-muted-foreground">مادة منشورة</div>
            </div>
            <div className="surface-card bg-accent/40 p-3 rounded-lg min-w-[100px]">
              <div className="text-2xl font-black text-brand">{totalViews}</div>
              <div className="text-xs text-muted-foreground">إجمالي المشاهدات</div>
            </div>
          </div>
        </div>
      </div>

      {/* Published Works Section */}
      <div className="mt-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground">الأعمال الصحفية والمرئية</h2>
            <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl text-xs">
              <button
                onClick={() => setActiveTabFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTabFilter === 'all' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                الكل ({totalWorksCount})
              </button>
              <button
                onClick={() => setActiveTabFilter('primary')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTabFilter === 'primary' ? 'bg-card text-teal-700 dark:text-teal-300 shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                أساسية ({totalPrimaryCount})
              </button>
              <button
                onClick={() => setActiveTabFilter('coauthor')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTabFilter === 'coauthor' ? 'bg-card text-purple-700 dark:text-purple-300 shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                مشتركة ({totalCoAuthoredCount})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {isOwner && (
              <button
                id="btn-edit-profile-portfolio"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:bg-brand/90 cursor-pointer shadow-xs transition-colors"
              >
                <Edit3 className="size-3.5" />
                <span>تعديل الملف الصحفي</span>
              </button>
            )}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
              <span>{copied ? 'تم النسخ' : 'مشاركة الملف'}</span>
            </button>
          </div>
        </div>

        {filteredArticles.length === 0 && filteredVideos.length === 0 ? (
          <EmptyState
            title="لا توجد مواد مطابقة في هذا القسم"
            description="لم يتم العثور على أي مواد صحفية أو مرئية مسجلة ضمن هذا التصنيف."
            cta={false}
          />
        ) : (
          <div className="space-y-8">
            {/* Video Reports Section if Journalist has Videos */}
            {filteredVideos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Film className="size-5 text-brand" />
                  <h3 className="text-base font-extrabold text-foreground">
                    التقارير المرئية والفيديوهات ({filteredVideos.length})
                  </h3>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredVideos.map((vid) => {
                    const isPrim = isPrimaryVideo(vid);
                    const coverImg =
                      vid.coverImage && vid.coverImage.trim()
                        ? vid.coverImage
                        : vid.thumbnailUrl && vid.thumbnailUrl.trim()
                        ? vid.thumbnailUrl
                        : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80';
                    return (
                      <div
                        key={vid.id}
                        onClick={() => setSelectedVideo(vid)}
                        className="surface-card group overflow-hidden cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative">
                            <img
                              src={coverImg}
                              alt={vid.title}
                              loading="lazy"
                              className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-103"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/45 transition-colors">
                              <div className="size-12 rounded-full bg-brand text-brand-foreground flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                                <Play className="size-5 fill-current ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                              {vid.duration || '02:30'}
                            </span>
                            <span
                              className={`absolute top-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-bold shadow-xs ${
                                isPrim
                                  ? 'bg-teal-600/90 text-white'
                                  : 'bg-purple-600/90 text-white'
                              }`}
                            >
                              {isPrim ? 'تقرير مرئي أساسي' : 'عمل مرئي مشترك'}
                            </span>
                            {canEditVideoItem(vid) && onEditVideo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditVideo(vid);
                                }}
                                className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/95 hover:bg-amber-600 text-white text-[11px] font-bold shadow-md transition-all cursor-pointer"
                                title="تعديل بيانات الفيديو دون إعادة رفع الملف"
                              >
                                <Edit3 className="size-3" />
                                <span>تعديل</span>
                              </button>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="kicker">{vid.category || 'تقارير مرئية'}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(vid.publishedAt || Date.now()).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                            <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
                              {vid.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {vid.summary || vid.description}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-foreground/90 truncate">{vid.authorName}</span>
                            {vid.coAuthors && vid.coAuthors.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                <Users className="size-3" />+{vid.coAuthors.length}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 shrink-0">
                            <Eye className="size-3.5" />
                            {vid.viewsCount || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Articles Section */}
            {filteredArticles.length > 0 && (
              <div className="space-y-4">
                {filteredVideos.length > 0 && (
                  <h3 className="text-base font-extrabold text-foreground">
                    الأخبار والتقارير الصحفية ({filteredArticles.length})
                  </h3>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredArticles.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      onClick={() => onSelectArticle(article)}
                      onEdit={onEditArticle}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Modal Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden border border-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-foreground line-clamp-1">{selectedVideo.title}</h3>
                {canEditVideoItem(selectedVideo) && onEditVideo && (
                  <button
                    onClick={() => {
                      const v = selectedVideo;
                      setSelectedVideo(null);
                      onEditVideo(v);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer shrink-0"
                  >
                    <Edit3 className="size-3.5" />
                    <span>تعديل التقرير</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <UniversalVideoPlayer
                url={selectedVideo.videoUrl}
                title={selectedVideo.title}
                autoPlay={true}
              />
            </div>
            <div className="p-4 text-sm text-muted-foreground">
              {selectedVideo.description || selectedVideo.summary}
            </div>
          </div>
        </div>
      )}

      {/* Edit Public Profile Modal */}
      {isOwner && (
        <EditJournalistProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};

