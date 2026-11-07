import React, { useState, useEffect } from 'react';
import { Search, User, Eye, BookOpen } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

interface JournalistsDirectoryPageProps {
  onSelectJournalist: (journalistId: string) => void;
  onOpenJoin: () => void;
}

export const JournalistsDirectoryPage: React.FC<JournalistsDirectoryPageProps> = ({
  onSelectJournalist,
  onOpenJoin,
}) => {
  const { users, publishedArticles, videoReports } = useNews();
  const [searchQuery, setSearchQuery] = useState('');
  const [apiJournalists, setApiJournalists] = useState<any[]>([]);

  const normalizeName = (str?: string) => {
    if (!str) return '';
    return str
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  // Fetch live approved journalists directly from backend/Supabase
  useEffect(() => {
    let isMounted = true;
    const loadJournalists = async () => {
      try {
        const res = await fetch('/api/journalists?status=approved');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.journalists)) {
            setApiJournalists(data.journalists);
          }
        }
      } catch {
        // ignore
      }
    };
    loadJournalists();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge context users and live Supabase API journalists seamlessly
  const combinedMap = new Map<string, any>();
  for (const u of users) {
    if (
      u.role === 'journalist' &&
      (u.status === 'approved' || !u.status || u.status === 'active') &&
      u.id !== 'jour-demo-1' &&
      u.name !== 'عبدالرحمن الشهري'
    ) {
      combinedMap.set(u.id, u);
    }
  }
  for (const aj of apiJournalists) {
    if (aj.id !== 'jour-demo-1' && aj.name !== 'عبدالرحمن الشهري') {
      const existing = combinedMap.get(aj.id);
      combinedMap.set(aj.id, { ...(existing || {}), ...aj, role: 'journalist', status: 'approved' });
    }
  }

  const journalists = Array.from(combinedMap.values());

  const filteredJournalists = journalists.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.name.toLowerCase().includes(q) ||
      (j.major && j.major.toLowerCase().includes(q)) ||
      (j.bio && j.bio.toLowerCase().includes(q))
    );
  });

  return (
    <div dir="rtl">
      <PageHeader
        title="دليل الصحفيين"
        subtitle="تعرّف على طلاب قسم الإعلام والاتصال وصحفيي المستقبل"
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Search Bar */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الصحفي أو التخصص..."
            className="w-full rounded-md border border-input bg-card pr-10 pl-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Directory Grid */}
        {filteredJournalists.length === 0 ? (
          <EmptyState
            title="لا يوجد صحفيون مطابقون للبحث"
            description="يمكنك الانضمام لصحيفة QU كصحفي طالب ونشر أعمالك وتغطياتك."
            onCtaClick={onOpenJoin}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJournalists.map((j) => {
              const normJName = normalizeName(j.name);
              const matchesItem = (item: any) => {
                if (
                  item.authorId === j.id ||
                  item.authorId === `req-${j.id}` ||
                  (j.studentId && (item.authorId === j.studentId || item.authorStudentId === j.studentId)) ||
                  (item.authorName && normalizeName(item.authorName) === normJName)
                ) {
                  return true;
                }
                if (
                  item.coAuthorIds &&
                  (item.coAuthorIds.includes(j.id) || (j.studentId && item.coAuthorIds.includes(j.studentId)))
                ) {
                  return true;
                }
                if (
                  item.coAuthors &&
                  item.coAuthors.some(
                    (ca: any) =>
                      ca.id === j.id ||
                      ca.journalistId === j.id ||
                      (j.studentId && (ca.studentId === j.studentId || ca.id === j.studentId)) ||
                      (ca.name && normalizeName(ca.name) === normJName)
                  )
                ) {
                  return true;
                }
                return false;
              };

              const journalistArticles = publishedArticles.filter(matchesItem);
              const journalistVideos = (videoReports || []).filter(matchesItem);
              const totalWorksCount = journalistArticles.length + journalistVideos.length;
              const totalViews =
                journalistArticles.reduce((acc, a) => acc + (a.viewsCount || 0), 0) +
                journalistVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

              return (
                <div
                  key={j.id}
                  onClick={() => onSelectJournalist(j.id)}
                  className="surface-card p-6 flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="size-20 mb-4 rounded-full overflow-hidden bg-accent flex items-center justify-center font-bold text-xl text-foreground ring-2 ring-border group-hover:ring-brand transition-all">
                    {j.avatar && j.avatar.trim() ? (
                      <img src={j.avatar.trim()} alt={j.name} className="size-full object-cover" />
                    ) : (
                      <span>{j.name.charAt(0)}</span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold headline-link text-foreground">
                    {j.name}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    {j.major || 'قسم الإعلام والاتصال'}
                  </p>

                  {j.academicLevel && (
                    <span className="mt-2 rounded bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {j.academicLevel}
                    </span>
                  )}

                  {j.bio && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {j.bio}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-border/60 w-full flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="size-3.5 text-brand" />
                      {totalWorksCount} مواد منشورة
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" />
                      {totalViews} مشاهدة
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
