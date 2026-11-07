import React from 'react';
import { Newspaper } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  cta?: boolean;
  onCtaClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد أخبار منشورة حالياً، كن أول الصحفيين نشرًا!',
  description = 'بمجرد نشر الصحفيين الطلاب لأعمالهم ستظهر هنا مباشرة.',
  cta = true,
  onCtaClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-14 text-center" dir="rtl">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Newspaper className="size-7" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {cta && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-semibold hover:bg-brand/90 transition-colors cursor-pointer"
        >
          انضم كصحفي
        </button>
      )}
    </div>
  );
};
