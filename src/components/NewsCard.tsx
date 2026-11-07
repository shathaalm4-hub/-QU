import React from 'react';
import { Article } from '../types';
import { PlayCircle, Images, Eye, Clock, Edit3, Users } from 'lucide-react';
import { useNews } from '../context/NewsContext';

interface NewsCardProps {
  article: Article;
  onClick: () => void;
  onEdit?: (article: Article) => void;
  size?: 'sm' | 'md' | 'featured';
  variant?: 'featured' | 'standard' | 'horizontal' | 'compact';
}

const kindLabels: Record<string, string> = {
  news: 'خبر',
  report: 'تقرير',
  interview: 'مقابلة',
  photo: 'ألبوم صور',
  video: 'تقرير مرئي',
  article: 'مقال',
};

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onClick,
  onEdit,
  size = 'md',
  variant,
}) => {
  const { currentUser } = useNews();
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured' || size === 'featured';

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const authorId = String(article.authorId || (article as any)?.author_id || '');
  const sessUserId = String(currentUser?.id || (currentUser as any)?.userId || '');
  const sessStudentId = String(currentUser?.studentId || '');
  const articleAuthorStudentId = String(article.authorStudentId || (article as any)?.author_student_id || '');
  const articleAuthorName = String(article.authorName || (article as any)?.author_name || '').trim().toLowerCase();
  const articleAuthorEmail = String(article.authorEmail || (article as any)?.author_email || '').toLowerCase().trim();
  const sessName = String(currentUser?.name || '').trim().toLowerCase();
  const sessEmail = String(currentUser?.email || '').toLowerCase().trim();

  const isAuthor = Boolean(
    currentUser && (
      (authorId && (
        authorId === sessUserId ||
        authorId.replace(/^req-/, '') === sessUserId.replace(/^req-/, '')
      )) ||
      (sessStudentId && articleAuthorStudentId && sessStudentId === articleAuthorStudentId) ||
      (articleAuthorName && sessName && articleAuthorName === sessName) ||
      (articleAuthorEmail && sessEmail && articleAuthorEmail === sessEmail)
    )
  );

  const isCoAuthor = Boolean(
    currentUser && (
      (article.coAuthorIds && (article.coAuthorIds.includes(sessUserId) || (sessStudentId && article.coAuthorIds.includes(sessStudentId)))) ||
      (article.coAuthors && article.coAuthors.some((ca) =>
        ca.id === sessUserId ||
        ca.journalistId === sessUserId ||
        (sessStudentId && (ca.studentId === sessStudentId || ca.id === sessStudentId)) ||
        ca.name.toLowerCase() === sessName
      ))
    )
  );

  const canEdit = Boolean(onEdit && currentUser && (isStaff || isAuthor || isCoAuthor));

  const getSafeDate = () => {
    try {
      const rawDate = article.publishedAt || article.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : new Date();
      if (isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(new Date());
      }
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch {
      return 'اليوم';
    }
  };

  const formattedDate = getSafeDate();

  const kindKey = article.mediaType === 'video' ? 'video' : article.mediaType === 'album' ? 'photo' : 'news';
  const displayKind = article.kind || kindLabels[kindKey] || 'خبر';

  // Fallback image
  const defaultImage = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80';
  const imageUrl = article.mainImage || (article.galleryImages && article.galleryImages[0]) || defaultImage;

  // 1. Compact row card (for "الأكثر قراءة" and Archive lists)
  if (isCompact) {
    return (
      <div
        onClick={onClick}
        className="flex gap-3 border-b border-border py-3 last:border-0 cursor-pointer group text-right"
        dir="rtl"
      >
        <img
          src={imageUrl}
          alt={article.title}
          loading="lazy"
          className="size-20 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="line-clamp-2 text-sm font-bold leading-6 headline-link text-foreground">
              {article.title}
            </h4>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(article);
                }}
                className="p-1 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 transition-colors shrink-0"
                title="تعديل هذا الخبر المنشور"
              >
                <Edit3 className="size-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{formattedDate}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {article.viewsCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Featured Big Card (Home top story)
  if (isFeatured) {
    return (
      <article
        onClick={onClick}
        className="surface-card fade-rise block overflow-hidden cursor-pointer group text-right"
        dir="rtl"
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt={article.title}
            loading="lazy"
            className="h-64 w-full sm:h-96 object-cover transition-transform duration-500 group-hover:scale-102"
          />
          {article.isBreaking && (
            <div className="absolute top-3 right-3 flex gap-1">
              <span className="rounded px-2.5 py-1 text-xs font-extrabold bg-brand text-brand-foreground shadow-xs">
                عاجل
              </span>
            </div>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(article);
              }}
              className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-600 text-white text-xs font-bold shadow-lg backdrop-blur-xs transition-all cursor-pointer border border-amber-400/40"
              title="تعديل هذا الخبر المنشور"
            >
              <Edit3 className="size-3.5" />
              <span>تعديل الخبر المنشور</span>
            </button>
          )}
          {kindKey === 'video' && (
            <PlayCircle className="absolute bottom-3 left-3 size-10 text-white drop-shadow-md" />
          )}
          {kindKey === 'photo' && (
            <Images className="absolute bottom-3 left-3 size-8 text-white drop-shadow-md" />
          )}
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {article.isBreaking && (
              <span className="rounded px-2 py-0.5 text-xs font-extrabold bg-brand text-brand-foreground">
                عاجل
              </span>
            )}
            <span className="rounded bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              {article.category}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold leading-9 sm:text-3xl text-foreground group-hover:text-brand transition-colors">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="mt-3 text-muted-foreground line-clamp-2 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/90">{article.authorName}</span>
            <span>{formattedDate}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {article.viewsCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {article.readingTimeMinutes || 3} دقائق قراءة
            </span>
          </div>
        </div>
      </article>
    );
  }

  // 3. Standard / Small card (Reference ArticleCard)
  const isSm = size === 'sm';
  return (
    <article
      onClick={onClick}
      className="surface-card group overflow-hidden cursor-pointer flex flex-col justify-between text-right"
      dir="rtl"
    >
      <div>
        <div className="relative">
          <img
            src={imageUrl}
            alt={article.title}
            loading="lazy"
            className={`${isSm ? 'h-36' : 'h-48'} w-full object-cover transition-transform duration-500 group-hover:scale-103`}
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {article.isBreaking && (
              <span className="rounded px-2 py-0.5 text-[11px] font-extrabold bg-brand text-brand-foreground shadow-xs">
                عاجل
              </span>
            )}
            <span className="rounded bg-secondary/90 backdrop-blur-xs px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground shadow-xs">
              {displayKind}
            </span>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(article);
              }}
              className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-600 text-white text-[11px] font-bold shadow-md backdrop-blur-xs transition-all cursor-pointer border border-amber-400/40"
              title="تعديل هذا الخبر المنشور"
            >
              <Edit3 className="size-3" />
              <span>تعديل</span>
            </button>
          )}
          {kindKey === 'video' && (
            <PlayCircle className="absolute bottom-2 left-2 size-8 text-white drop-shadow" />
          )}
          {kindKey === 'photo' && (
            <Images className="absolute bottom-2 left-2 size-7 text-white drop-shadow" />
          )}
        </div>
        <div className="p-4">
          <span className="kicker">{article.category}</span>
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span className="truncate max-w-[140px] inline-flex items-center gap-1">
            <span>{article.authorName}</span>
            {article.coAuthors && article.coAuthors.length > 0 && (
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                title={`بمشاركة: ${article.coAuthors.map((c) => c.name).join('، ')}`}
              >
                <Users className="size-2.5" />
                <span>+{article.coAuthors.length}</span>
              </span>
            )}
          </span>
          <span>{formattedDate}</span>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" />
            {article.viewsCount}
          </span>
        </div>
      </div>
    </article>
  );
};
