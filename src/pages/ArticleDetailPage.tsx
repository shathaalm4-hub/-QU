import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  Eye, 
  Heart, 
  Share2, 
  Check, 
  User, 
  MapPin,
  AlertCircle,
  Edit3,
  FileText,
  Download,
  Paperclip,
  ExternalLink,
  Tag,
  Users,
  Star
} from 'lucide-react';
import { Article } from '../types';
import { useNews } from '../context/NewsContext';
import { NewsCard } from '../components/NewsCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { VideoPlayer } from '../components/VideoPlayer';
import { FilePreviewModal } from '../components/FilePreviewModal';
import {
  formatFileSize,
  getFileTypeLabel,
  getFileViewUrl,
  getFileDownloadUrl,
  downloadFileSafely,
} from '../utils/fileUpload';

interface ArticleDetailPageProps {
  article: Article | null | undefined;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  onSelectJournalist: (journalistId: string) => void;
  onEditArticle?: (article: Article) => void;
}

const kindLabels: Record<string, string> = {
  news: 'خبر',
  report: 'تقرير',
  interview: 'مقابلة',
  photo: 'ألبوم صور',
  video: 'تقرير مرئي',
  article: 'مقال',
};

const ArticleDetailContent: React.FC<ArticleDetailPageProps> = ({
  article: initialArticle,
  onBack,
  onSelectArticle,
  onSelectJournalist,
  onEditArticle,
}) => {
  const { currentUser, publishedArticles, toggleLike, hasLiked, incrementViews, addToast } = useNews();
  const article = (initialArticle && publishedArticles && publishedArticles.find((a) => a.id === initialArticle.id)) || initialArticle;
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (article?.id) {
      try {
        if (typeof incrementViews === 'function') {
          incrementViews(article.id);
        }
        if (typeof hasLiked === 'function') {
          setLiked(hasLiked(article.id));
        }
      } catch (err) {
        console.warn('Error recording view/like:', err);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [article?.id]);

  if (!article) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center" dir="rtl">
        <div className="rounded-2xl border border-border p-8 bg-card shadow-xs">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">لم يتم العثور على المادة الصحفية المطلوبة</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
            قد تكون هذه المادة الصحفية قد نُقلت أو تم تحديث تصنيفها في الأرشيف الصحفي للصحيفة.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-brand-foreground font-bold text-sm hover:bg-brand/90 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowRight className="size-4" />
            <span>العودة لقائمة الأخبار</span>
          </button>
        </div>
      </div>
    );
  }

  const handleLikeClick = () => {
    if (!article.id) return;
    try {
      if (typeof toggleLike === 'function') {
        toggleLike(article.id);
        setLiked(!liked);
      }
    } catch (err) {
      console.warn('Error toggling like:', err);
    }
  };

  const handleCopyLink = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(window.location.href);
      }
      setCopied(true);
      if (typeof addToast === 'function') {
        addToast('success', 'تم النسخ', 'تم نسخ رابط الخبر بنجاح');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Safe date parsing and formatting
  const getFormattedDate = (): string => {
    try {
      const rawDate = article.publishedAt || article.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : new Date();
      if (isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date());
      }
      return new Intl.DateTimeFormat('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch {
      return 'اليوم';
    }
  };

  const formattedDate = getFormattedDate();
  const kindKey = article.mediaType === 'video' ? 'video' : article.mediaType === 'album' ? 'photo' : 'news';
  const displayKind = article.kind || kindLabels[kindKey] || 'خبر';

  const relatedArticles = Array.isArray(publishedArticles)
    ? publishedArticles
        .filter((a) => a && a.id !== article.id && a.category === article.category)
        .slice(0, 3)
    : [];

  const defaultImage = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80';
  const imageUrl = article.mainImage || (article.galleryImages && article.galleryImages[0]) || defaultImage;
  const likesDisplay = (article.likesCount || 0) + (liked && (typeof hasLiked === 'function' ? !hasLiked(article.id) : false) ? 1 : 0);

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const articleAuthorId = String(article.authorId || (article as any)?.author_id || '');
  const sessUserId = String(currentUser?.id || (currentUser as any)?.userId || '');
  const sessStudentId = String(currentUser?.studentId || '');
  const articleAuthorStudentId = String(article.authorStudentId || (article as any)?.author_student_id || '');
  const articleAuthorName = String(article.authorName || (article as any)?.author_name || '').trim().toLowerCase();
  const articleAuthorEmail = String(article.authorEmail || (article as any)?.author_email || '').toLowerCase().trim();
  const sessName = String(currentUser?.name || '').trim().toLowerCase();
  const sessEmail = String(currentUser?.email || '').toLowerCase().trim();

  const isAuthor = Boolean(
    currentUser && (
      (articleAuthorId && (
        articleAuthorId === sessUserId ||
        articleAuthorId.replace(/^req-/, '') === sessUserId.replace(/^req-/, '')
      )) ||
      (sessStudentId && articleAuthorStudentId && sessStudentId === articleAuthorStudentId) ||
      (articleAuthorName && sessName && articleAuthorName === sessName) ||
      (articleAuthorEmail && sessEmail && articleAuthorEmail === sessEmail)
    )
  );
  const canEdit = Boolean(currentUser && (isStaff || isAuthor));

  return (
    <article className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <ArrowRight className="size-4" />
        <span>العودة للأخبار</span>
      </button>

      {/* Badges row & Edit Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {article.isBreaking && (
            <span className="rounded bg-brand px-2.5 py-0.5 text-xs font-extrabold text-brand-foreground shadow-xs">
              عاجل
            </span>
          )}
          <span className="rounded bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            {displayKind}
          </span>
          <span className="kicker">{article.category || 'جامعة'}</span>
          {article.updatedAt && article.publishedAt && article.updatedAt !== article.publishedAt && (
            <span className="rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 text-[11px] font-bold">
              مُحدّث
            </span>
          )}
        </div>

        {canEdit && onEditArticle && (
          <button
            id="btn-edit-published-article"
            onClick={() => onEditArticle(article)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 text-xs font-bold transition-all cursor-pointer border border-amber-500/40 shadow-xs"
            title="تعديل هذا الخبر المنشور وتحديث بياناته"
          >
            <Edit3 className="size-4 text-amber-600 dark:text-amber-400" />
            <span>تعديل الخبر المنشور</span>
          </button>
        )}
      </div>

      {/* Main Headline */}
      <h1 className="mt-4 text-2xl sm:text-4xl font-black leading-tight sm:leading-snug text-foreground">
        {article.title || 'عنوان المادة الصحفية'}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed font-medium">
          {article.excerpt}
        </p>
      )}

      {/* Author & Meta Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-4 text-xs text-muted-foreground">
        <button
          onClick={() => article.authorId && onSelectJournalist(article.authorId)}
          className="flex items-center gap-3 text-right hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="size-9 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-foreground overflow-hidden">
            {article.authorAvatar && article.authorAvatar.trim() ? (
              <img src={article.authorAvatar.trim()} alt={article.authorName || 'صحفي'} className="size-full object-cover" />
            ) : (
              <User className="size-4" />
            )}
          </div>
          <div>
            <div className="font-bold text-foreground">{article.authorName || 'محرر صحفي'}</div>
            {article.authorMajor && (
              <div className="text-[11px] text-muted-foreground">{article.authorMajor}</div>
            )}
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {article.readingTimeMinutes || 3} دقائق قراءة
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" />
            {article.viewsCount || 0} مشاهدة
          </span>

          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                liked
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Heart className={`size-3.5 ${liked ? 'fill-current text-rose-600' : ''}`} />
              <span>{likesDisplay}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              title="مشاركة الرابط"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
              <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Cover Image */}
      <div className="mt-8 overflow-hidden rounded-lg surface-card">
        <img
          src={imageUrl}
          alt={article.title || 'صورة الخبر'}
          className="w-full max-h-[500px] object-cover"
        />
        {article.location && (
          <div className="p-3 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-brand" />
              {article.location}
            </span>
            {article.source && <span>المصدر: {article.source}</span>}
          </div>
        )}
      </div>

      {/* Article Body Content */}
      <div className="mt-8 space-y-5 text-base sm:text-lg leading-relaxed sm:leading-8 text-foreground/90 font-cairo whitespace-pre-line">
        {article.content || article.excerpt || 'محتوى هذه المادة الصحفية قيد التحديث.'}
      </div>

      {/* Article Topics & Keywords */}
      {(() => {
        const rawList = Array.isArray(article.keywords) && article.keywords.length > 0
          ? article.keywords
          : (Array.isArray((article as any).tags) ? (article as any).tags : []);
        const cleanList = rawList.filter((k: any) =>
          typeof k === 'string' &&
          !k.startsWith('kind:') &&
          !k.startsWith('media_type:') &&
          !k.startsWith('ednote:') &&
          !k.startsWith('rejreason:') &&
          !k.startsWith('attach:') &&
          !k.startsWith('flag:')
        );
        if (cleanList.length === 0) return null;
        return (
          <div className="mt-8 pt-4 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 ml-2">
              <Tag className="size-3.5 text-brand" />
              المواضيع والوسوم:
            </span>
            {cleanList.map((topic: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground hover:bg-brand/10 hover:text-brand transition-colors cursor-default"
              >
                #{topic}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Editorial Quick Edit Action Banner */}
      {canEdit && onEditArticle && (
        <div className="mt-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <Edit3 className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>هل تود تعديل أو تصحيح نص أو وسائط هذا الخبر المنشور؟ التعديلات تُحفظ فورياً وتظهر لجميع القراء.</span>
          </div>
          <button
            onClick={() => onEditArticle(article)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Edit3 className="size-3.5" />
            <span>تعديل الخبر المنشور</span>
          </button>
        </div>
      )}

      {/* Editorial Team & Co-Authors Section */}
      <section className="mt-8 p-6 rounded-2xl surface-card border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                فريق الإعداد والمشاركة الصحفية
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                الصحفيون المساهمون في إعداد، تحرير، وتدقيق هذه المادة الصحفية
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
            {1 + (article.coAuthors?.length || 0)} صحفي
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Primary Author Card */}
          <div
            onClick={() => article.authorId && onSelectJournalist(article.authorId)}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-foreground overflow-hidden group-hover:ring-2 group-hover:ring-brand/40 transition-all">
                {article.authorAvatar && article.authorAvatar.trim() ? (
                  <img src={article.authorAvatar.trim()} alt={article.authorName} className="size-full object-cover" />
                ) : (
                  <User className="size-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground group-hover:text-brand transition-colors">
                    {article.authorName || 'صحفي معتمد'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {article.authorMajor || 'قسم الإعلام والاتصال'}
                  {article.authorStudentId ? ` • الرقم: ${article.authorStudentId}` : ''}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
              محرر أساسي
            </span>
          </div>

          {/* Co-Authors Cards */}
          {article.coAuthors && article.coAuthors.map((ca) => {
            const journalistTargetId = ca.id || ca.journalistId;
            return (
              <div
                key={ca.id}
                onClick={() => journalistTargetId && onSelectJournalist(journalistTargetId)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center font-bold text-sm text-purple-700 dark:text-purple-300 overflow-hidden group-hover:ring-2 group-hover:ring-purple-400 transition-all">
                    {ca.avatar && ca.avatar.trim() ? (
                      <img src={ca.avatar.trim()} alt={ca.name} className="size-full object-cover" />
                    ) : (
                      ca.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {ca.name}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ca.major || 'صحفي مشارك'}
                      {ca.studentId ? ` • الرقم: ${ca.studentId}` : ''}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                  صحفي مشارك
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Media: Video embed if exists */}
      {article.videoUrl && typeof article.videoUrl === 'string' && (
        <div className="mt-8 overflow-hidden rounded-xl surface-card border border-border shadow-md">
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-bold text-foreground">
            <span>مقطع فيديو مرفق مع التقرير</span>
          </div>
          <VideoPlayer
            url={article.videoUrl}
            title={article.title}
            poster={article.mainImage}
          />
        </div>
      )}

      {/* Media: Gallery if exists */}
      {Array.isArray(article.galleryImages) && article.galleryImages.filter((u) => u && typeof u === 'string' && u.trim().length > 0).length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-lg font-bold text-foreground">معرض الصور</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {article.galleryImages
              .filter((u) => u && typeof u === 'string' && u.trim().length > 0)
              .map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl.trim()}
                  alt={`${article.title || 'صورة'} - ${idx + 1}`}
                  className="rounded-lg h-40 w-full object-cover surface-card cursor-pointer hover:opacity-95"
                />
              ))}
          </div>
        </div>
      )}

      {/* Attached Files & Documents */}
      {Array.isArray(article.attachments) && article.attachments.length > 0 && (
        <div className="mt-8 p-5 rounded-2xl surface-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <Paperclip className="size-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  المرفقات والوثائق الرسمية المصاحبة
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  انقر على أي ملف لفتحه ومعاينته مباشرة أو تنزيله إلى جهازك
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
              {article.attachments.length} {article.attachments.length === 1 ? 'ملف' : 'ملفات'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {article.attachments.map((att) => {
              const isCurrentDownloading = downloadingId === att.id;
              return (
                <div
                  key={att.id}
                  onClick={() => setSelectedPreviewFile(att)}
                  className="group relative flex flex-col justify-between p-4 rounded-2xl border border-border hover:border-brand/50 bg-card hover:bg-muted/40 transition-all shadow-xs cursor-pointer overflow-hidden space-y-3"
                >
                  <div className="flex items-start gap-3 overflow-hidden min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs sm:text-sm font-bold text-foreground group-hover:text-brand transition-colors line-clamp-2"
                        title={att.name}
                      >
                        {att.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className="font-semibold text-brand/90">{getFileTypeLabel(att.name)}</span>
                        <span>•</span>
                        <span dir="ltr">{formatFileSize(att.size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons inside each attachment card */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2 border-t border-border/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewFile(att)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:bg-brand/15 hover:text-brand transition-colors cursor-pointer"
                      title="فتح ومعاينة المستند"
                    >
                      <Eye className="size-3.5" />
                      <span>معاينة وفتح</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.open(getFileViewUrl(att.url, att.name), '_blank', 'noopener,noreferrer');
                      }}
                      className="inline-flex items-center gap-1 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      title="فتح في تبويب مستقل"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isCurrentDownloading}
                      onClick={async () => {
                        setDownloadingId(att.id);
                        try {
                          await downloadFileSafely(att.url, att.name);
                          addToast('success', 'بدء التحميل', `جاري تحميل الملف: ${att.name}`);
                        } catch {
                          addToast('error', 'فشل التحميل', 'تعذر تحميل الملف');
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand text-brand-foreground hover:bg-brand/90 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
                      title="تنزيل الملف للجهاز"
                    >
                      <Download className={`size-3.5 ${isCurrentDownloading ? 'animate-bounce' : ''}`} />
                      <span>{isCurrentDownloading ? 'جاري التحميل...' : 'تحميل'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* In-app File Preview Modal */}
      <FilePreviewModal
        isOpen={!!selectedPreviewFile}
        onClose={() => setSelectedPreviewFile(null)}
        file={selectedPreviewFile}
      />

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h3 className="text-xl font-extrabold text-foreground mb-6">أخبار ذات صلة</h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {relatedArticles.map((rel) => (
              <NewsCard
                key={rel.id}
                article={rel}
                onClick={() => onSelectArticle(rel)}
                size="sm"
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackTitle="حدث خطأ أثناء تحميل المادة الصحفية"
      fallbackMessage="نعتذر، واجه المتصفح مشكلة في عرض تفاصيل هذا الخبر. يرجى العودة إلى قائمة الأخبار أو المحاولة مرة أخرى."
      onReset={props.onBack}
    >
      <ArticleDetailContent {...props} />
    </ErrorBoundary>
  );
};
