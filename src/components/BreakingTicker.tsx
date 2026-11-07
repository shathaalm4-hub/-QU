import React from 'react';
import { useNews } from '../context/NewsContext';
import { Article } from '../types';

interface BreakingTickerProps {
  onSelectArticle: (article: Article) => void;
}

export const BreakingTicker: React.FC<BreakingTickerProps> = ({ onSelectArticle }) => {
  const { breakingArticles } = useNews();

  if (!breakingArticles || breakingArticles.length === 0) {
    return null;
  }

  // Duplicate items for continuous ticker scroll
  const displayItems = [...breakingArticles, ...breakingArticles];

  return (
    <div className="bg-brand text-brand-foreground overflow-hidden" dir="rtl">
      <div className="mx-auto flex h-9 max-w-7xl items-center gap-3 px-4 text-xs font-bold">
        <span className="shrink-0 rounded bg-brand-foreground/15 px-2 py-1 text-xs font-extrabold">
          عاجل
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track">
            {displayItems.map((article, idx) => (
              <button
                key={`${article.id}-${idx}`}
                onClick={() => onSelectArticle(article)}
                className="hover:underline cursor-pointer transition-colors text-right"
              >
                {article.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
