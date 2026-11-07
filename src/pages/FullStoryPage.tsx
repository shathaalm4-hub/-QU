import React from 'react';
import { Layers, Calendar, Eye, ArrowLeft, Clock } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Article } from '../types';

interface FullStoryPageProps {
  onSelectArticle: (article: Article) => void;
  onBack?: () => void;
}

export const FullStoryPage: React.FC<FullStoryPageProps> = ({
  onSelectArticle,
}) => {
  const { publishedArticles } = useNews();

  // Timeline / continuous stories
  const timelineArticles = [...publishedArticles].sort(
    (a, b) =>
      new Date(b.publishedAt || b.createdAt).getTime() -
      new Date(a.publishedAt || a.createdAt).getTime()
  );

  return (
    <div dir="rtl">
      <PageHeader
        title="القصة الكاملة"
        subtitle="تغطيات صحفية معمقة وملفات شاملة تجمع خيوط الحدث لحظة بلحظة"
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {timelineArticles.length === 0 ? (
          <EmptyState
            title="لا توجد ملفات صحفية حالياً"
            description="يتم حالياً إعداد ملفات وقصص صحفية معمقة من قِبل طلاب القسم."
            cta={false}
          />
        ) : (
          <div className="space-y-8">
            {/* Lead Story Card */}
            {timelineArticles[0] && (
              <div
                onClick={() => onSelectArticle(timelineArticles[0])}
                className="surface-card overflow-hidden cursor-pointer group"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative h-64 md:h-full min-h-[260px]">
                    <img
                      src={timelineArticles[0].mainImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                      alt={timelineArticles[0].title}
                      className="size-full object-cover"
                    />
                    <span className="absolute top-3 right-3 rounded bg-brand text-brand-foreground text-xs font-extrabold px-2.5 py-1">
                      ملف خاص
                    </span>
                  </div>
                  <div className="p-6 flex flex-col justify-between">
                    <div>
                      <span className="kicker">{timelineArticles[0].category}</span>
                      <h2 className="mt-2 text-2xl font-black headline-link text-foreground">
                        {timelineArticles[0].title}
                      </h2>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {timelineArticles[0].excerpt}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{timelineArticles[0].authorName}</span>
                      <div className="flex items-center gap-1 text-brand font-bold">
                        <span>تابع تفاصيل القصة</span>
                        <ArrowLeft className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline of connected stories */}
            <div className="mt-12">
              <h3 className="text-xl font-extrabold text-foreground mb-6">
                التسلسل الزمني ومستجدات التغطية
              </h3>

              <div className="relative border-r-2 border-border mr-4 pr-6 space-y-8">
                {timelineArticles.map((art) => (
                  <div key={art.id} className="relative group">
                    {/* Circle on timeline */}
                    <div className="absolute -right-[31px] top-1 size-3.5 rounded-full bg-brand ring-4 ring-background" />

                    <div
                      onClick={() => onSelectArticle(art)}
                      className="surface-card p-5 cursor-pointer group hover:border-brand transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
                        <span className="font-semibold text-brand">{art.category}</span>
                        <span>
                          {new Intl.DateTimeFormat('ar-SA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }).format(new Date(art.publishedAt || art.createdAt))}
                        </span>
                      </div>

                      <h4 className="text-base font-bold headline-link text-foreground">
                        {art.title}
                      </h4>

                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {art.excerpt}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span>بقلم: {art.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" />
                          {art.viewsCount} مشاهدة
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
