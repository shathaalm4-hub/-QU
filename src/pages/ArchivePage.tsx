import React, { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { PageHeader } from '../components/PageHeader';
import { NewsCard } from '../components/NewsCard';
import { EmptyState } from '../components/EmptyState';
import { Article } from '../types';

interface ArchivePageProps {
  onSelectArticle: (article: Article) => void;
  onEditArticle?: (article: Article) => void;
  onBack?: () => void;
}

export const ArchivePage: React.FC<ArchivePageProps> = ({ onSelectArticle, onEditArticle }) => {
  const { publishedArticles, categories } = useNews();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = publishedArticles.filter((art) => {
    if (selectedCategory !== 'all' && art.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div dir="rtl">
      <PageHeader
        title="أرشيف الصحيفة"
        subtitle="استعرض جميع الأعداد والمواد الصحفية المنشورة حسب التاريخ والتصنيف"
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Filter / Search Bar */}
        <div className="surface-card p-4 mb-8 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأرشيف الصحفي..."
              className="w-full rounded-md border border-input bg-card pr-10 pl-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">كافة الأقسام والمواضيع</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Archive List */}
        {filteredArticles.length === 0 ? (
          <EmptyState
            title="لا توجد مواد أرشيفية مطابقة"
            description="جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً."
            cta={false}
          />
        ) : (
          <div className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-bold text-foreground">
                المواد المؤرشفة ({filteredArticles.length})
              </span>
            </div>
            <div className="divide-y divide-border">
              {filteredArticles.map((article) => (
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
        )}
      </div>
    </div>
  );
};
