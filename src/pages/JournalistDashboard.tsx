import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Video, 
  Images, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Edit3, 
  Eye, 
  Trash2, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  Users,
  Film,
  Play
} from 'lucide-react';
import { useNews, setActiveCurrentUser } from '../context/NewsContext';
import { Article, VideoReport } from '../types';
import { EditJournalistProfileModal } from '../components/EditJournalistProfileModal';
import { QuickUploadModal } from '../components/QuickUploadModal';

interface JournalistDashboardProps {
  onOpenCreateArticle: () => void;
  onOpenCreateVideo: () => void;
  onOpenCreateAlbum: () => void;
  onEditArticle: (article: Article) => void;
  onSelectArticle: (article: Article) => void;
  onEditVideo?: (video: VideoReport) => void;
}

export const JournalistDashboard: React.FC<JournalistDashboardProps> = ({
  onOpenCreateArticle,
  onOpenCreateVideo,
  onOpenCreateAlbum,
  onEditArticle,
  onSelectArticle,
  onEditVideo,
}) => {
  const { currentUser, articles, videoReports, deleteArticle, deleteArticleVideo, addToast, refreshData } = useNews();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  const [videoArticleToDelete, setVideoArticleToDelete] = useState<Article | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);

  useEffect(() => {
    if (currentUser) setActiveCurrentUser(currentUser);
    refreshData(true);
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const normalizeName = (str?: string) => {
    if (!str) return '';
    return str
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  const normCurrentUserName = normalizeName(currentUser.name);

  // Primary author check
  const isPrimaryAuthor = (a: Article) => {
    return (
      a.authorId === currentUser.id ||
      a.authorId === `req-${currentUser.id}` ||
      (Boolean(currentUser.studentId) && (a.authorId === currentUser.studentId || a.authorStudentId === currentUser.studentId)) ||
      (Boolean(a.authorName) && normalizeName(a.authorName) === normCurrentUserName)
    );
  };

  // Co-author check
  const isCoAuthorOnArticle = (a: Article) => {
    if (isPrimaryAuthor(a)) return false;
    const hasIdInList = Boolean(
      a.coAuthorIds && (
        a.coAuthorIds.includes(currentUser.id) ||
        (currentUser.studentId && a.coAuthorIds.includes(currentUser.studentId))
      )
    );
    const hasInObjects = Boolean(
      a.coAuthors && a.coAuthors.some((ca) =>
        ca.id === currentUser.id ||
        ca.journalistId === currentUser.id ||
        (currentUser.studentId && (ca.studentId === currentUser.studentId || ca.id === currentUser.studentId)) ||
        normalizeName(ca.name) === normCurrentUserName
      )
    );
    return hasIdInList || hasInObjects;
  };

  // Journalist's articles (both primary and co-authored)
  const myArticles = articles.filter((a) => isPrimaryAuthor(a) || isCoAuthorOnArticle(a));
  const primaryArticles = myArticles.filter((a) => isPrimaryAuthor(a));
  const coAuthoredArticles = myArticles.filter((a) => isCoAuthorOnArticle(a));

  // Video reports owned or co-authored
  const isPrimaryOnVideo = (v: VideoReport) => {
    return (
      v.authorId === currentUser.id ||
      v.authorId === `req-${currentUser.id}` ||
      (Boolean(currentUser.studentId) && (v.authorId === currentUser.studentId || v.authorStudentId === currentUser.studentId)) ||
      (Boolean(v.authorName) && normalizeName(v.authorName) === normCurrentUserName)
    );
  };

  const isCoAuthorOnVideo = (v: VideoReport) => {
    if (isPrimaryOnVideo(v)) return false;
    const hasIdInList = Boolean(
      v.coAuthorIds && (
        v.coAuthorIds.includes(currentUser.id) ||
        (currentUser.studentId && v.coAuthorIds.includes(currentUser.studentId))
      )
    );
    const hasInObjects = Boolean(
      v.coAuthors && v.coAuthors.some((ca) =>
        ca.id === currentUser.id ||
        ca.journalistId === currentUser.id ||
        (currentUser.studentId && (ca.studentId === currentUser.studentId || ca.id === currentUser.studentId)) ||
        normalizeName(ca.name) === normCurrentUserName
      )
    );
    return hasIdInList || hasInObjects;
  };

  const myVideos = (videoReports || []).filter((v) => isPrimaryOnVideo(v) || isCoAuthorOnVideo(v));
  const primaryVideos = myVideos.filter((v) => isPrimaryOnVideo(v));
  const coAuthoredVideos = myVideos.filter((v) => isCoAuthorOnVideo(v));

  const published = myArticles.filter((a) => a.status === 'published' || a.status === 'approved');
  const underReview = myArticles.filter((a) => a.status === 'under_review' || (a.status as string) === 'pending');
  const needsEdit = myArticles.filter((a) => a.status === 'needs_edit');
  const rejected = myArticles.filter((a) => a.status === 'rejected');
  const drafts = myArticles.filter((a) => a.status === 'draft');

  const totalViews = published.reduce((acc, a) => acc + (a.viewsCount || 0), 0) +
    myVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

  const filteredArticles = myArticles.filter((a) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'primary') return isPrimaryAuthor(a);
    if (filterStatus === 'coauthor') return isCoAuthorOnArticle(a);
    if (filterStatus === 'published') return a.status === 'published' || a.status === 'approved';
    if (filterStatus === 'under_review') return a.status === 'under_review' || (a.status as string) === 'pending';
    return a.status === filterStatus;
  });

  const filteredVideos = myVideos.filter((v) => {
    if (filterStatus === 'videos' || filterStatus === 'all' || filterStatus === 'published') return true;
    if (filterStatus === 'primary') return isPrimaryOnVideo(v);
    if (filterStatus === 'coauthor') return isCoAuthorOnVideo(v);
    return false;
  });

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الخبر: "${title}"؟`)) {
      await deleteArticle(id);
    }
  };

  const handleConfirmDeleteVideo = async () => {
    if (!videoArticleToDelete) return;
    setIsDeletingVideo(true);
    try {
      const res = await deleteArticleVideo(videoArticleToDelete.id);
      if (res.success) {
        setVideoArticleToDelete(null);
      }
    } catch (err: any) {
      addToast('error', 'خطأ', 'حدث خطأ أثناء محاولة حذف الفيديو');
    } finally {
      setIsDeletingVideo(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-cairo" dir="rtl">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#006699] to-[#00838f] flex items-center justify-center font-bold text-xl text-white overflow-hidden border-2 border-white/20">
            {currentUser.avatar && currentUser.avatar.trim() ? (
              <img src={currentUser.avatar.trim()} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">أهلاً بك، {currentUser.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00838f] text-white">
                صحفي معتمد
              </span>
            </div>
            <p className="text-xs text-slate-300 font-tajawal mt-0.5">
              قسم الإعلام والاتصال • {currentUser.major || 'صحافة ونشر رقمي'} ({currentUser.academicLevel || 'المستوى الأول'})
            </p>
          </div>
        </div>

        {/* Quick actions buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-edit-profile-dashboard"
            onClick={() => setIsEditProfileOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 shadow-md transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>تعديل الملف الصحفي</span>
          </button>

          <button
            id="btn-create-article-dashboard"
            onClick={onOpenCreateArticle}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00838f] hover:bg-[#00707a] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>كتابة خبر صحفي</span>
          </button>

          <button
            onClick={onOpenCreateVideo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>تقرير مرئي</span>
          </button>

          <button
            onClick={onOpenCreateAlbum}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Images className="w-4 h-4" />
            <span>ألبوم صور</span>
          </button>

          <button
            onClick={() => setIsQuickUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 shadow-md transition-all cursor-pointer"
            title="رفع ملف أو مستند مستقل"
          >
            <UploadCloud className="w-4 h-4 text-sky-400" />
            <span>رفع ملف</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold">مواد معتمدة ومنشورة</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{published.length + myVideos.length}</span>
          <span className="block text-[10px] text-slate-400 mt-1">أخبار وتقارير مرئية منشورة</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold">أعمال مشتركة (Co-authors)</span>
            <Users className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{coAuthoredArticles.length + coAuthoredVideos.length}</span>
          <span className="block text-[10px] text-slate-400 mt-1">أعمال شاركت فيها كصحفي مشارك</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-bold">قيد التدقيق والمراجعة</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{underReview.length}</span>
          <span className="block text-[10px] text-slate-400 mt-1">بانتظار موافقة هيئة التحرير</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[#00838f] mb-2">
            <span className="text-xs font-bold">إجمالي قراءات ومشاهدات</span>
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalViews}</span>
          <span className="block text-[10px] text-slate-400 mt-1">مشاهدة لكافة أعمالك وفيديوهاتك</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل ({myArticles.length + myVideos.length})
            </button>
            <button
              onClick={() => setFilterStatus('primary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'primary'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              أعمالي الأساسية ({primaryArticles.length + primaryVideos.length})
            </button>
            <button
              onClick={() => setFilterStatus('coauthor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'coauthor'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              أعمال مشتركة ({coAuthoredArticles.length + coAuthoredVideos.length})
            </button>
            <button
              onClick={() => setFilterStatus('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'published'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              منشورة ({published.length + myVideos.length})
            </button>
            <button
              onClick={() => setFilterStatus('under_review')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'under_review'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              قيد المراجعة ({underReview.length})
            </button>
            <button
              onClick={() => setFilterStatus('needs_edit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'needs_edit'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              تتطلب تعديل ({needsEdit.length})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              مرفوضة ({rejected.length})
            </button>
            <button
              onClick={() => setFilterStatus('videos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'videos'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              التقارير المرئية ({myVideos.length})
            </button>
          </div>
        </div>

        {/* Videos + Articles View */}
        {filterStatus === 'videos' ? (
          myVideos.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Film className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                لا توجد تقارير مرئية مسجلة باسمك أو بمشاركتك حالياً
              </p>
              <button
                onClick={onOpenCreateVideo}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                إنشاء تقرير مرئي جديد
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myVideos.map((vid) => {
                const isPrimary = isPrimaryOnVideo(vid);
                return (
                  <div
                    key={vid.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 relative group">
                        <img
                          src={vid.thumbnailUrl || vid.coverImage || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80'}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                          {vid.duration || '02:30'}
                        </span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPrimary
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                          }`}>
                            {isPrimary ? 'مؤلف أساسي' : 'صحفي مشارك'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                            فيديو
                          </span>
                          <span className="text-[11px] text-[#00838f] font-semibold">{vid.category}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {vid.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {vid.summary || vid.description}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          الناشر: {vid.authorName} • المشاهدات: {vid.viewsCount || 0}
                        </p>
                        {vid.coAuthors && vid.coAuthors.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium pt-0.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>فريق العمل: بمشاركة {vid.coAuthors.map((c) => c.name).join('، ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {onEditVideo && (
                        <button
                          onClick={() => onEditVideo(vid)}
                          className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                          title="تعديل التقرير المرئي"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>تعديل الفيديو</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredArticles.length === 0 && filteredVideos.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              لا توجد مقالات أو تقارير مرئية مسجلة في هذا التبويب
            </p>
            <button
              onClick={onOpenCreateArticle}
              className="px-4 py-2 rounded-xl bg-[#00838f] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              اكتب مادة صحفية جديدة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVideos.map((vid) => {
              const isPrimary = isPrimaryOnVideo(vid);
              return (
                <div
                  key={vid.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 relative group">
                      <img
                        src={vid.thumbnailUrl || vid.coverImage || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80'}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                        {vid.duration || '02:30'}
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPrimary
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                        }`}>
                          {isPrimary ? 'مؤلف أساسي' : 'صحفي مشارك'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          منشور ومعتمد على الموقع
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          تقرير مرئي
                        </span>
                        <span className="text-[11px] text-[#00838f] font-semibold">{vid.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {vid.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {vid.summary || vid.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        الناشر: {vid.authorName} • المشاهدات: {vid.viewsCount || 0}
                      </p>
                      {vid.coAuthors && vid.coAuthors.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium pt-0.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>فريق العمل: بمشاركة {vid.coAuthors.map((c) => c.name).join('، ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {onEditVideo && (
                      <button
                        onClick={() => onEditVideo(vid)}
                        className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                        title="تعديل التقرير المرئي"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>تعديل الفيديو</span>
                      </button>
                    )}
                    <span
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-xs"
                      title="تقرير مرئي منشور"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>منشور ومحمي</span>
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredArticles.map((art) => {
              const statusBadges: Record<string, { label: string; color: string }> = {
                published: { label: 'منشور ومعتمد على الموقع', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
                approved: { label: 'معتمد ومنشور', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
                under_review: { label: 'قيد تدقيق المحرر', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
                needs_edit: { label: 'مطلوب تعديل وتحسين', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300' },
                rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' },
                draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
              };
              const badge = statusBadges[art.status] || statusBadges.published;
              const isPrimary = isPrimaryAuthor(art);
              const isCoAuthor = isCoAuthorOnArticle(art);

              return (
                <div
                  key={art.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      <img
                        src={art.mainImage && art.mainImage.trim() ? art.mainImage : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                        alt={art.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Author Role Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPrimary
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                        }`}>
                          {isPrimary ? 'مؤلف أساسي' : 'صحفي مشارك'}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-[#00838f] font-semibold">{art.category}</span>
                        {art.isBreaking && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                            عاجل
                          </span>
                        )}
                        {Boolean(art.videoUrl || (art as any).video_url) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            <span>فيديو مرفق</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {art.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        تاريخ التقديم: {new Date(art.createdAt).toLocaleDateString('ar-SA')} • المشاهدات: {art.viewsCount}
                      </p>

                      {/* Co-authors team indicator */}
                      {art.coAuthors && art.coAuthors.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-medium pt-0.5">
                          <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>
                            الصحفي الأساسي: {art.authorName} • المشاركون: {art.coAuthors.map((c) => c.name).join('، ')}
                          </span>
                        </div>
                      )}

                      {/* Editorial feedback note if needs edit or rejected */}
                      {Boolean(art.editorialNotes || art.editorFeedback) && (
                        <div
                          className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-1.5 ${
                            art.status === 'rejected'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                              : 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-300'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">
                              {art.status === 'rejected' ? 'سبب الرفض: ' : 'ملاحظات هيئة التحرير: '}
                            </span>
                            <span>{art.editorialNotes || art.editorFeedback}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {art.status === 'published' && (
                      <button
                        onClick={() => onSelectArticle(art)}
                        className="p-2 rounded-xl text-slate-600 hover:text-[#00838f] hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="معاينة في الموقع"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      id={`btn-edit-article-${art.id}`}
                      onClick={() => onEditArticle(art)}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        art.status === 'published' || art.status === 'approved'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                          : 'text-slate-600 hover:text-[#00838f] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      title={art.status === 'published' || art.status === 'approved' ? 'تعديل الخبر المنشور بعد الاعتماد' : 'تعديل المادة الصحفية'}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{art.status === 'published' || art.status === 'approved' ? 'تعديل الخبر المنشور' : 'تعديل'}</span>
                    </button>

                    {Boolean(art.videoUrl || (art as any).video_url) && (
                      <button
                        id={`btn-delete-dashboard-video-${art.id}`}
                        onClick={() => setVideoArticleToDelete(art)}
                        className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 text-xs font-bold border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                        title="حذف مقطع الفيديو المرفق بهذا الخبر"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>حذف الفيديو</span>
                      </button>
                    )}

                    {art.status === 'published' || art.status === 'approved' ? (
                      <span
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-xs"
                        title="مادة صحفية منشورة ومحمية في الأرشيف الدائم"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>منشور ومحمي</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDelete(art.id, art.title)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="حذف المسودة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Delete Confirmation Modal */}
      {videoArticleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">تأكيد حذف الفيديو</h3>
                <p className="text-xs text-slate-500">حذف مقطع الفيديو المرفق بالمادة الصحفية</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">عنوان الخبر:</span>
              <p className="text-slate-600 dark:text-slate-400 font-medium line-clamp-2">{videoArticleToDelete.title}</p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-tajawal leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الفيديو المرفق بهذا الخبر؟ سيتم حذف ملف الفيديو نهائياً من التخزين السحابي (Supabase Storage) وتحديث قاعدة البيانات ليصبح الرابط فارغاً (NULL).
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                id="btn-cancel-dashboard-delete-video"
                onClick={() => setVideoArticleToDelete(null)}
                disabled={isDeletingVideo}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="btn-confirm-dashboard-delete-video"
                onClick={handleConfirmDeleteVideo}
                disabled={isDeletingVideo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingVideo ? 'جاري حذف الفيديو...' : 'تأكيد حذف الفيديو'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Public Profile Modal */}
      <EditJournalistProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Quick File Upload Modal */}
      <QuickUploadModal
        isOpen={isQuickUploadOpen}
        onClose={() => setIsQuickUploadOpen(false)}
        title="رفع ملف أو مستند إخباري"
      />
    </div>
  );
};
