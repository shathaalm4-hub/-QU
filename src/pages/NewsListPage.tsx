import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { NewsCard } from '../components/NewsCard';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Article } from '../types';

interface NewsListPageProps {
  onSelectArticle: (article: Article) => void;
  onOpenJoin: () => void;
  onEditArticle?: (article: Article) => void;
  initialCategory?: string;
  initialKind?: string;
}

// Exact topics from user specification (IMG_9032.jpeg) + قصص ومقالات
export const NEWSPAPER_TOPICS = [
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
];

// Exact material kinds / formats from user specification (IMG_9032.jpeg) + قصص ومقالات
export const NEWSPAPER_KINDS = [
  'تقارير وتحقيقات',
  'فيديو',
  'صور',
  'خبر',
  'تقرير',
  'مقابلة',
  'قصص',
  'مقالات',
  'ألبوم صور',
  'تقرير مرئي',
];

export const NewsListPage: React.FC<NewsListPageProps> = ({
  onSelectArticle,
  onOpenJoin,
  onEditArticle,
  initialCategory = 'الكل',
  initialKind = 'all',
}) => {
  const { publishedArticles, categories } = useNews();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedKind, setSelectedKind] = useState<string>(initialKind);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialKind) setSelectedKind(initialKind);
  }, [initialKind]);

  // Combined topic list (ensuring user's exact order, plus any newly created custom categories)
  const displayTopics = useMemo(() => {
    const excluded = new Set(['حياة طلابية', 'حياه طلابيه', 'محلي', 'أخبار الطلاب', 'تعليم']);
    const list = [...NEWSPAPER_TOPICS];
    categories.forEach((cat) => {
      if (cat && !excluded.has(cat.trim()) && !list.includes(cat)) {
        list.push(cat);
      }
    });
    return list.filter((c) => !excluded.has(c.trim()));
  }, [categories]);

  const filteredArticles = useMemo(() => {
    return publishedArticles.filter((art) => {
      // 1. Topic/Category filter
      if (selectedCategory !== 'الكل') {
        const cat = art.category?.trim();
        if (cat !== selectedCategory) {
          // Fallback matching for slight naming variants
          if (selectedCategory === 'جامعة' && (cat === 'أخبار الجامعة' || cat === 'حياة طلابية' || cat === 'أخبار الطلاب' || cat === 'تعليم')) {
            // match
          } else if (selectedCategory === 'ثقافة وفنون' && cat === 'ثقافة') {
            // match
          } else {
            return false;
          }
        }
      }

      // 2. Material Kind filter
      if (selectedKind !== 'all') {
        const kind = art.kind || '';
        const title = art.title || '';
        const mediaType = art.mediaType;

        if (selectedKind === 'خبر') {
          const isOther = kind === 'تقرير' || kind === 'مقابلة' || kind === 'تقارير وتحقيقات' || mediaType === 'video' || mediaType === 'album';
          if (isOther && kind !== 'خبر') return false;
        } else if (selectedKind === 'تقرير') {
          if (kind !== 'تقرير' && !title.includes('تقرير')) return false;
        } else if (selectedKind === 'مقابلة') {
          if (kind !== 'مقابلة' && !title.includes('مقابلة') && !title.includes('حوار')) return false;
        } else if (selectedKind === 'تقارير وتحقيقات') {
          if (kind !== 'تقارير وتحقيقات' && art.category !== 'تحقيقات ومقالات' && !title.includes('تحقيق') && !title.includes('استقصائي')) return false;
        } else if (selectedKind === 'فيديو') {
          if (mediaType !== 'video' && kind !== 'فيديو' && kind !== 'تقرير مرئي' && !art.videoUrl) return false;
        } else if (selectedKind === 'تقرير مرئي') {
          if (mediaType !== 'video' && kind !== 'تقرير مرئي' && !art.videoUrl) return false;
        } else if (selectedKind === 'صور') {
          if (mediaType !== 'album' && mediaType !== 'photo' && kind !== 'صور' && kind !== 'ألبوم صور' && (!art.extraImages || art.extraImages.length === 0)) return false;
        } else if (selectedKind === 'ألبوم صور') {
          if (mediaType !== 'album' && mediaType !== 'photo' && kind !== 'ألبوم صور' && (!art.extraImages || art.extraImages.length === 0)) return false;
        } else if (selectedKind === 'قصص') {
          if (kind !== 'قصص' && art.category !== 'قصص' && !title.includes('قصة') && !title.includes('قصص')) return false;
        } else if (selectedKind === 'مقالات') {
          if (kind !== 'مقالات' && art.category !== 'مقالات' && !title.includes('مقال') && !title.includes('رأي')) return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          art.title.toLowerCase().includes(q) ||
          art.excerpt.toLowerCase().includes(q) ||
          art.authorName.toLowerCase().includes(q) ||
          (art.category && art.category.toLowerCase().includes(q)) ||
          (art.keywords && art.keywords.some((k) => k.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [publishedArticles, selectedCategory, selectedKind, searchQuery]);

  const handleKindClick = (kind: string) => {
    if (selectedKind === kind) {
      setSelectedKind('all'); // toggle off
    } else {
      setSelectedKind(kind);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategory('الكل');
    setSelectedKind('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory !== 'الكل' || selectedKind !== 'all' || searchQuery.trim() !== '';

  return (
    <div dir="rtl" className="pb-16">
      <PageHeader
        title="أقسام ومواضيع الصحيفة"
        subtitle="تصفح الأخبار والتحقيقات والمواد الصحفية المصنفة حسب الأقسام والقوالب التحريرية"
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Filter Card Container Styled exactly as specified */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs mb-8 space-y-6">
          {/* Top Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالكلمة المفتاحية، الموضوع، أو اسم الصحفي..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pr-11 pl-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00838f]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Section 1: Topics / Categories (المواضيع) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                المواضيع والأقسام
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#00838f] hover:underline font-bold"
                >
                  إعادة ضبط الكل
                </button>
              )}
            </div>

            {/* Topics Pills - Row 1 & 2 */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
              {displayTopics.map((topic) => {
                const isActive = selectedCategory === topic;
                return (
                  <button
                    key={topic}
                    onClick={() => setSelectedCategory(topic)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer border shadow-xs ${
                      isActive
                        ? 'bg-[#0f2d4a] text-white border-[#0f2d4a] shadow-sm ring-2 ring-[#0f2d4a]/20'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Material Kinds / Formats (أنواع المواد) */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                نوع المادة الصحفية
              </span>
              {selectedKind !== 'all' && (
                <span className="text-[11px] text-slate-400">
                  (انقر مرة أخرى لإلغاء التحديد)
                </span>
              )}
            </div>

            {/* Kinds Pills */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
              {NEWSPAPER_KINDS.map((kind) => {
                const isActive = selectedKind === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => handleKindClick(kind)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer border shadow-xs ${
                      isActive
                        ? 'bg-[#00838f] text-white border-[#00838f] shadow-sm ring-2 ring-[#00838f]/20'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Summary Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-[#00838f]" />
              <span>
                النتائج المعروضة: <strong className="text-slate-900 dark:text-white font-bold">{filteredArticles.length}</strong> مادة صحفية
              </span>
              {selectedCategory !== 'الكل' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0f2d4a]/10 dark:bg-[#0f2d4a]/40 text-[#0f2d4a] dark:text-sky-300 font-bold">
                  {selectedCategory}
                </span>
              )}
              {selectedKind !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00838f]/10 dark:bg-[#00838f]/30 text-[#00838f] dark:text-cyan-300 font-bold">
                  {selectedKind}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Results grid or empty state */}
        {filteredArticles.length === 0 ? (
          <EmptyState
            title="لا توجد مواد صحفية تطابق التصنيف المختار"
            description="جرب اختيار موضوع آخر أو إلغاء تصفية نوع المادة للوصول إلى المحتوى المطلوب."
            cta={hasActiveFilters}
            onCtaClick={clearAllFilters}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
};
