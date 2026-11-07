import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Users, 
  Flame, 
  Star, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Plus, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  RotateCcw,
  RotateCw,
  GraduationCap,
  KeyRound,
  Lock,
  Unlock,
  Copy,
  Check,
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  Shield,
  Clock,
  Filter,
  Archive,
  Paperclip,
  Download,
  UploadCloud
} from 'lucide-react';
import { useNews, setActiveCurrentUser } from '../context/NewsContext';
import { Article, User } from '../types';
import { QuickUploadModal } from '../components/QuickUploadModal';
import { formatFileSize, getFileViewUrl } from '../utils/fileUpload';

interface AdminDashboardProps {
  onSelectArticle: (article: Article) => void;
  onEditArticle: (article: Article) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectArticle,
  onEditArticle,
}) => {
  const { 
    currentUser, 
    articles, 
    users, 
    categories, 
    approveArticle, 
    rejectArticle, 
    requestEditArticle, 
    toggleBreaking, 
    toggleFeatured, 
    deleteArticle,
    approveJournalist,
    rejectJournalist,
    deleteJournalist,
    updateUserPassword,
    toggleUserStatus,
    updateUserRole,
    journalistRequests,
    updateAccreditationStatus,
    addCategory,
    removeCategory,
    seedDemoContent,
    resetToEmptyState,
    refreshData,
    fetchAccreditationRequests,
    addToast
  } = useNews();

  const [activeTab, setActiveTab] = useState<'queue' | 'journalists' | 'accounts' | 'content' | 'categories' | 'tools'>('queue');
  const [showQuickUploadModal, setShowQuickUploadModal] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{ articleId: string; type: 'edit' | 'reject' } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accreditation Requests Filtering & Management State
  const [accreditationFilter, setAccreditationFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'archived'>('all');
  const [accreditationSearch, setAccreditationSearch] = useState('');
  const [rejectingRequest, setRejectingRequest] = useState<{ id: string; name: string } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isProcessingAccreditation, setIsProcessingAccreditation] = useState(false);

  // Accounts, Security & Journalist Deletion state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | 'journalist' | 'editorial' | 'pending'>('all');

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const targetId = (userToDelete as any).userId || userToDelete.id;
      await deleteJournalist(targetId);
      setUserToDelete(null);
    } catch {
      addToast('error', 'خطأ', 'تعذر حذف الحساب، حاول مجدداً');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleSaveNewPassword = async () => {
    if (!editingPasswordUser || !newPasswordInput.trim()) {
      addToast('warning', 'حقل مطلوب', 'يرجى كتابة كلمة المرور الجديدة');
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await updateUserPassword(editingPasswordUser.id, newPasswordInput.trim());
      if (res.success) {
        setEditingPasswordUser(null);
        setNewPasswordInput('');
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleApproveRequest = async (req: any) => {
    setIsProcessingAccreditation(true);
    try {
      await updateAccreditationStatus(req.id || req.userId, 'approved');
      addToast('success', 'تم الاعتماد بنجاح', 'تم اعتماد الطلب بنجاح، وتم نقله إلى قائمة المعتمدين مع الاحتفاظ بسجل الطلب.');
    } catch {
      addToast('error', 'خطأ', 'تعذر اعتماد الطلب، يرجى المحاولة لاحقاً');
    } finally {
      setIsProcessingAccreditation(false);
    }
  };

  const handleArchiveRequest = async (req: any) => {
    setIsProcessingAccreditation(true);
    try {
      await updateAccreditationStatus(req.id || req.userId, 'archived', undefined, 'أرشفة الطلب مع الاحتفاظ بسجل التدقيق');
      addToast('info', 'تمت الأرشفة', `تم نقل طلب ${req.name} إلى الأرشيف مع الحفاظ الدائم على السجل.`);
    } catch {
      addToast('error', 'خطأ', 'تعذر أرشفة الطلب');
    } finally {
      setIsProcessingAccreditation(false);
    }
  };

  const handleUnderReviewRequest = async (req: any) => {
    setIsProcessingAccreditation(true);
    try {
      await updateAccreditationStatus(req.id || req.userId, 'under_review');
      addToast('info', 'قيد التدقيق', `تم نقل طلب ${req.name} إلى مرحلة التدقيق والمراجعة.`);
    } catch {
      addToast('error', 'خطأ', 'تعذر تحديث حالة الطلب');
    } finally {
      setIsProcessingAccreditation(false);
    }
  };

  const handleOpenRejectModal = (req: any) => {
    setRejectingRequest({ id: req.id || req.userId, name: req.name });
    setRejectReasonInput('');
  };

  const handleConfirmRejectRequest = async () => {
    if (!rejectingRequest) return;
    setIsProcessingAccreditation(true);
    try {
      await updateAccreditationStatus(rejectingRequest.id, 'rejected', rejectReasonInput.trim() || undefined);
      addToast('info', 'تم الرفض', `تم تسجيل رفض طلب الاعتماد للطالب ${rejectingRequest.name}.`);
      setRejectingRequest(null);
      setRejectReasonInput('');
    } catch {
      addToast('error', 'خطأ', 'تعذر تحديث حالة الرفض');
    } finally {
      setIsProcessingAccreditation(false);
    }
  };

  useEffect(() => {
    if (currentUser) setActiveCurrentUser(currentUser);
    refreshData(true);
    fetchAccreditationRequests();
    const interval = setInterval(() => {
      if (currentUser) setActiveCurrentUser(currentUser);
      refreshData(true);
      fetchAccreditationRequests();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (currentUser) setActiveCurrentUser(currentUser);
      await Promise.all([
        refreshData(),
        fetchAccreditationRequests()
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'editor')) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 rounded-2xl bg-white dark:bg-slate-900 border text-center space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">وصول محظور</h3>
        <p className="text-xs text-slate-500">هذه اللوحة مخصصة لهيئة التحرير والمشرف العام فقط.</p>
      </div>
    );
  }

  // Filter queues
  const pendingArticles = articles.filter(
    (a) => a.status === 'under_review' || (a.status as string) === 'pending'
  );
  const publishedArticles = articles.filter(
    (a) =>
      (a.status === 'published' || a.status === 'approved') &&
      !a.id?.startsWith('art-demo-') &&
      a.authorId !== 'jour-demo-1'
  );
  // Consolidate accreditation requests from journalistRequests table and users table
  const combinedRequests = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Load from journalistRequests table
    if (Array.isArray(journalistRequests)) {
      journalistRequests.forEach((req) => {
        const key = (req.email || req.userId || req.id).toLowerCase().trim();
        map.set(key, {
          id: req.id,
          userId: req.userId || req.id,
          name: req.name,
          email: req.email,
          studentId: req.studentId || '',
          major: req.major || 'إعلام واتصال',
          academicLevel: req.academicLevel || 'المستوى الأول',
          avatar: req.avatar || '',
          bio: req.bio || '',
          skills: req.skills || [],
          status: req.status || 'pending',
          rejectionReason: req.rejectionReason,
          notes: req.notes,
          createdAt: req.createdAt || new Date().toISOString(),
          updatedAt: req.updatedAt || new Date().toISOString(),
          reviewedBy: req.reviewedBy,
        });
      });
    }

    // 2. Merge all student journalists from users table
    users.forEach((u) => {
      if (u.id === 'jour-demo-1' || u.name === 'عبدالرحمن الشهري') return;
      if (u.role !== 'journalist') return;

      const key = (u.email || u.id).toLowerCase().trim();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: 'req-' + u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          studentId: u.studentId || '',
          major: u.major || 'إعلام واتصال',
          academicLevel: u.academicLevel || 'المستوى الأول',
          avatar: u.avatar || '',
          bio: u.bio || '',
          skills: u.skills || [],
          status: u.status || 'pending',
          rejectionReason: u.rejectionReason,
          createdAt: u.registeredAt || new Date().toISOString(),
          updatedAt: u.registeredAt || new Date().toISOString(),
        });
      } else {
        if (!existing.avatar && u.avatar) existing.avatar = u.avatar;
        if (!existing.studentId && u.studentId) existing.studentId = u.studentId;
        if (!existing.bio && u.bio) existing.bio = u.bio;
        if (u.status === 'approved' && existing.status !== 'approved') {
          existing.status = 'approved';
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [journalistRequests, users]);

  const pendingJournalists = useMemo(() => {
    return combinedRequests.filter((r) => r.status === 'pending' || r.status === 'under_review');
  }, [combinedRequests]);

  const filteredAccreditationRequests = useMemo(() => {
    return combinedRequests.filter((r) => {
      // Status filter
      if (accreditationFilter === 'pending' && r.status !== 'pending') return false;
      if (accreditationFilter === 'under_review' && r.status !== 'under_review') return false;
      if (accreditationFilter === 'approved' && r.status !== 'approved') return false;
      if (accreditationFilter === 'rejected' && r.status !== 'rejected') return false;
      if (accreditationFilter === 'archived' && r.status !== 'archived') return false;

      // Search filter
      if (!accreditationSearch.trim()) return true;
      const q = accreditationSearch.toLowerCase().trim();
      return (
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.studentId && r.studentId.toLowerCase().includes(q)) ||
        (r.major && r.major.toLowerCase().includes(q))
      );
    });
  }, [combinedRequests, accreditationFilter, accreditationSearch]);
  const approvedJournalists = users.filter(
    (u) =>
      u.role === 'journalist' &&
      (u.status === 'approved' || !u.status || u.status === 'active') &&
      u.id !== 'jour-demo-1' &&
      u.name !== 'عبدالرحمن الشهري'
  );
  const editorialStaff = users.filter((u) => u.role === 'admin' || u.role === 'editor');

  const filteredAccounts = users.filter((u) => {
    if (u.id === 'jour-demo-1' || u.name === 'عبدالرحمن الشهري') return false;

    if (accountRoleFilter === 'journalist' && (u.role !== 'journalist' || u.status === 'pending')) return false;
    if (accountRoleFilter === 'editorial' && u.role !== 'admin' && u.role !== 'editor') return false;
    if (accountRoleFilter === 'pending' && u.status !== 'pending') return false;

    if (!accountSearchQuery.trim()) return true;
    const q = accountSearchQuery.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.studentId && u.studentId.toLowerCase().includes(q)) ||
      (u.major && u.major.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const handleFeedbackSubmit = async () => {
    if (!feedbackPrompt || !feedbackText.trim()) {
      addToast('warning', 'حقل مطلوب', 'يرجى كتابة الملاحظة أو سبب الإجراء');
      return;
    }

    if (feedbackPrompt.type === 'edit') {
      await requestEditArticle(feedbackPrompt.articleId, feedbackText.trim());
    } else {
      await rejectArticle(feedbackPrompt.articleId, feedbackText.trim());
    }

    setFeedbackPrompt(null);
    setFeedbackText('');
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-cairo" dir="rtl">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#00838f]/20 text-[#26c6da]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black">غرفة التحكم والاعتماد الأكاديمي</h1>
            <p className="text-xs text-slate-300">
              صلاحيات: {currentUser.role === 'admin' ? 'المشرف العام (Super Admin)' : 'رئيس التحرير (Editor)'} • جامعة القصيم
            </p>
          </div>
        </div>

        {/* Action Counters & Refresh */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="تحديث البيانات من الخادم"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#26c6da]' : ''}`} />
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث الطلبات'}</span>
          </button>

          <button
            onClick={() => setShowQuickUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00838f] hover:bg-[#00707a] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="رفع وتخزين ملف جديد في السحابة"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>رفع ملف</span>
          </button>

          {pendingArticles.length > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold animate-pulse">
              {pendingArticles.length} مواد بانتظار التدقيق
            </span>
          )}
          {pendingJournalists.length > 0 && (
            <button
              onClick={() => setActiveTab('journalists')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/50 text-xs font-bold animate-pulse cursor-pointer hover:bg-purple-500/40 transition-all"
            >
              {pendingJournalists.length} طلبات اعتماد جديدة!
            </button>
          )}
        </div>
      </div>

      {/* Urgent Alert for Pending Journalist Applications */}
      {pendingJournalists.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-900/60 border-2 border-purple-500/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-500 text-white shadow-md animate-bounce flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500 text-white text-[11px] font-black">
                  طلب انضمام جديد مطلوب اعتماده
                </span>
                <span className="text-xs text-purple-200 font-tajawal">قسم الإعلام والاتصال</span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                يوجد {pendingJournalists.length} طلب انضمام طالب كصحفي بانتظار موافقتك!
              </h3>
              <p className="text-xs text-slate-300 font-tajawal">
                وصلت طلبات جديدة من الطلاب تحتوي على الرقم الجامعي والتخصص، انقر لاعتمادهم فوراً للبدء في النشر.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('journalists')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-black shadow-lg transition-all whitespace-nowrap cursor-pointer"
          >
            مراجعة واعتماد طلبات الطلاب ({pendingJournalists.length})
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-amber-500 block mb-1">طلبات بانتظار المراجعة</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingArticles.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-emerald-600 block mb-1">أخبار منشورة في المنصة</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{publishedArticles.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-[#00838f] block mb-1">صحفيون طلاب معتمدون</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{approvedJournalists.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-purple-600 block mb-1">طلبات انضمام جديدة</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingJournalists.length}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-[#00838f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>طابور التدقيق الإخباري ({pendingArticles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('journalists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'journalists'
              ? 'bg-[#00838f] text-white shadow-xs'
              : pendingJournalists.length > 0
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-400/40 hover:bg-purple-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>اعتماد الطلاب الصحفيين</span>
          {pendingJournalists.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold animate-pulse">
              {pendingJournalists.length} جديد
            </span>
          ) : (
            <span className="text-xs opacity-75">({pendingJournalists.length})</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-[#00838f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>الحسابات وكلمات المرور ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'content'
              ? 'bg-[#00838f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>إدارة المحتوى والعواجل ({publishedArticles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-[#00838f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>الأقسام والتصنيفات</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'tools'
              ? 'bg-[#00838f] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>أدوات النظام والمعاينة</span>
        </button>
      </div>

      {/* Tab 1: Articles Review Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            المواد الصحفية المقدمة من الطلاب بانتظار قرار النشر:
          </h3>

          {pendingArticles.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                طابور التدقيق فارغ حالياً
              </p>
              <p className="text-xs text-slate-500">تم اعتماد كافة المقالات والتقارير المقدمة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingArticles.map((art) => (
                <div
                  key={art.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        <img
                          src={art.mainImage && art.mainImage.trim() ? art.mainImage : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                          alt={art.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00838f]/10 text-[#00838f]">
                          {art.category}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {art.title}
                        </h4>
                        <p className="text-xs text-slate-500 font-tajawal mt-1 line-clamp-2">
                          {art.excerpt}
                        </p>
                      </div>
                    </div>

                    {/* Author & Co-Authors badge */}
                    <div className="text-right sm:text-left text-xs text-slate-500 flex-shrink-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200">الصحفي: {art.authorName}</p>
                      <p className="text-[11px] text-slate-400">
                        الرقم: {art.authorStudentId || '-'} • {art.authorMajor}
                      </p>
                      {art.coAuthors && art.coAuthors.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-bold">
                          <Users className="w-3.5 h-3.5" />
                          <span>المشاركون: {art.coAuthors.map((c) => c.name).join('، ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => onSelectArticle(art)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Eye className="w-4 h-4" />
                      <span>قراءة كامل المادة</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditArticle(art)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                        title="تعديل المادة ومراجعتها قبل الاعتماد"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>تعديل المادة</span>
                      </button>

                      <button
                        onClick={() => setFeedbackPrompt({ articleId: art.id, type: 'reject' })}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        رفض المادة
                      </button>

                      <button
                        onClick={() => setFeedbackPrompt({ articleId: art.id, type: 'edit' })}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        طلب تعديل
                      </button>

                      <button
                        onClick={() => approveArticle(art.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد ونشر فوري للموقع</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Journalist Accreditation & Management */}
      {activeTab === 'journalists' && (
        <div className="space-y-6">
          {/* Header & Quick Stats Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#00838f]/15 text-[#00838f]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  نظام طلبات اعتماد الطلاب الصحفيين
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
                إدارة ومراجعة طلبات الانضمام لأسرة تحرير الصحيفة عبر قاعدة بيانات Supabase واعتماد صلاحيات النشر الأكاديمي.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                إجمالي الطلبات: {combinedRequests.length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                بانتظار الاعتماد: {combinedRequests.filter((r) => r.status === 'pending').length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                قيد التدقيق: {combinedRequests.filter((r) => r.status === 'under_review').length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                معتمدون: {combinedRequests.filter((r) => r.status === 'approved').length}
              </span>
            </div>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setAccreditationFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'all'
                    ? 'bg-[#00838f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الكل ({combinedRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setAccreditationFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-slate-200'
                }`}
              >
                بانتظار الاعتماد ({combinedRequests.filter((r) => r.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setAccreditationFilter('under_review')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'under_review'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 hover:bg-slate-200'
                }`}
              >
                قيد التدقيق ({combinedRequests.filter((r) => r.status === 'under_review').length})
              </button>
              <button
                type="button"
                onClick={() => setAccreditationFilter('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-slate-200'
                }`}
              >
                المعتمدون ({combinedRequests.filter((r) => r.status === 'approved').length})
              </button>
              <button
                type="button"
                onClick={() => setAccreditationFilter('rejected')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-slate-200'
                }`}
              >
                المرفوضة ({combinedRequests.filter((r) => r.status === 'rejected').length})
              </button>
              <button
                type="button"
                onClick={() => setAccreditationFilter('archived')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  accreditationFilter === 'archived'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                المؤرشفة ({combinedRequests.filter((r) => r.status === 'archived').length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={accreditationSearch}
                onChange={(e) => setAccreditationSearch(e.target.value)}
                placeholder="بحث بالاسم، الرقم الجامعي، البريد..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00838f]"
              />
            </div>
          </div>

          {filteredAccreditationRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <GraduationCap className="w-12 h-12 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                لا توجد طلبات اعتماد مطابقة للتصفية الحالية
              </p>
              {(accreditationFilter !== 'all' || accreditationSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setAccreditationFilter('all');
                    setAccreditationSearch('');
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  إعادة ضبط التصفية وعرض جميع الطلبات
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAccreditationRequests.map((j) => (
                <div
                  key={j.id || j.userId}
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-4 transition-all ${
                    j.status === 'pending'
                      ? 'border-amber-400/60 dark:border-amber-500/40 ring-1 ring-amber-400/20'
                      : j.status === 'under_review'
                      ? 'border-purple-400/60 dark:border-purple-500/40 ring-1 ring-purple-400/20'
                      : j.status === 'approved'
                      ? 'border-emerald-400/40 dark:border-emerald-500/30'
                      : j.status === 'archived'
                      ? 'border-slate-400/40 dark:border-slate-700/60 opacity-85'
                      : 'border-rose-400/40 dark:border-rose-500/30'
                  }`}
                >
                  {/* Top Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-13 h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-base text-slate-700 dark:text-white flex-shrink-0">
                        {j.avatar && j.avatar.trim() ? (
                          <img src={j.avatar.trim()} alt={j.name} className="w-full h-full object-cover" />
                        ) : (
                          j.name?.charAt(0) || 'ط'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{j.name}</h4>
                        </div>
                        <p className="text-xs text-[#00838f] dark:text-[#26c6da] font-semibold">
                          {j.major || 'إعلام واتصال'} • {j.academicLevel || 'طالب جامعي'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                          {j.email}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {j.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>بانتظار الاعتماد</span>
                        </span>
                      )}
                      {j.status === 'under_review' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          <span>قيد التدقيق</span>
                        </span>
                      )}
                      {j.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>صحفي معتمد</span>
                        </span>
                      )}
                      {j.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          <span>طلب مرفوض</span>
                        </span>
                      )}
                      {j.status === 'archived' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                          <Archive className="w-3 h-3" />
                          <span>مؤرشف</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* University & Academic Credentials Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">الرقم الجامعي الأكاديمي:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs" dir="ltr">
                        {j.studentId || 'غير مدخل'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">تاريخ التقديم:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-tajawal text-[11px]">
                        {j.createdAt ? new Date(j.createdAt).toLocaleDateString('ar-SA') : 'اليوم'}
                      </span>
                    </div>
                  </div>

                  {/* Attached Accreditation Document / Proof */}
                  {(j.attachmentUrl || (j as any).attachment_url) && (
                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#00838f]/10 text-[#00838f] dark:bg-[#00838f]/20 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-[#00838f] dark:text-[#26c6da] font-bold block">
                            وثيقة الاعتماد المرفقة:
                          </span>
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate" title={j.attachmentName || 'وثيقة الاعتماد'}>
                            {j.attachmentName || 'وثيقة إثبات القيد / السيرة الذاتية'}
                          </p>
                          {j.attachmentSize ? (
                            <span className="text-[10px] text-slate-400">{formatFileSize(j.attachmentSize)}</span>
                          ) : null}
                        </div>
                      </div>
                      <a
                        href={getFileViewUrl(j.attachmentUrl || (j as any).attachment_url, j.attachmentName || 'وثيقة الاعتماد')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-[#00838f] dark:text-[#26c6da] border border-sky-300 dark:border-sky-700 hover:bg-[#00838f] hover:text-white transition-all text-xs font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>معاينة الوثيقة</span>
                      </a>
                    </div>
                  )}

                  {/* Bio statement if provided */}
                  {j.bio && (
                    <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-tajawal leading-relaxed">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">نبذة الطالب:</span>
                        {j.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills tags */}
                  {Array.isArray(j.skills) && j.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {j.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rejection reason display if rejected */}
                  {j.status === 'rejected' && j.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-tajawal">
                      <span className="font-bold block">سبب الرفض:</span>
                      {j.rejectionReason}
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    {j.status !== 'archived' ? (
                      <button
                        type="button"
                        onClick={() => handleArchiveRequest(j)}
                        disabled={isProcessingAccreditation}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="أرشفة الطلب في قاعدة البيانات مع حفظ السجل"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>أرشفة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnderReviewRequest(j)}
                        disabled={isProcessingAccreditation}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1 cursor-pointer transition-colors"
                        title="إعادة الطلب من الأرشيف إلى قيد التدقيق"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة للتدقيق</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {j.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(j)}
                          disabled={isProcessingAccreditation}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                        >
                          رفض الطلب
                        </button>
                      )}

                      {j.status !== 'under_review' && j.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleUnderReviewRequest(j)}
                          disabled={isProcessingAccreditation}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors"
                        >
                          قيد التدقيق
                        </button>
                      )}

                      {j.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(j)}
                          disabled={isProcessingAccreditation}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#00838f] text-white hover:bg-[#00707a] shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد الطالب وتفعيل الحساب</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>معتمد ونشط</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnderReviewRequest(j)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            إعادة للتدقيق
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved Journalists List */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                قائمة الصحفيين المعتمدين حالياً ({approvedJournalists.length}):
              </h4>
              <span className="text-xs text-[#00838f] dark:text-[#26c6da] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                صلاحيات المشرف: عرض كلمات المرور، تعديلها، وحذف الصحفيين
              </span>
            </div>
            {approvedJournalists.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">لا يوجد صحفيون معتمدون بعد.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedJournalists.map((j) => (
                  <div key={j.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {j.avatar && j.avatar.trim() ? <img src={j.avatar.trim()} alt={j.name} className="w-full h-full object-cover" /> : j.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{j.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{j.studentId || '-'} • {j.major}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            صحفي معتمد ({j.stats?.articlesCount || 0} مادة)
                          </span>
                        </div>
                      </div>
                      
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => setUserToDelete(j)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="حذف هذا الصحفي نهائياً (خاص بالمشرف العام)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Account Security & Password Reset */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-[#00838f] flex-shrink-0" />
                        <span className="text-[10px] text-slate-400">حالة الأمان:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                          محمي ومشفر
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPasswordUser(j);
                            setNewPasswordInput('');
                          }}
                          className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <Edit3 className="w-3 h-3 text-[#00838f]" />
                          <span>إعادة تعيين</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span dir="ltr" className="truncate">{j.email}</span>
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => setUserToDelete(j)}
                          className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          title="حذف هذا الصحفي نهائياً"
                        >
                          <UserX className="w-3 h-3" />
                          <span>حذف الصحفي</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Accounts & Passwords Management */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Header info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#00838f]/20 text-[#26c6da]">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">إدارة الحسابات وكلمات المرور والصلاحيات</h3>
                <p className="text-xs text-slate-400 font-tajawal mt-0.5">
                  صلاحيات المشرف العام: الاطلاع على كلمات المرور، إعادة تعيينها، وحذف حسابات الصحفيين نهائياً
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>تحكم إداري كامل</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الحسابات</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{filteredAccounts.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-emerald-600 block mb-1">صحفيون معتمدون</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{approvedJournalists.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-[#00838f] block mb-1">هيئة الإدارة والتحرير</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{editorialStaff.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-purple-600 block mb-1">طلبات معلقة</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{pendingJournalists.length}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الرقم الجامعي، الإيميل، التخصص..."
                className="w-full pr-9 pl-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                onClick={() => setAccountRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  accountRoleFilter === 'all'
                    ? 'bg-[#00838f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الكل ({users.length})
              </button>
              <button
                onClick={() => setAccountRoleFilter('journalist')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  accountRoleFilter === 'journalist'
                    ? 'bg-[#00838f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الصحفيون ({approvedJournalists.length})
              </button>
              <button
                onClick={() => setAccountRoleFilter('editorial')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  accountRoleFilter === 'editorial'
                    ? 'bg-[#00838f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                الإدارة والتحرير ({editorialStaff.length})
              </button>
              <button
                onClick={() => setAccountRoleFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  accountRoleFilter === 'pending'
                    ? 'bg-[#00838f] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                طلبات معلقة ({pendingJournalists.length})
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          {filteredAccounts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد حسابات مطابقة لمعايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((u) => {
                const isAdmin = u.role === 'admin' || u.id === 'user-admin-1';
                const isEditor = u.role === 'editor';
                const isPending = u.status === 'pending';
                const isSuspended = u.status === 'suspended';

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    {/* User Profile info */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-700 dark:text-white flex-shrink-0">
                            {u.avatar && u.avatar.trim() ? (
                              <img src={u.avatar.trim()} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {u.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {u.studentId ? `الرقم: ${u.studentId}` : (u.major || 'هيئة التحرير')}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate" dir="ltr">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        {/* Role Badges */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {isAdmin ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                              مشرف عام
                            </span>
                          ) : isEditor ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-[#00838f] dark:text-sky-300">
                              رئيس تحرير
                            </span>
                          ) : isPending ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300">
                              طلب معلق
                            </span>
                          ) : isSuspended ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                              حساب موقوف
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                              صحفي معتمد
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Security Bar */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-[#00838f] flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-slate-500">حالة الأمان:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                            محمي ومشفر
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPasswordUser(u);
                              setNewPasswordInput('');
                            }}
                            className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#00838f]" />
                            <span>إعادة تعيين</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bottom Bar */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!isAdmin && (
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 hover:bg-emerald-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isSuspended ? 'تفعيل الحساب' : 'إيقاف الحساب'}
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => approveJournalist(u.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#00838f] text-white text-[11px] font-bold hover:bg-[#00707a] cursor-pointer"
                          >
                            اعتماد
                          </button>
                        )}
                      </div>

                      <div>
                        {isAdmin ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-500" />
                            <span>حساب أساسي محمي</span>
                          </span>
                        ) : currentUser.role === 'admin' ? (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف هذا الصحفي/الحساب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الصحفي</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Content Management */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              إدارة الأخبار المنشورة والعواجل والتثبيت ({publishedArticles.length}):
            </h3>
            <span className="text-xs text-[#00838f] dark:text-sky-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              الأرشيف التوثيقي الدائم: المواد المنشورة محمية ومثبتة في قاعدة البيانات
            </span>
          </div>

          <div className="space-y-3">
            {publishedArticles.map((art) => (
              <div
                key={art.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img
                      src={art.mainImage && art.mainImage.trim() ? art.mainImage : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                      alt={art.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {art.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      القسم: {art.category} • الكاتب: {art.authorName}{art.coAuthors && art.coAuthors.length > 0 ? ` (بمشاركة: ${art.coAuthors.map((c) => c.name).join('، ')})` : ''} • المشاهدات: {art.viewsCount}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  {/* Toggle Breaking */}
                  <button
                    onClick={() => toggleBreaking(art.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      art.isBreaking
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {art.isBreaking ? '★ عاجل (مفعل)' : 'تعيين كعاجل'}
                  </button>

                  {/* Toggle Featured */}
                  <button
                    onClick={() => toggleFeatured(art.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      art.isFeatured
                        ? 'bg-[#00838f] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {art.isFeatured ? 'مثبت في الصدارة' : 'تثبيت في الواجهة'}
                  </button>

                  <button
                    id={`btn-admin-preview-article-${art.id}`}
                    onClick={() => onSelectArticle(art)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-[#00838f] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="معاينة في الموقع"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-admin-edit-article-${art.id}`}
                    onClick={() => onEditArticle(art)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                    title="تعديل هذا الخبر المنشور وتحديث بياناته"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>تعديل الخبر المنشور</span>
                  </button>

                  <div
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[#00838f] dark:text-sky-300 text-xs font-bold shadow-xs"
                    title="مادة صحفية منشورة وموثقة في الأرشيف الدائم ولا يمكن حذفها"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00838f] dark:text-sky-400" />
                    <span>أرشيف محمي</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6 max-w-xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            إدارة الأقسام والتصنيفات التحريرية:
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="اسم القسم الجديد..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f]"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 rounded-xl bg-[#00838f] text-white text-xs font-bold hover:bg-[#00707a] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم</span>
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat}</span>
                <button
                  onClick={() => removeCategory(cat)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Tools & Synchronization */}
      {activeTab === 'tools' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              أدوات مزامنة واسترجاع بيانات الصحفيين والمحتوى
            </h3>
            <p className="text-xs text-slate-500 font-tajawal mt-1">
              أدوات مخصصة لمزامنة السجلات من قاعدة البيانات المستدامة والتأكد من عدم فقدان أي صحفي أو مقال معتمد
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-3">
              <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00838f]" />
                <span>مزامنة واسترجاع سجلات قاعدة البيانات الحقيقية</span>
              </h4>
              <p className="text-xs text-sky-800 dark:text-sky-300 font-tajawal leading-relaxed">
                يقوم بالاستعلام المباشر من قاعدة البيانات واستعادة كافة الصحفيين والطلاب المعتمدين والمقالات المنشورة وتحديثها فورياً.
              </p>
              <button
                onClick={seedDemoContent}
                className="w-full py-2 rounded-xl bg-[#00838f] hover:bg-[#00707a] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                مزامنة واستعادة السجلات من قاعدة البيانات الآن
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>تفريغ المواد المؤقتة (مع الحفاظ الكامل على الصحفيين)</span>
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-tajawal leading-relaxed">
                يحذف المسودات والمواد الاختبارية مع الحفاظ الكامل والمطلق على حسابات وسجلات الصحفيين والطلاب المعتمدين.
              </p>
              <button
                onClick={resetToEmptyState}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                تفريغ المواد مع الحفاظ على الصحفيين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Prompt Modal */}
      {feedbackPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {feedbackPrompt.type === 'edit' ? 'ملاحظات التعديل للصحفي الطالب' : 'سبب رفض نشر المادة الصحفية'}
            </h4>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="اكتب التوجيهات الأكاديمية أو الملاحظات اللغوية/التحريرية ليطلع عليها الطالب..."
              className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFeedbackPrompt(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="px-4 py-1.5 rounded-xl bg-[#00838f] text-white text-xs font-bold cursor-pointer"
              >
                إرسال القرار للطالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  تأكيد حذف حساب الصحفي
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  صلاحية خاصة بالمشرف العام
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                <span>الصحفي:</span>
                <span>{userToDelete.name}</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400" dir="ltr">
                {userToDelete.email} {userToDelete.studentId ? `• ID: ${userToDelete.studentId}` : ''}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              تنبيه: سيتم حذف الحساب نهائياً من قاعدة البيانات، ولن يتمكن من تسجيل الدخول أو نشر أي مواد جديدة.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingUser ? (
                  <span>جاري الحذف...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، حذف الصحفي نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00838f]/20 text-[#00838f] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  تعديل كلمة مرور الحساب
                </h4>
                <p className="text-xs text-slate-500">
                  للمستخدم: {editingPasswordUser.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#00838f]"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400">
                سيتم تشفير وتحديث كلمة المرور وحفظها في قاعدة البيانات فورياً.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPasswordUser(null)}
                disabled={isSavingPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNewPassword}
                disabled={isSavingPassword}
                className="px-5 py-2 rounded-xl bg-[#00838f] hover:bg-[#00707a] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isSavingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Accreditation Request Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  رفض طلب اعتماد الصحفي
                </h4>
                <p className="text-xs text-slate-500">
                  للطالب: {rejectingRequest.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                سبب الرفض أو التوجيه للطالب (اختياري)
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="وضح سبب عدم استيفاء الشروط أو الأوراق المطلوبة لمساعدة الطالب على تداركها..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                disabled={isProcessingAccreditation}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectRequest}
                disabled={isProcessingAccreditation}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isProcessingAccreditation ? 'جاري الرفض...' : 'تأكيد رفض الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={showQuickUploadModal}
        onClose={() => setShowQuickUploadModal(false)}
        title="مركز رفع الملفات والمستندات"
      />
    </div>
  );
};
