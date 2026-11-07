import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Calendar, 
  MapPin, 
  Tag, 
  BookOpen, 
  Check, 
  FileText, 
  Send, 
  Save, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2,
  ShieldCheck,
  Link as LinkIcon,
  Eye,
  CheckCircle2,
  Paperclip,
  Download,
  FileCheck,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Star
} from 'lucide-react';
import { useNews, getAuthHeaders } from '../context/NewsContext';
import { fileToDataUrl } from '../utils/storage';
import { Article, ArticleAttachment, CoAuthor } from '../types';
import { logTrace } from '../lib/traceLogger';
import { uploadMediaWithProgress, parseVideoUrl } from '../utils/videoUtils';
import { uploadFileWithProgress, formatFileSize, getFileTypeLabel, downloadFileSafely } from '../utils/fileUpload';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { FilePreviewModal } from './FilePreviewModal';

let globalModalMountCount = 0;
let globalModalInstanceId = 0;

export interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  kind: string;
  mainImage: string;
  extraImages: string[];
  videoUrl: string;
  attachments: ArticleAttachment[];
  sources: string;
  eventDate: string;
  location: string;
  keywords: string;
  isBreaking: boolean;
  isFeatured: boolean;
  authorId?: string;
  authorName?: string;
  coAuthors: CoAuthor[];
}

function createInitialFormData(existingArticle?: Article | null, defaultCategory?: string): ArticleFormData {
  if (existingArticle) {
    const rawKeywords = Array.isArray(existingArticle.keywords) && existingArticle.keywords.length > 0
      ? existingArticle.keywords
      : (Array.isArray((existingArticle as any)?.tags) ? (existingArticle as any).tags : []);
    const cleanKeywords = rawKeywords.filter((k: any) =>
      typeof k === 'string' &&
      !k.startsWith('kind:') &&
      !k.startsWith('media_type:') &&
      !k.startsWith('ednote:') &&
      !k.startsWith('rejreason:') &&
      !k.startsWith('attach:') &&
      !k.startsWith('coauthor_json:') &&
      !k.startsWith('flag:')
    );

    const coAuthors = Array.isArray(existingArticle.coAuthors) ? existingArticle.coAuthors : [];

    return {
      title: existingArticle.title || '',
      excerpt: existingArticle.excerpt || (existingArticle as any)?.summary || '',
      content: existingArticle.content || '',
      category: existingArticle.category || defaultCategory || 'جامعة',
      kind: existingArticle.kind || 'خبر',
      mainImage: existingArticle.mainImage || (existingArticle as any)?.main_image || '',
      extraImages: Array.isArray(existingArticle.extraImages)
        ? existingArticle.extraImages
        : (Array.isArray((existingArticle as any)?.extra_images) ? (existingArticle as any).extra_images : []),
      videoUrl: existingArticle.videoUrl || (existingArticle as any)?.video_url || '',
      attachments: Array.isArray(existingArticle.attachments) ? existingArticle.attachments : [],
      sources: existingArticle.sources || (existingArticle as any)?.source || '',
      eventDate: existingArticle.eventDate || new Date().toISOString().split('T')[0],
      location: existingArticle.location || 'المدينة الجامعية - جامعة القصيم',
      keywords: cleanKeywords.join('، '),
      isBreaking: existingArticle.isBreaking || false,
      isFeatured: existingArticle.isFeatured || false,
      authorId: existingArticle.authorId || (existingArticle as any)?.author_id || '',
      authorName: existingArticle.authorName || (existingArticle as any)?.author_name || '',
      coAuthors,
    };
  }
  return {
    title: '',
    excerpt: '',
    content: '',
    category: defaultCategory || 'جامعة',
    kind: 'خبر',
    mainImage: '',
    extraImages: [],
    videoUrl: '',
    attachments: [],
    sources: '',
    eventDate: new Date().toISOString().split('T')[0],
    location: 'المدينة الجامعية - جامعة القصيم',
    keywords: '',
    isBreaking: false,
    isFeatured: false,
    authorId: '',
    authorName: '',
    coAuthors: [],
  };
}

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingArticle?: Article | null;
  onSuccess?: () => void;
}

