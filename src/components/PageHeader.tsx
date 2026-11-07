import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="border-b border-border bg-accent/50" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <span className="kicker">صحيفة QU</span>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
