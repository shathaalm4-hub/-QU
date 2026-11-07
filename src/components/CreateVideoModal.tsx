import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Film, Loader2, CheckCircle2, Upload, Link, AlertCircle, Play, Users, UserPlus, Search, Star, Trash2, Edit3 } from 'lucide-react';
import { useNews, getAuthHeaders } from '../context/NewsContext';
import { parseVideoUrl } from '../utils/videoUtils';
import { VideoPlayer } from './VideoPlayer';
import { VideoReport, CoAuthor } from '../types';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  videoToEdit?: VideoReport | null;
}

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  videoToEdit,
}) => {
  const { currentUser, submitVideoReport, updateVideoReport, categories, users, addToast } = useNews();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState(categories[0] || 'تقارير مرئية');
  const [duration, setDuration] = useState('02:30');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [videoName, setVideoName] = useState('');
  
  // Co-authors state
  const [coAuthors, setCoAuthors] = useState<CoAuthor[]>([]);
  const [coAuthorSearchQuery, setCoAuthorSearchQuery] = useState('');
  
  // Dual mode: 'upload' or 'url'
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');

  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form when opening or when videoToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (videoToEdit) {
        setTitle(videoToEdit.title || '');
        setSummary(videoToEdit.summary || videoToEdit.description || '');
        setCategory(videoToEdit.category || categories[0] || 'تقارير مرئية');
        setDuration(videoToEdit.duration || '02:30');
        const vUrl = videoToEdit.videoUrl || '';
        setVideoUrl(vUrl);
        setCustomUrlInput(vUrl);
        setVideoSourceType(vUrl.startsWith('http') && (vUrl.includes('youtube') || vUrl.includes('youtu.be')) ? 'url' : 'upload');
        setCoverImage(videoToEdit.thumbnailUrl || videoToEdit.coverImage || '');
        setCoAuthors(videoToEdit.coAuthors || []);
      } else {
        setTitle('');
        setSummary('');
        setCategory(categories[0] || 'تقارير مرئية');
        setDuration('02:30');
        setVideoUrl('');
        setCustomUrlInput('');
        setVideoSourceType('upload');
        setCoverImage('');
        setCoAuthors([]);
      }
      setCoAuthorSearchQuery('');
    }
  }, [isOpen, videoToEdit, categories]);

  // Clean up any ongoing upload on unmount
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Handle URL change
  const handleApplyUrl = (input: string) => {
    setCustomUrlInput(input);
    const trimmed = input.trim();
    if (!trimmed) {
      setVideoUrl('');
      return;
    }

    setVideoUrl(trimmed);
    const parsed = parseVideoUrl(trimmed);

    // If it's a YouTube link and no cover image set yet, auto-suggest YouTube thumbnail
    if (parsed.platform === 'youtube' && parsed.videoId && !coverImage) {
      setCoverImage(`https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`);
    }
  };

  // XMLHttpRequest for real-time progress
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = file.size / (1024 * 1024);

      if (file.size > 100 * 1024 * 1024) {
        addToast(
          'error',
          'حجم كبير',
          `حجم الفيديو (${sizeMb.toFixed(1)} ميجابايت) يتجاوز الحد الأقصى (100 ميجابايت). يُرجى اختيار ملف أصغر أو استخدام رابط يوتيوب.`
        );
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      setVideoName(`${file.name} (${sizeMb.toFixed(1)} ميجابايت)`);
      setIsUploadingVideo(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'news-images');

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploadingVideo(false);
        xhrRef.current = null;
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
            setVideoUrl(data.url);
            setUploadProgress(100);
            addToast('success', 'تم رفع الفيديو', 'تم رفع وتخزين ملف الفيديو بنجاح وجاهز للنشر');
          } else {
            setVideoUrl('');
            setUploadProgress(0);
            addToast('error', 'فشل الرفع', data.message || 'تعذر رفع الفيديو');
          }
        } catch {
          setVideoUrl('');
          setUploadProgress(0);
          addToast('error', 'خطأ في الاستجابة', 'حدث خطأ أثناء معالجة استجابة الخادم');
        }
        if (videoInputRef.current) videoInputRef.current.value = '';
      };

      xhr.onerror = () => {
        setIsUploadingVideo(false);
        setUploadProgress(0);
        xhrRef.current = null;
        setVideoUrl('');
        addToast('error', 'خطأ في الاتصال', 'تعذر رفع ملف الفيديو، يرجى المحاولة لاحقاً');
        if (videoInputRef.current) videoInputRef.current.value = '';
      };

      xhr.onabort = () => {
        setIsUploadingVideo(false);
        setUploadProgress(0);
        xhrRef.current = null;
      };

      xhr.open('POST', '/api/upload');
      const headers = getAuthHeaders({ isFormData: true });
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
      xhr.send(formData);
    }
  };

  const cancelVideoUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsUploadingVideo(false);
    setUploadProgress(0);
    setVideoUrl('');
    setVideoName('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        addToast('error', 'حجم كبير', 'حجم صورة الغلاف يتجاوز 10 ميجابايت');
        if (coverInputRef.current) coverInputRef.current.value = '';
        return;
      }

      setIsUploadingCover(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'news-images');

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getAuthHeaders({ isFormData: true }),
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          setCoverImage(data.url);
          addToast('info', 'تم رفع الغلاف', 'تم حفظ غلاف الفيديو بنجاح');
        } else {
          addToast('error', 'فشل الرفع', data.message || 'تعذر رفع صورة الغلاف');
        }
      } catch (err: any) {
        console.error('[CoverUpload] Error:', err);
        addToast('error', 'خطأ في الاتصال', 'تعذر رفع صورة الغلاف');
      } finally {
        setIsUploadingCover(false);
        if (coverInputRef.current) coverInputRef.current.value = '';
      }
    }
  };

  // Registered journalists excluding current user
  const registeredJournalists = users.filter((u) => {
    const isJournalistRole = (u.role as string) === 'journalist' || (u.role as string) === 'editorial' || u.role === 'admin' || (u.role as string) === 'editor';
    const isSelf = currentUser && (u.id === currentUser.id || u.studentId === currentUser.studentId || u.email === currentUser.email);
    return isJournalistRole && !isSelf;
  });

  const filteredJournalists = registeredJournalists.filter((u) => {
    if (!coAuthorSearchQuery.trim()) return false;
    const q = coAuthorSearchQuery.trim().toLowerCase();
    const nameMatch = u.name.toLowerCase().includes(q);
    const idMatch = u.studentId ? u.studentId.toLowerCase().includes(q) : false;
    const majorMatch = u.major ? u.major.toLowerCase().includes(q) : false;
    return nameMatch || idMatch || majorMatch;
  });

  const handleAddCoAuthor = (user: any) => {
    const alreadyExists = coAuthors.some(
      (ca) => ca.id === user.id || ca.journalistId === user.id || (user.studentId && ca.studentId === user.studentId)
    );
    if (alreadyExists) {
      addToast('warning', 'مضاف مسبقاً', 'تمت إضافة هذا الصحفي مسبقاً لقائمة المشاركين');
      return;
    }
    const newCoAuthor: CoAuthor = {
      id: user.id,
      journalistId: user.id,
      name: user.name,
      studentId: user.studentId,
      major: user.major || 'إعلام رقمي',
      avatar: user.avatar,
      role: 'co_author',
    };
    setCoAuthors((prev) => [...prev, newCoAuthor]);
    setCoAuthorSearchQuery('');
  };

  const handleRemoveCoAuthor = (authorId: string) => {
    setCoAuthors((prev) => prev.filter((ca) => ca.id !== authorId && ca.journalistId !== authorId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('warning', 'تسجيل دخول', 'يرجى تسجيل الدخول أولاً');
      return;
    }
    if (isUploadingVideo) {
      addToast('warning', 'جاري الرفع', 'يرجى الانتظار حتى يكتمل رفع ملف الفيديو');
      return;
    }
    if (!title.trim() || !summary.trim()) {
      addToast('warning', 'حقول مطلوبة', 'يرجى ملء عنوان وملخص التقرير المرئي');
      return;
    }
    if (!videoUrl) {
      addToast('warning', 'فيديو مطلوب', 'يرجى رفع ملف فيديو أو إدخال رابط فيديو صالح');
      return;
    }

    setIsLoading(true);
    try {
      const coAuthorIds = coAuthors.map((ca) => ca.id || ca.journalistId);
      if (videoToEdit) {
        await updateVideoReport(videoToEdit.id, {
          title: title.trim(),
          summary: summary.trim(),
          description: summary.trim(),
          videoUrl: videoUrl.trim(),
          coverImage: coverImage || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
          thumbnailUrl: coverImage || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
          category,
          duration: duration.trim() || '02:30',
          coAuthors,
          coAuthorIds,
        });
        addToast('success', 'تم التعديل', 'تم تحديث بيانات التقرير المرئي بنجاح');
      } else {
        await submitVideoReport({
          title: title.trim(),
          summary: summary.trim(),
          videoUrl: videoUrl.trim(),
          coverImage: coverImage || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
          category,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          authorMajor: currentUser.major,
          authorStudentId: currentUser.studentId,
          duration: duration.trim() || '02:30',
          coAuthors,
          coAuthorIds,
        });
        addToast('success', 'تم النشر', 'تم نشر التقرير المرئي بنجاح وهو متاح للمشاهدة الآن');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ التقرير المرئي');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-cairo text-slate-900 dark:text-white">
              {videoToEdit ? 'تعديل التقرير المرئي' : 'إضافة تقرير مرئي جديد (فيديو)'}
            </h3>
            <p className="text-xs text-slate-500 font-tajawal">
              {videoToEdit
                ? 'تحديث العنوان والنبذة والوسائط والصحفيين المشاركين'
                : 'رفع ملف فيديو من جهازك أو إضافة رابط يوتيوب مع معاينة فورية'}
            </p>
          </div>
        </div>

        {videoToEdit && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block">تعديل بيانات التقرير المرئي:</span>
              <span>يمكنك تعديل العنوان، النبذة/الوصف، القسم، والصحفيين المشاركين مباشرة، مع بقاء ملف الفيديو المرفوع مسبقاً محفوظاً دون الحاجة لإعادة رفعه.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              عنوان التقرير المرئي *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: جولة مصورة في استديوهات قسم الإعلام الرقمية"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                القسم
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مدة الفيديو التقديرية
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="03:15"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نبذة مختصرة عن التقرير *
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="اكتب موجزًا عن محتوى الفيديو والضيوف المشاركين..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none resize-none"
              required
            />
          </div>

          {/* Video Source Selection Tabs */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              مصدر الفيديو *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setVideoSourceType('upload')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  videoSourceType === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-[#00838f] dark:text-[#26c6da] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع ملف من الجهاز</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoSourceType('url')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  videoSourceType === 'url'
                    ? 'bg-white dark:bg-slate-700 text-[#00838f] dark:text-[#26c6da] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>رابط يوتيوب أو فيديو</span>
              </button>
            </div>

            {/* Option 1: Upload from device */}
            {videoSourceType === 'upload' && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">ملف الفيديو (حتى 100 ميجابايت)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">يدعم صيغ MP4, WebM, MOV</p>
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={isUploadingVideo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00838f] text-white hover:bg-[#00707a] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الرفع ({uploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>اختيار فيديو</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress bar */}
                {isUploadingVideo && (
                  <div className="mt-3 space-y-1.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00838f] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>جاري رفع وتخزين الفيديو... {uploadProgress}%</span>
                      <button
                        type="button"
                        onClick={cancelVideoUpload}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        إلغاء الرفع
                      </button>
                    </div>
                  </div>
                )}

                {videoUrl && !isUploadingVideo && (
                  <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {videoName || (videoToEdit ? 'ملف الفيديو المرفوع مسبقاً محفوظ وجاهز (لا يلزم إعادة الرفع)' : 'تم رفع الفيديو وجاهز للنشر')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoToEdit && !videoName) {
                          if (window.confirm('هل تود استبدال ملف الفيديو بملف آخر جديد؟')) {
                            setVideoUrl('');
                            setVideoName('');
                          }
                        } else {
                          cancelVideoUpload();
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 underline shrink-0 mr-2 cursor-pointer"
                    >
                      {videoToEdit && !videoName ? 'استبدال الملف' : 'حذف'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Option 2: Enter YouTube or direct URL */}
            {videoSourceType === 'url' && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => handleApplyUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  يمكنك لصق رابط فيديو من يوتيوب (بما فيها Shorts أو روابط youtu.be المختصرة) أو رابط مباشر لملف MP4.
                </p>
              </div>
            )}

            {/* Live Video Preview Box */}
            {videoUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black shadow-inner">
                <div className="p-2 bg-slate-800 text-[11px] text-slate-300 flex items-center justify-between border-b border-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    معاينة الفيديو قبل النشر:
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px]" dir="ltr">
                    {videoUrl}
                  </span>
                </div>
                <VideoPlayer url={videoUrl} title={title || 'معاينة'} className="max-h-56" />
              </div>
            )}
          </div>

          {/* Cover image upload */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">صورة غلاف الفيديو (اختياري)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">بوستر أو لقطة بارزة للتقرير</p>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={isUploadingCover}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                {isUploadingCover ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <span>اختيار غلاف</span>
                )}
              </button>
            </div>
            {coverImage && (
              <div className="mt-2.5 flex items-center gap-3">
                <div className="w-20 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 relative shrink-0">
                  <img src={coverImage} alt="غلاف" className="w-full h-full object-cover" />
                </div>
                <div className="text-[11px] text-slate-500 truncate flex-1">
                  <span>تم تعيين صورة الغلاف بنجاح</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  إزالة
                </button>
              </div>
            )}
          </div>

          {/* Co-authors section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold">الصحفيون المشاركون في العمل المرئي (Co-authors)</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {coAuthors.length} {coAuthors.length === 1 ? 'مشارك' : 'مشاركين'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              أضف زملاءك الذين شاركوا في إعداد التقرير، التصوير، أو المونتاج ليظهر العمل في ملفاتهم الصحفية فور نشره.
            </p>

            {/* Selected co-authors chips */}
            {coAuthors.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {coAuthors.map((ca) => (
                  <div
                    key={ca.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      {ca.avatar ? (
                        <img src={ca.avatar} alt={ca.name} className="w-full h-full object-cover" />
                      ) : (
                        ca.name.charAt(0)
                      )}
                    </div>
                    <span className="font-bold">{ca.name}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">({ca.major || 'مشارك'})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoAuthor(ca.id)}
                      className="text-purple-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="إزالة المشارك"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search and add co-author input */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={coAuthorSearchQuery}
                  onChange={(e) => setCoAuthorSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الصحفي أو الرقم الجامعي أو التخصص للإضافة..."
                  className="w-full px-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                {coAuthorSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCoAuthorSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {coAuthorSearchQuery.trim() && (
                <div className="absolute top-full right-0 left-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredJournalists.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      لم يتم العثور على صحفي مسجل يطابق البحث
                    </div>
                  ) : (
                    filteredJournalists.map((u) => {
                      const isAlready = coAuthors.some(
                        (ca) => ca.id === u.id || ca.journalistId === u.id || (u.studentId && ca.studentId === u.studentId)
                      );
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleAddCoAuthor(u)}
                          disabled={isAlready}
                          className="w-full p-2.5 text-right flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden text-slate-700 dark:text-slate-300">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {u.studentId ? `رقم جامعي: ${u.studentId}` : ''} {u.major ? `• ${u.major}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isAlready
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                          }`}>
                            {isAlready ? 'مضاف' : 'إضافة مشارك +'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isUploadingVideo || isUploadingCover || !videoUrl}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>{videoToEdit ? 'حفظ التعديلات على التقرير المرئي' : 'نشر التقرير المرئي الآن'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
