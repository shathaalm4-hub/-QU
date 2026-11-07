import React, { useState } from 'react';
import { X, Search, FileText, Video, Images, User, ChevronLeft } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { Article } from '../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
  onSelectJournalist: (id: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectArticle,
  onSelectJournalist,
}) => {
  const { publishedArticles, videoReports, photoAlbums, users } = useNews();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const query = searchTerm.trim().toLowerCase();

  const matchedArticles = query
    ? publishedArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query) ||
          a.authorName.toLowerCase().includes(query)
      )
    : [];

  const matchedJournalists = query
    ? users.filter(
        (u) =>
          u.role === 'journalist' &&
          u.status === 'approved' &&
          (u.name.toLowerCase().includes(query) ||
            (u.major && u.major.toLowerCase().includes(query)) ||
            (u.studentId && u.studentId.includes(query)))
      )
    : [];

  const matchedVideos = query
    ? videoReports.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.summary.toLowerCase().includes(query) ||
          v.authorName.toLowerCase().includes(query)
      )
    : [];

  const totalMatches = matchedArticles.length + matchedJournalists.length + matchedVideos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative">
        {/* Search Header */}
        <div className="relative mb-4">
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن خبر، تقرير، صحفي، تحقيق، موضوع..."
            className="w-full pr-11 pl-10 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00838f]"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
          <button
            onClick={onClose}
            className="absolute left-3 top-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
          {!query ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              اكتب كلمة للبحث الفوري في جميع محتويات صحيفة QU
            </div>
          ) : totalMatches === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لم يتم العثور على نتائج مطابقة لـ "{searchTerm}"
            </div>
          ) : (
            <>
              {/* Articles */}
              {matchedArticles.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#00838f]" />
                    <span>الأخبار والتحقيقات ({matchedArticles.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedArticles.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#00838f] truncate">
                            {art.title}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {art.category} • {art.authorName}
                          </span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00838f] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Journalists */}
              {matchedJournalists.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span>الصحفيون الطلاب ({matchedJournalists.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedJournalists.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          onSelectJournalist(j.id);
                          onClose();
                        }}
                        className="w-full text-right p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white">
                          {j.avatar && j.avatar.trim() ? <img src={j.avatar.trim()} alt={j.name} className="w-full h-full object-cover" /> : j.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#00838f]">
                            {j.name}
                          </p>
                          <span className="text-[10px] text-slate-500">{j.major || 'إعلام واتصال'} • الرقم: {j.studentId || '-'}</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#00838f] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {matchedVideos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-500" />
                    <span>التقارير المرئية ({matchedVideos.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {matchedVideos.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-right"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{v.title}</p>
                          <span className="text-[10px] text-slate-500">{v.authorName} • {v.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
