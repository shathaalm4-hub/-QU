import React, { useState } from 'react';
import { 
  Flame, 
  Newspaper, 
  PlayCircle, 
  Images, 
  FileText, 
  Play, 
  X,
  Eye,
  Calendar,
  Clock,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { BreakingTicker } from '../components/BreakingTicker';
import { NewsCard } from '../components/NewsCard';
import { EmptyState } from '../components/EmptyState';
import { Article, VideoReport, PhotoAlbum } from '../types';
import { UniversalVideoPlayer } from '../components/UniversalVideoPlayer';

interface HomepageProps {
  onSelectArticle: (article: Article) => void;
  onNavigateTab: (tab: string, cat?: string, kind?: string) => void;
  onOpenJoin: () => void;
  onOpenCreateArticle: () => void;
  onSelectJournalist: (id: string) => void;
  onEditArticle?: (article: Article) => void;
  onEditVideo?: (video: VideoReport) => void;
}

export const Homepage: React.FC<HomepageProps> = ({
  onSelectArticle,
  onNavigateTab,
  onOpenJoin,
  onEditArticle,
  onEditVideo,
}) => {
  const { 
    currentUser,
    publishedArticles, 
    featuredArticle, 
    videoReports, 
    photoAlbums, 
  } = useNews();

  // Active video player modal state
  const [selectedVideo, setSelectedVideo] = useState<VideoReport | null>(null);
  // Active photo album modal state
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);

  // Main featured article (or first published)
  const heroArticle = featuredArticle || publishedArticles[0];

  // Articles for the 2x2 grid under the hero article
  const subFeaturedArticles = publishedArticles
    .filter((a) => a.id !== heroArticle?.id)
    .slice(0, 4);

  // Most Read Articles (sorted by viewsCount)
  const mostReadArticles = [...publishedArticles]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 5);

  // Latest News grid (articles following the top group)
  const latestFeedArticles = publishedArticles
    .filter((a) => a.id !== heroArticle?.id && !subFeaturedArticles.some((sub) => sub.id === a.id))
    .slice(0, 8);

  // Investigations & in-depth reports
  const investigativeArticles = publishedArticles
    .filter((a) => a.category === 'تحقيقات ومقالات' || (a.readingTimeMinutes && a.readingTimeMinutes >= 4))
    .slice(0, 3);

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Breaking News Ticker */}
      <BreakingTicker onSelectArticle={onSelectArticle} />

      {/* Topics Quick Access Strip */}
      <div className="mx-auto max-w-7xl px-4 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          <span className="text-xs font-bold text-slate-500 shrink-0 ml-1">
            الأقسام:
          </span>
          {[
            'الكل',
            'جامعة',
            'مجتمع',
            'اقتصاد',
            'رياضة',
            'ثقافة وفنون',
            'تقنية',
            'عالمي',
            'قصص',
            'مقالات',
          ].map((topic) => (
            <button
              key={topic}
              onClick={() => onNavigateTab('news', topic, 'all')}
              className="shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-[#0f2d4a] hover:text-white hover:border-[#0f2d4a] transition-all cursor-pointer shadow-2xs"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {publishedArticles.length === 0 ? (
          <EmptyState onCtaClick={onOpenJoin} />
        ) : (
          <>
            {/* 2. Main Hero Grid: 2 Cols Hero/Sub + 1 Col Most Read/CTA */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                {heroArticle && (
                  <NewsCard
                    article={heroArticle}
                    onClick={() => onSelectArticle(heroArticle)}
                    onEdit={onEditArticle}
                    size="featured"
                  />
                )}

                {/* 2x2 Grid of next 4 articles */}
                {subFeaturedArticles.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {subFeaturedArticles.map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                        onClick={() => onSelectArticle(article)}
                        onEdit={onEditArticle}
                        size="sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Column (1/3 width) */}
              <div className="space-y-6">
                {/* Most Read Box */}
                <div className="surface-card p-5">
                  <div className="mb-3 flex items-center gap-2 font-extrabold text-foreground border-border/60 pb-3">
                    <Flame className="size-5 text-brand" />
                    <span className="text-base">الأكثر قراءة</span>
                  </div>
                  <div className="divide-y divide-border">
                    {mostReadArticles.map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                        onClick={() => onSelectArticle(article)}
                        onEdit={onEditArticle}
                        variant="compact"
                      />
                    ))}
                  </div>
                </div>

                {/* Call-to-action for students */}
                <div className="surface-card bg-primary p-6 text-primary-foreground rounded-lg shadow-md">
                  <span className="text-xs font-bold text-primary-foreground/75">
                    قسم الإعلام والاتصال
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold">
                    هل أنت طالب في الإعلام والاتصال؟
                  </h3>
                  <p className="mt-2 text-sm text-primary-foreground/75 leading-relaxed">
                    انضم لفريق صحيفة QU وانشر أخبارك وتقاريرك بعد اعتماد هيئة التحرير.
                  </p>
                  <button
                    onClick={onOpenJoin}
                    className="mt-5 w-full rounded-md bg-brand text-brand-foreground py-2.5 text-sm font-bold hover:bg-brand/90 transition-colors cursor-pointer shadow-sm"
                  >
                    تقديم طلب انضمام
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Latest News Section */}
            {latestFeedArticles.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Newspaper className="size-5 text-brand" />
                    <h2 className="text-xl font-extrabold text-foreground">أحدث الأخبار</h2>
                  </div>
                  <button
                    onClick={() => onNavigateTab('news')}
                    className="text-sm font-semibold text-brand hover:underline cursor-pointer"
                  >
                    كل الأخبار
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {latestFeedArticles.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      onClick={() => onSelectArticle(article)}
                      onEdit={onEditArticle}
                      size="md"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 4. Video Reports Section */}
            {videoReports && videoReports.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="size-5 text-brand" />
                    <h2 className="text-xl font-extrabold text-foreground">تقارير مرئية</h2>
                  </div>
                  <button
                    onClick={() => onNavigateTab('videos')}
                    className="text-sm font-semibold text-brand hover:underline cursor-pointer"
                  >
                    المزيد
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {videoReports.slice(0, 3).map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className="surface-card group overflow-hidden cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={video.thumbnailUrl && video.thumbnailUrl.trim() ? video.thumbnailUrl : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80'}
                          alt={video.title}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform group-hover:scale-110">
                            <Play className="size-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                          {video.duration || '02:45'}
                        </span>
                        {currentUser && (currentUser.role === 'admin' || currentUser.id === video.authorId || (Boolean(currentUser.studentId) && currentUser.studentId === video.authorStudentId) || video.coAuthorIds?.includes(currentUser.id)) && onEditVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditVideo(video);
                            }}
                            className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-600 text-white text-[11px] font-bold shadow-md backdrop-blur-xs transition-all cursor-pointer border border-amber-400/40"
                            title="تعديل بيانات التقرير المرئي دون إعادة رفع الملف"
                          >
                            <Edit3 className="size-3" />
                            <span>تعديل</span>
                          </button>
                        )}
                      </div>
                      <div className="p-4">
                        <span className="kicker">فيديو</span>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
                          {video.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {video.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <span className="truncate max-w-[120px]">
                            {video.authorName}{video.coAuthors && video.coAuthors.length > 0 ? ` (+${video.coAuthors.length} مشارك)` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3.5" />
                            {video.viewsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Photo Albums Section */}
            {photoAlbums && photoAlbums.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Images className="size-5 text-brand" />
                    <h2 className="text-xl font-extrabold text-foreground">ألبومات الصور</h2>
                  </div>
                  <button
                    onClick={() => onNavigateTab('albums')}
                    className="text-sm font-semibold text-brand hover:underline cursor-pointer"
                  >
                    المزيد
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photoAlbums.slice(0, 3).map((album) => (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbum(album)}
                      className="surface-card group overflow-hidden cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={album.coverImage && album.coverImage.trim() ? album.coverImage : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                          alt={album.title}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                          <Images className="size-3.5" />
                          {album.images?.length || 0} صورة
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="kicker">ألبوم مصور</span>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
                          {album.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {album.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <span>{album.photographerName}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3.5" />
                            {album.viewsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Investigative Reports Section */}
            {investigativeArticles.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-brand" />
                    <h2 className="text-xl font-extrabold text-foreground">تقارير وتحقيقات</h2>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {investigativeArticles.map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      onClick={() => onSelectArticle(article)}
                      onEdit={onEditArticle}
                      size="md"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Video Modal Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden border border-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-foreground line-clamp-1">{selectedVideo.title}</h3>
                {currentUser && (
                  currentUser.role === 'admin' ||
                  currentUser.role === 'editor' ||
                  selectedVideo.authorId === currentUser.id ||
                  selectedVideo.authorName === currentUser.name ||
                  (selectedVideo.coAuthors && selectedVideo.coAuthors.some((ca) => ca.journalistId === currentUser.id || ca.id === currentUser.id || ca.name === currentUser.name))
                ) && onEditVideo && (
                  <button
                    onClick={() => {
                      const vid = selectedVideo;
                      setSelectedVideo(null);
                      onEditVideo(vid);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer shrink-0"
                    title="تعديل بيانات التقرير المرئي"
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
              {selectedVideo.description}
            </div>
          </div>
        </div>
      )}

      {/* Photo Album Modal Viewer */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden border border-border shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">{selectedAlbum.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedAlbum.photographerName}</p>
              </div>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedAlbum.images?.map((img, idx) => (
                <div key={idx} className="space-y-1">
                  <img
                    src={img.url && img.url.trim() ? img.url : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                    alt={img.caption || selectedAlbum.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {img.caption && (
                    <p className="text-xs text-muted-foreground text-center">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