export const CreateArticleModal: React.FC<CreateArticleModalProps> = ({
  isOpen,
  onClose,
  existingArticle,
  onSuccess,
}) => {
  const instanceIdRef = useRef<number>(0);
  if (instanceIdRef.current === 0) {
    instanceIdRef.current = ++globalModalInstanceId;
  }
  const renderCountRef = useRef<number>(0);
  renderCountRef.current++;

  const { currentUser, submitArticle, updateArticle, deleteArticleVideo, categories, users, journalistRequests, addToast } = useNews();
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const extraImagesInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const storageDraftKey = existingArticle?.id
    ? `qu_article_edit_draft_${existingArticle.id}`
    : 'qu_article_new_draft';

  // Single Source of Truth: All article fields reside in a single state container with auto-preservation
  const [formData, setFormData] = useState<ArticleFormData>(() => {
    const initial = createInitialFormData(existingArticle, categories[0]);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const saved = sessionStorage.getItem(storageDraftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.title === 'string' && (parsed.title || parsed.content || parsed.excerpt)) {
            return {
              ...initial,
              ...parsed,
            };
          }
        }
      } catch {}
    }
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<ArticleAttachment | null>(null);
  const [showDeleteVideoConfirm, setShowDeleteVideoConfirm] = useState(false);
  const [videoName, setVideoName] = useState(
    existingArticle?.videoUrl || (existingArticle as any)?.video_url ? 'مقطع فيديو مرفق بالمادة' : ''
  );
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');
  const [videoUrlInput, setVideoUrlInput] = useState('');

  // Co-authors states
  const [coAuthorSearchQuery, setCoAuthorSearchQuery] = useState('');
  const [isCoAuthorSearchOpen, setIsCoAuthorSearchOpen] = useState(false);

  // List of all registered approved student journalists for multi-author assignment
  const registeredJournalists = useMemo(() => {
    const list: { id: string; name: string; studentId: string; major: string; avatar: string; email?: string }[] = [];
    const seen = new Set<string>();

    (users || []).forEach((u) => {
      if (u.role === 'journalist' || u.status === 'approved') {
        const key = u.id || u.email;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: u.id,
            name: u.name,
            studentId: u.studentId || '',
            major: u.major || 'صحافة ونشر رقمي',
            avatar: u.avatar || '',
            email: u.email,
          });
        }
      }
    });

    (journalistRequests || []).forEach((req) => {
      if (req.status === 'approved') {
        const uid = req.userId || req.id;
        if (!seen.has(uid) && (!req.email || !seen.has(req.email))) {
          seen.add(uid);
          list.push({
            id: uid,
            name: req.name,
            studentId: req.studentId || '',
            major: req.major || 'صحافة ونشر رقمي',
            avatar: req.avatar || '',
            email: req.email,
          });
        }
      }
    });

    return list;
  }, [users, journalistRequests]);

  const primaryAuthorId = formData.authorId || existingArticle?.authorId || currentUser?.id || '';
  const isEditorialStaff = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  const handleAddCoAuthor = (journalist: typeof registeredJournalists[0]) => {
    if (journalist.id === primaryAuthorId || journalist.id.replace(/^req-/, '') === primaryAuthorId.replace(/^req-/, '')) {
      addToast('warning', 'الصحفي الأساسي', 'هذا الصحفي هو الكاتب الأساسي لهذا العمل.');
      return;
    }
    if (formData.coAuthors.some((c) => c.journalistId === journalist.id || c.journalistId.replace(/^req-/, '') === journalist.id.replace(/^req-/, ''))) {
      addToast('warning', 'مضاف مسبقاً', 'تمت إضافة هذا الصحفي بالفعل كصحفي مشارك في هذا العمل.');
      return;
    }
    const newCoAuthor: CoAuthor = {
      id: `aa-${Date.now()}-${journalist.id}`,
      journalistId: journalist.id,
      name: journalist.name,
      studentId: journalist.studentId,
      major: journalist.major,
      avatar: journalist.avatar,
      role: 'co_author',
    };
    updateFormField('coAuthors', [...formData.coAuthors, newCoAuthor]);
    setCoAuthorSearchQuery('');
    setIsCoAuthorSearchOpen(false);
    addToast('success', 'تمت الإضافة', `تمت إضافة الصحفي ${journalist.name} كصحفي مشارك.`);
  };

  const handleRemoveCoAuthor = (journalistId: string) => {
    updateFormField('coAuthors', formData.coAuthors.filter((c) => c.journalistId !== journalistId));
    addToast('info', 'تم الحذف', 'تمت إزالة الصحفي المشارك من قائمة العمل.');
  };

  const handleSelectPrimaryAuthor = (selectedId: string) => {
    const journalist = registeredJournalists.find((j) => j.id === selectedId);
    if (journalist) {
      updateFormField('authorId', journalist.id);
      updateFormField('authorName', journalist.name);
      // Automatically remove from co-authors if they were added
      updateFormField('coAuthors', formData.coAuthors.filter((c) => c.journalistId !== journalist.id));
      addToast('info', 'الصحفي الأساسي', `تم تعيين ${journalist.name} كصحفي أساسي للعمل.`);
    }
  };

  // Mount/Unmount tracking
  useEffect(() => {
    globalModalMountCount++;
    const id = instanceIdRef.current;
    logTrace('MODAL_MOUNT', {
      instanceId: id,
      mountCount: globalModalMountCount,
      isOpen,
      existingArticleId: existingArticle?.id || null,
      initialTitle: formData.title,
    });
    return () => {
      logTrace('MODAL_UNMOUNT', {
        instanceId: id,
        mountCount: globalModalMountCount,
        lastTitle: formData.title,
      });
    };
  }, []);

  // Whenever the modal opens or the target article changes, reset/load fresh article data
  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialFormData(existingArticle, categories[0]));
      setVideoName(existingArticle?.videoUrl || (existingArticle as any)?.video_url ? 'مقطع فيديو مرفق بالمادة' : '');
    }
  }, [isOpen, existingArticle?.id]);

  // Render tracking
  logTrace('MODAL_RENDER', {
    instanceId: instanceIdRef.current,
    renderCount: renderCountRef.current,
    isOpen,
    existingArticleId: existingArticle?.id || null,
    currentTitle: formData.title,
    currentContent: formData.content ? `${formData.content.substring(0, 20)}...` : '',
  });

  // Pure functional update helper for Single Source of Truth + instantaneous in-memory & session storage
  const updateFormField = useCallback(
    <K extends keyof ArticleFormData>(field: K, value: ArticleFormData[K], source?: string) => {
      setFormData((prev) => {
        const next = {
          ...prev,
          [field]: value,
        };
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            sessionStorage.setItem(storageDraftKey, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    [storageDraftKey]
  );

  // Actual video attached to article (either existing in article or newly set)
  const effectiveVideoUrl = formData.videoUrl || existingArticle?.videoUrl || (existingArticle as any)?.video_url || '';
  const hasVideo = Boolean(effectiveVideoUrl && effectiveVideoUrl.trim().length > 0);

  // User has authorization to edit this article
  const articleAuthorId = existingArticle?.authorId || (existingArticle as any)?.author_id;
  const articleAuthorName = existingArticle?.authorName || (existingArticle as any)?.author_name;
  const articleAuthorEmail = existingArticle?.authorEmail || (existingArticle as any)?.author_email;

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const isAuthor = !existingArticle || Boolean(
    currentUser && (
      (articleAuthorId && (articleAuthorId === currentUser.id || articleAuthorId === (currentUser as any).userId)) ||
      (articleAuthorName && currentUser.name && articleAuthorName.trim() === currentUser.name.trim()) ||
      (articleAuthorEmail && currentUser.email && articleAuthorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
    )
  );

  const canEditArticle = Boolean(!currentUser || isStaff || isAuthor);
  const canDeleteVideo = Boolean(hasVideo && canEditArticle);
  const canPublishDirectly = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const isAlreadyPublished = Boolean(
    existingArticle && (existingArticle.status === 'published' || (existingArticle.status as string) === 'approved')
  );

  if (!isOpen) return null;

  // Device file upload handlers
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUrl = await fileToDataUrl(file);
        updateFormField('mainImage', dataUrl, 'upload:mainImage');
        addToast('info', 'تم رفع الصورة', 'تم تحميل الصورة الرئيسية من جهازك بنجاح');
      } catch {
        addToast('error', 'فشل الرفع', 'تعذر قراءة الصورة من الجهاز');
      }
    }
  };

  const handleExtraImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const fileList = Array.from(e.target.files) as File[];
        const promises = fileList.map((file: File) => fileToDataUrl(file));
        const newImages = await Promise.all(promises);
        setFormData((prev) => {
          const updated = [...prev.extraImages, ...newImages];
          logTrace('FIELD_CHANGE', {
            instanceId: instanceIdRef.current,
            field: 'extraImages',
            oldValue: prev.extraImages.length,
            newValue: updated.length,
            source: 'upload:extraImages',
            timestamp: Date.now(),
          });
          return { ...prev, extraImages: updated };
        });
        addToast('info', 'صور إضافية', `تمت إضافة ${newImages.length} صور من جهازك`);
      } catch {
        addToast('error', 'فشل الرفع', 'تعذر تحميل بعض الصور من الجهاز');
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = file.size / (1024 * 1024);

      if (file.size > 100 * 1024 * 1024) {
        addToast(
          'error',
          'حجم كبير',
          `حجم ملف الفيديو (${sizeMb.toFixed(1)} ميجابايت) يتجاوز الحد الأقصى (100 ميجابايت). يمكنك اختيار ملف أصغر أو وضع رابط يوتيوب.`
        );
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      setVideoName(`${file.name} (${sizeMb.toFixed(1)} ميجابايت)`);
      setIsUploadingVideo(true);
      setVideoUploadProgress(0);

      try {
        const res = await uploadMediaWithProgress(file, 'news-images', (percent) => {
          setVideoUploadProgress(percent);
        });

        if (res.success && res.url) {
          updateFormField('videoUrl', res.url, 'upload:video');
          addToast('success', 'تم رفع الفيديو', 'تم رفع وتخزين ملف الفيديو بنجاح وجاهز للعرض');
        } else {
          updateFormField('videoUrl', '', 'upload:videoFailed');
          addToast('error', 'فشل الرفع', res.message || 'تعذر رفع الفيديو إلى السحابة');
        }
      } catch (err: any) {
        console.error('[ArticleVideoUpload] Error:', err);
        updateFormField('videoUrl', '', 'upload:videoError');
        addToast('error', 'خطأ في الاتصال', 'تعذر رفع ملف الفيديو، يرجى المحاولة لاحقاً');
      } finally {
        setIsUploadingVideo(false);
        if (videoInputRef.current) videoInputRef.current.value = '';
      }
    }
  };

  const handleApplyVideoUrl = () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) {
      addToast('warning', 'رابط مطلوب', 'يرجى كتابة أو لصق رابط الفيديو أولاً');
      return;
    }
    const parsed = parseVideoUrl(trimmed);
    updateFormField('videoUrl', trimmed, 'url:video');
    setVideoName(parsed.type === 'youtube' ? 'مقطع يوتيوب' : 'رابط فيديو خارجي');
    addToast('success', 'تم ربط الفيديو', 'تم إدراج رابط الفيديو في المادة ومعاينته بنجاح');
  };

  const handleInitiateDeleteVideo = () => {
    if (!canDeleteVideo) {
      addToast('warning', 'غير متاح', 'لا تملك صلاحية حذف الفيديو من هذه المادة');
      return;
    }
    setShowDeleteVideoConfirm(true);
  };

  const handleConfirmDeleteVideo = async () => {
    setIsDeletingVideo(true);
    try {
      if (existingArticle && existingArticle.id) {
        const res = await deleteArticleVideo(existingArticle.id);
        if (res.success) {
          updateFormField('videoUrl', '', 'delete:existingArticleVideo');
          setVideoName('');
          setShowDeleteVideoConfirm(false);
          existingArticle.videoUrl = '';
          (existingArticle as any).video_url = null;
        }
      } else if (formData.videoUrl) {
        const res = await fetch('/api/upload/delete-video', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ videoUrl: formData.videoUrl }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          updateFormField('videoUrl', '', 'delete:newArticleVideo');
          setVideoName('');
          setShowDeleteVideoConfirm(false);
          addToast('success', 'تم حذف الفيديو', 'تمت إزالة مقطع الفيديو بنجاح');
        } else {
          addToast('error', 'فشل الحذف', data.message || 'تعذر إزالة ملف الفيديو');
        }
      }
    } catch {
      addToast('error', 'خطأ', 'حدث خطأ أثناء محاولة حذف الفيديو');
    } finally {
      setIsDeletingVideo(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploadingAttachment(true);
      setAttachmentUploadProgress(0);

      try {
        const newAttachments: ArticleAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > 50 * 1024 * 1024) {
            addToast('warning', 'حجم كبير', `الملف ${file.name} يتجاوز 50 ميجابايت.`);
            continue;
          }
          const res = await uploadFileWithProgress(file, 'attachments', (p) => {
            const overall = Math.round(((i + p / 100) / files.length) * 100);
            setAttachmentUploadProgress(overall);
          });
          if (res.success && res.url) {
            newAttachments.push({
              id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              name: res.originalName || file.name,
              url: res.url,
              size: res.size || file.size,
              type: res.mimeType || file.type,
              uploadedAt: new Date().toISOString(),
            });
          } else {
            addToast('error', 'فشل الرفع', res.message || `تعذر رفع الملف ${file.name}`);
          }
        }

        if (newAttachments.length > 0) {
          setFormData((prev) => {
            const updated = [...(prev.attachments || []), ...newAttachments];
            if (typeof window !== 'undefined' && window.sessionStorage) {
              try {
                sessionStorage.setItem(storageDraftKey, JSON.stringify({ ...prev, attachments: updated }));
              } catch {}
            }
            return { ...prev, attachments: updated };
          });
          addToast('success', 'تم إرفاق الملف', `تم رفع وإرفاق ${newAttachments.length} ملف بنجاح.`);
        }
      } catch (err: any) {
        console.error('[ArticleAttachmentUpload] Error:', err);
        addToast('error', 'خطأ في الرفع', 'حدث خطأ أثناء رفع المستندات المرفقة.');
      } finally {
        setIsUploadingAttachment(false);
        setAttachmentUploadProgress(0);
        if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setFormData((prev) => {
      const updated = (prev.attachments || []).filter((a) => a.id !== attId);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          sessionStorage.setItem(storageDraftKey, JSON.stringify({ ...prev, attachments: updated }));
        } catch {}
      }
      return { ...prev, attachments: updated };
    });
    addToast('info', 'تمت الإزالة', 'تم حذف الملف المرفق من المادة الصحفية.');
  };

  const handleSubmit = async (submitType: 'submit_review' | 'publish_now' | 'draft' | 'save_published') => {
    if (!currentUser) {
      addToast('error', 'تنبيه', 'يجب تسجيل الدخول أولاً للمتابعة');
      return;
    }
    if (!formData.title.trim()) {
      addToast('warning', 'حقل مطلوب', 'يرجى كتابة عنوان الخبر الصحفي');
      return;
    }
    if (submitType !== 'draft' && !formData.content.trim()) {
      addToast('warning', 'حقل مطلوب', 'يرجى كتابة متن وتفاصيل الخبر الصحفي الكاملة قبل الإرسال للاعتماد');
      return;
    }

    const effectiveExcerpt = formData.excerpt.trim() || formData.content.trim().substring(0, 160).replace(/\n/g, ' ') + '...';
    const effectiveMainImage = formData.mainImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80';

    setIsSubmitting(true);
    try {
      const parsedKeywords = formData.keywords
        .split(/[،,]/)
        .map((k) => k.trim())
        .filter(Boolean);

      let targetStatus: Article['status'] = 'under_review';
      if (submitType === 'draft') {
        targetStatus = 'draft';
      } else if (submitType === 'publish_now' && canPublishDirectly) {
        targetStatus = 'published';
      } else if (submitType === 'save_published' && isAlreadyPublished && existingArticle) {
        targetStatus = existingArticle.status;
      } else {
        targetStatus = 'under_review';
      }

      const effectiveMediaType = formData.kind === 'تقرير مرئي' ? 'video' : formData.kind === 'ألبوم صور' ? 'album' : 'article';

      if (existingArticle) {
        const effectivePublishedAt = isAlreadyPublished
          ? (existingArticle.publishedAt || (existingArticle as any).published_at)
          : (targetStatus === 'published' ? (existingArticle.publishedAt || new Date().toISOString()) : undefined);

        await updateArticle(existingArticle.id, {
          title: formData.title,
          excerpt: effectiveExcerpt,
          content: formData.content,
          category: formData.category,
          kind: formData.kind,
          mediaType: effectiveMediaType,
          mainImage: effectiveMainImage,
          extraImages: formData.extraImages,
          videoUrl: formData.videoUrl,
          attachments: formData.attachments || [],
          sources: formData.sources,
          eventDate: formData.eventDate,
          location: formData.location,
          keywords: parsedKeywords,
          tags: parsedKeywords,
          status: targetStatus,
          publishedAt: effectivePublishedAt,
          isBreaking: currentUser.role === 'admin' ? formData.isBreaking : existingArticle.isBreaking,
          isFeatured: currentUser.role === 'admin' ? formData.isFeatured : existingArticle.isFeatured,
          authorId: isEditorialStaff && formData.authorId ? formData.authorId : existingArticle.authorId,
          authorName: isEditorialStaff && formData.authorName ? formData.authorName : existingArticle.authorName,
          coAuthors: formData.coAuthors,
          coAuthorIds: formData.coAuthors.map((c) => c.journalistId),
        });
      } else {
        const effectiveAuthorId = isEditorialStaff && formData.authorId ? formData.authorId : currentUser.id;
        const authorUser = registeredJournalists.find((j) => j.id === effectiveAuthorId);
        const effectiveAuthorName = authorUser?.name || (isEditorialStaff && formData.authorName ? formData.authorName : currentUser.name);

        await submitArticle({
          title: formData.title,
          excerpt: effectiveExcerpt,
          content: formData.content,
          category: formData.category,
          kind: formData.kind,
          mediaType: effectiveMediaType,
          mainImage: effectiveMainImage,
          extraImages: formData.extraImages,
          videoUrl: formData.videoUrl,
          attachments: formData.attachments || [],
          authorId: effectiveAuthorId,
          authorName: effectiveAuthorName,
          authorAvatar: authorUser?.avatar || currentUser.avatar,
          authorMajor: authorUser?.major || currentUser.major,
          authorStudentId: authorUser?.studentId || currentUser.studentId,
          coAuthors: formData.coAuthors,
          coAuthorIds: formData.coAuthors.map((c) => c.journalistId),
          status: targetStatus,
          isBreaking: (currentUser.role === 'admin' || currentUser.role === 'editor') ? formData.isBreaking : false,
          isFeatured: (currentUser.role === 'admin' || currentUser.role === 'editor') ? formData.isFeatured : false,
          eventDate: formData.eventDate,
          location: formData.location,
          sources: formData.sources,
          keywords: parsedKeywords,
          tags: parsedKeywords,
          publishedAt: targetStatus === 'published' ? new Date().toISOString() : undefined,
        });
      }

      try {
        sessionStorage.removeItem(storageDraftKey);
      } catch {}
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast('error', 'فشل الحفظ', e.message || 'حدث خطأ أثناء حفظ الخبر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="article-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00838f]/10 text-[#00838f]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-cairo text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {existingArticle
                    ? (isAlreadyPublished ? 'تحرير المادة المنشورة والمعتمدة' : 'تعديل المادة الصحفية')
                    : 'المحرر الصحفي: كتابة خبر جديد'}
                </span>
                {isAlreadyPublished && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    منشور ومعتمد
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
                {isAlreadyPublished
                  ? 'يمكنك تعديل أي جزء من الخبر المنشور (العنوان، المتن، المقدمة، التصنيف، الصور، الوسائط) وحفظ التعديلات فوراً مع بقاء الخبر منشوراً'
                  : 'إعداد وتحرير مادة صحفية رقمية بقسم الإعلام والاتصال'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Published Article Informational Banner */}
          {isAlreadyPublished && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-0.5">
                  <span className="font-bold">تحرير وتحديث خبر منشور ومعتمد:</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-tajawal">
                    تعديلك سيُحفظ مباشرة في الأرشيف وقاعدة البيانات مع الحفاظ الكامل على المعرف (ID) وتاريخ النشر الأصلي.
                  </p>
                </div>
              </div>
              {existingArticle?.authorName && (
                <div className="text-[11px] font-tajawal text-emerald-700/80 dark:text-emerald-400/80 bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg">
                  <span>الكاتب: <strong>{existingArticle.authorName}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Editorial Feedback / Revision Request Banner */}
          {Boolean(existingArticle && (existingArticle.editorialNotes || existingArticle.editorFeedback)) && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                existingArticle?.status === 'rejected'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-bold">
                  {existingArticle?.status === 'rejected'
                    ? 'سبب رفض المادة من هيئة التحرير:'
                    : 'ملاحظات هيئة التحرير ومطلوب التعديل:'}
                </h4>
                <p className="text-xs font-tajawal leading-relaxed">
                  {existingArticle?.editorialNotes || existingArticle?.editorFeedback}
                </p>
                {existingArticle?.status === 'needs_edit' && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1">
                    يرجى تعديل المادة الصحفية وفق الملاحظات أعلاه، ثم النقر على "إرسال لهيئة التحرير للاعتماد" لإعادة تقديمها للتدقيق.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              عنوان الخبر الصحفي * (مشوق ومحدد بدقة)
            </label>
            <input
              type="text"
              id="article-title-input"
              name="qu_article_title"
              autoComplete="off"
              spellCheck={false}
              value={formData.title}
              onChange={(e) => updateFormField('title', e.target.value)}
              placeholder="مثال: جامعة القصيم تطلق ملتقى الصحافة الرقمية بمشاركة خبراء الإعلام العربي"
              className="w-full px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              required
            />
          </div>

          {/* Category & Kind & Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                الموضوع / القسم *
              </label>
              <select
                id="article-category-select"
                name="qu_article_category"
                value={formData.category}
                onChange={(e) => updateFormField('category', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                نوع المادة الصحفية *
              </label>
              <select
                name="qu_article_kind"
                value={formData.kind}
                onChange={(e) => updateFormField('kind', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              >
                <option value="خبر">خبر</option>
                <option value="تقرير">تقرير</option>
                <option value="مقابلة">مقابلة</option>
                <option value="قصص">قصص</option>
                <option value="مقالات">مقالات</option>
                <option value="تقارير وتحقيقات">تقارير وتحقيقات</option>
                <option value="تقرير مرئي">تقرير مرئي</option>
                <option value="ألبوم صور">ألبوم صور</option>
                <option value="فيديو">فيديو</option>
                <option value="صور">صور</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                تاريخ الحدث
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="qu_article_event_date"
                  value={formData.eventDate}
                  onChange={(e) => updateFormField('eventDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                مكان الحدث
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="qu_article_location"
                  autoComplete="off"
                  spellCheck={false}
                  value={formData.location}
                  onChange={(e) => updateFormField('location', e.target.value)}
                  placeholder="المدينة الجامعية، كلية اللغة..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Excerpt / Lead */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              مقدمة الخبر (الموجز الإخباري) * (يجيب عن: من، ماذا، متى، أين، لماذا)
            </label>
            <textarea
              id="article-excerpt-textarea"
              name="qu_article_excerpt"
              autoComplete="off"
              spellCheck={false}
              rows={2}
              value={formData.excerpt}
              onChange={(e) => updateFormField('excerpt', e.target.value)}
              placeholder="اكتب مقدمة مركزة في حدود 30-40 كلمة تضع القارئ في قلب الحدث مباشرة..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Main Image Upload from Device */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  الصورة الرئيسية للخبر (الرفع من الجهاز حصراً) *
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  اختر صورة عالية الدقة من هاتفك أو حاسوبك توثق الحدث
                </p>
              </div>
              <input
                ref={mainImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainImageUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => mainImageInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00838f] text-white hover:bg-[#00707a] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>اختيار صورة من الجهاز</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">أو اختر صورة جاهزة سريعة من أرشيف الكلية:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'الحرم الجامعي', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80' },
                  { label: 'الذكاء الاصطناعي والتقنية', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80' },
                  { label: 'استديو الإعلام', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80' },
                  { label: 'المكتبة والبحث', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateFormField('mainImage', preset.url, 'preset:mainImage')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                      formData.mainImage === preset.url
                        ? 'bg-[#00838f]/10 border-[#00838f] text-[#00838f] font-bold dark:bg-[#00838f]/20'
                        : 'bg-white dark:bg-slate-700/70 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-[#00838f]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.mainImage && (
              <div className="relative rounded-xl overflow-hidden aspect-video max-h-56 w-full border border-slate-200 dark:border-slate-700">
                <img src={formData.mainImage} alt="المعاينة الرئيسية" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => updateFormField('mainImage', '', 'delete:mainImage')}
                  className="absolute top-2 left-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md cursor-pointer"
                  title="حذف الصورة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              متن الخبر الصحفي والتفاصيل الكاملة *
            </label>
            <textarea
              id="article-content-textarea"
              name="qu_article_content"
              autoComplete="off"
              spellCheck={false}
              rows={8}
              value={formData.content}
              onChange={(e) => updateFormField('content', e.target.value)}
              placeholder="اكتب التقرير الصحفي كاملًا، التفاصيل، الاقتباسات المصرح بها من المسؤولين، والخلفيات التاريخية..."
              className="w-full p-4 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none resize-y leading-relaxed font-tajawal"
              required
            />
          </div>

          {/* Extra Media Upload: Extra Images + Video from Device */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Extra Images */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  صور إضافية داخل الخبر (اختياري)
                </span>
                <input
                  ref={extraImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleExtraImagesUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => extraImagesInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#00838f] cursor-pointer"
                >
                  رفع صور
                </button>
              </div>
              {formData.extraImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.extraImages.map((img, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                      <img src={img} alt={`إضافية ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.extraImages.filter((_, idx) => idx !== i);
                          updateFormField('extraImages', updated, 'delete:extraImage');
                        }}
                        className="absolute top-0.5 left-0.5 p-0.5 bg-rose-600 text-white rounded text-[9px] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Attachment (Upload from device OR YouTube/Direct URL) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#00838f]" />
                  <span>مقطع فيديو مرفق بالمادة (اختياري)</span>
                </span>

                {!hasVideo && (
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setVideoSourceType('upload')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        videoSourceType === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-[#00838f] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      رفع ملف
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSourceType('url')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        videoSourceType === 'url'
                          ? 'bg-white dark:bg-slate-900 text-[#00838f] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      رابط يوتيوب
                    </button>
                  </div>
                )}
              </div>

              {!hasVideo && videoSourceType === 'upload' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      اختر ملف MP4 أو WebM أو MOV (حتى 100 ميجابايت)
                    </span>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      onChange={handleVideoUpload}
                      disabled={isUploadingVideo}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploadingVideo}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#00838f] text-white hover:bg-[#00707a] cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isUploadingVideo ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>جاري الرفع ({videoUploadProgress}%)...</span>
                        </span>
                      ) : (
                        'اختيار فيديو'
                      )}
                    </button>
                  </div>

                  {isUploadingVideo && (
                    <div className="space-y-1 p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                      <div className="flex justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300">
                        <span>جاري الرفع إلى السحابة...</span>
                        <span>{videoUploadProgress}%</span>
                      </div>
                      <div className="w-full bg-sky-200 dark:bg-sky-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#00838f] h-full transition-all duration-300"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!hasVideo && videoSourceType === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="رابط يوتيوب أو فيديو مباشر (https://...)"
                    dir="ltr"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none text-left"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVideoUrl}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#00838f] text-white hover:bg-[#00707a] cursor-pointer transition-colors shrink-0"
                  >
                    تطبيق
                  </button>
                </div>
              )}

              {hasVideo && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {videoName || 'مقطع فيديو مرفق بالمادة الصحفية'}
                      </span>
                    </div>

                    {canDeleteVideo && (
                      <button
                        type="button"
                        id="btn-delete-article-video"
                        onClick={handleInitiateDeleteVideo}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="حذف الفيديو"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Video Live Preview */}
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner max-h-48">
                    <UniversalVideoPlayer
                      url={formData.videoUrl}
                      title={formData.title || 'معاينة فيديو المادة'}
                      poster={formData.mainImage}
                    />
                  </div>

                  {showDeleteVideoConfirm && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                      <p className="text-[11px] font-bold text-rose-800 dark:text-rose-200">
                        تأكيد حذف مقطع الفيديو من المادة الصحفية؟
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          id="btn-cancel-delete-video"
                          onClick={() => setShowDeleteVideoConfirm(false)}
                          disabled={isDeletingVideo}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-delete-video"
                          onClick={handleConfirmDeleteVideo}
                          disabled={isDeletingVideo}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingVideo ? 'جاري الحذف...' : 'نعم، حذف الفيديو'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* File Attachments Section (PDF, Word, Excel, ZIP, etc.) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-[#00838f]/10 text-[#00838f] dark:bg-[#00838f]/20 shrink-0 mt-0.5">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>المرفقات والوثائق الرسمية المصاحبة</span>
                    {formData.attachments && formData.attachments.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#00838f] text-white font-bold">
                        {formData.attachments.length}
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    أرفق البيانات الصحفية، ملفات PDF، دراسات، جداول Excel، أو عروض تقديمية داعمة للمادة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                  onChange={handleAttachmentUpload}
                  disabled={isUploadingAttachment}
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-upload-article-attachment"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-[#00838f] hover:text-[#00838f] dark:hover:text-[#00838f] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isUploadingAttachment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00838f]" />
                      <span>جاري الرفع ({attachmentUploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#00838f]" />
                      <span>إرفاق ملفات من جهازك</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploadingAttachment && (
              <div className="space-y-1 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="flex justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300">
                  <span>جاري رفع وتخزين المستندات في السحابة...</span>
                  <span>{attachmentUploadProgress}%</span>
                </div>
                <div className="w-full bg-sky-200 dark:bg-sky-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00838f] h-full transition-all duration-300"
                    style={{ width: `${attachmentUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Attached Files List */}
            {formData.attachments && formData.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {formData.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#00838f]/50 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#00838f]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={att.name}>
                          {att.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{getFileTypeLabel(att.name)}</span>
                          <span>•</span>
                          <span>{formatFileSize(att.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mr-2">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="p-1.5 text-slate-500 hover:text-[#00838f] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="معاينة وفتح المستند"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFileSafely(att.url, att.name)}
                        className="p-1.5 text-slate-500 hover:text-[#00838f] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="تنزيل الملف للجهاز"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="حذف المرفق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isUploadingAttachment && (
                <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    لم يتم إرفاق أي مستندات حتى الآن. يمكنك اختيار ملفات PDF أو Word أو جداول بيانات لإرفاقها.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Sources & Keywords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                المصادر المعتمدة والتصريحات الرسمية
              </label>
              <input
                type="text"
                id="article-sources-input"
                name="qu_article_sources"
                autoComplete="off"
                spellCheck={false}
                value={formData.sources}
                onChange={(e) => updateFormField('sources', e.target.value)}
                placeholder="مثال: المتحدث الرسمي للجامعة، عمادة شؤون الطلاب..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                الكلمات المفتاحية (مفصولة بفاصلة ،)
              </label>
              <input
                type="text"
                id="article-keywords-input"
                name="qu_article_keywords"
                autoComplete="off"
                spellCheck={false}
                value={formData.keywords}
                onChange={(e) => updateFormField('keywords', e.target.value)}
                placeholder="جامعة القصيم، ملتقى، إعلام، صحافة..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              />
            </div>
          </div>

          {/* قسم الصحفيين المشاركون (Co-authors Section) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#00838f]/10 text-[#00838f]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    الصحفيون المشاركون في العمل الصحفي
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-tajawal">
                    إشراك صحفيين مسجلين بالصحيفة وتوثيق أسمائهم رسمياً كمشاركين يظهر في حساباتهم وموقع الصحيفة
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#00838f]">
                المشاركون: {formData.coAuthors.length}
              </span>
            </div>

            {/* Primary Author Display / Selection */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {isEditorialStaff && formData.authorName ? formData.authorName : (existingArticle?.authorName || currentUser?.name)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      الصحفي الأساسي
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-tajawal">
                    المؤلف الرئيسي والمحرر المسؤول عن المادة
                  </p>
                </div>
              </div>

              {isEditorialStaff && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    تغيير الأساسي:
                  </label>
                  <select
                    value={primaryAuthorId}
                    onChange={(e) => handleSelectPrimaryAuthor(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00838f]"
                  >
                    <option value={currentUser.id}>{currentUser.name} (حسابي الحالي)</option>
                    {registeredJournalists
                      .filter((j) => j.id !== currentUser.id)
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name} {j.studentId ? `(${j.studentId})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search and Add Co-Author Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                إضافة صحفي مشارك (بحث بالاسم أو الرقم الأكاديمي أو التخصص):
              </label>
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={coAuthorSearchQuery}
                    onChange={(e) => {
                      setCoAuthorSearchQuery(e.target.value);
                      setIsCoAuthorSearchOpen(true);
                    }}
                    onFocus={() => setIsCoAuthorSearchOpen(true)}
                    placeholder="ابحث عن صحفي مسجل بالصحيفة لإضافته..."
                    className="w-full px-3.5 py-2.5 pr-9 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* Dropdown of search matches */}
                {isCoAuthorSearchOpen && coAuthorSearchQuery.trim().length > 0 && (
                  <div className="absolute z-20 top-full mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-700/50">
                    {(() => {
                      const query = coAuthorSearchQuery.trim().toLowerCase();
                      const matches = registeredJournalists.filter((j) => {
                        // Exclude primary author
                        if (j.id === primaryAuthorId || j.id.replace(/^req-/, '') === primaryAuthorId.replace(/^req-/, '')) return false;
                        // Exclude already added
                        if (formData.coAuthors.some((c) => c.journalistId === j.id || c.journalistId.replace(/^req-/, '') === j.id.replace(/^req-/, ''))) return false;
                        return (
                          j.name.toLowerCase().includes(query) ||
                          (j.studentId && j.studentId.includes(query)) ||
                          (j.major && j.major.toLowerCase().includes(query)) ||
                          (j.email && j.email.toLowerCase().includes(query))
                        );
                      });

                      if (matches.length === 0) {
                        return (
                          <div className="p-3 text-center text-xs text-slate-500 font-tajawal">
                            لا يوجد صحفي مطابق للبحث، أو أن الصحفي مضاف بالفعل.
                          </div>
                        );
                      }

                      return matches.map((j) => (
                        <div
                          key={j.id}
                          className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 font-bold text-xs flex items-center justify-center overflow-hidden">
                              {j.avatar ? (
                                <img src={j.avatar} alt={j.name} className="w-full h-full object-cover" />
                              ) : (
                                j.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {j.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-tajawal">
                                {j.major || 'صحافة ونشر رقمي'} {j.studentId ? `• رقم: ${j.studentId}` : ''}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddCoAuthor(j)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00838f] hover:bg-[#006699] text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>إضافة</span>
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Co-Authors List */}
            {formData.coAuthors.length > 0 ? (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  قائمة المشاركين الحاليين في هذا العمل ({formData.coAuthors.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formData.coAuthors.map((ca) => (
                    <div
                      key={ca.journalistId}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {ca.avatar ? (
                            <img src={ca.avatar} alt={ca.name} className="w-full h-full object-cover" />
                          ) : (
                            ca.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ca.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold">
                              صحفي مشارك
                            </span>
                            {ca.studentId && <span>{ca.studentId}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCoAuthor(ca.journalistId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="إزالة الصحفي المشارك"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-tajawal">
                  لم يتم تعيين صحفيين مشاركين حتى الآن. يمكنك البحث أعلاه لإشراك زملاء في إعداد وتغطية هذا العمل.
                </p>
              </div>
            )}
          </div>

          {/* Breaking & Featured (Editorial Staff only) */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                خيارات التمييز والعرض في الواجهة (خاصة بإدارة التحرير):
              </span>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBreaking}
                    onChange={(e) => updateFormField('isBreaking', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00838f] focus:ring-[#00838f]"
                  />
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    خبر عاجل (يظهر في شريط الأخبار العاجلة أعلى الموقع)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => updateFormField('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded text-[#00838f] focus:ring-[#00838f]"
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    تثبيت المادة (الخبر الرئيسي في واجهة الصحيفة)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Sticky footer) */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {!isAlreadyPublished && (
              <button
                id="btn-save-draft"
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ كمسودة'}</span>
              </button>
            )}

            <button
              id="btn-cancel-modal"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isAlreadyPublished ? (
              <div className="flex flex-wrap items-center gap-2">
                {currentUser?.role === 'admin' && (
                  <button
                    id="btn-unpublish-article"
                    type="button"
                    onClick={() => {
                      if (window.confirm('هل تريد إلغاء نشر هذا الخبر مؤقتاً وتحويله إلى مسودة؟')) {
                        handleSubmit('draft');
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="تحويل المادة إلى مسودة وإلغاء ظهورها في الموقع مؤقتاً"
                  >
                    <span>إلغاء النشر (تحويل لمسودة)</span>
                  </button>
                )}
                <button
                  id="btn-save-published"
                  type="button"
                  onClick={() => handleSubmit('save_published')}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  title="حفظ كافة التعديلات والتحديث الفوري في الموقع مع بقاء الخبر منشوراً"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات على الخبر المنشور'}</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  id="btn-submit-review"
                  type="button"
                  onClick={() => handleSubmit('submit_review')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#00838f] hover:bg-[#00707a] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال لهيئة التحرير للاعتماد'}</span>
                </button>

                {canPublishDirectly && (
                  <button
                    id="btn-publish-direct"
                    type="button"
                    onClick={() => handleSubmit('publish_now')}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSubmitting ? 'جاري النشر...' : 'نشر مباشر في الصحيفة'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        file={previewAttachment}
      />
    </div>
  );
};
