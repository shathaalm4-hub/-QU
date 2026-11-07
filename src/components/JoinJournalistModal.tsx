import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  UserPlus, 
  FileText, 
  GraduationCap, 
  ShieldCheck, 
  Image as ImageIcon,
  Paperclip,
  Loader2,
  Trash2
} from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { fileToDataUrl } from '../utils/storage';
import { uploadFileWithProgress, formatFileSize, getFileViewUrl } from '../utils/fileUpload';

interface JoinJournalistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinJournalistModal: React.FC<JoinJournalistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { registerJournalist, addToast } = useNews();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    password: '',
    major: 'صحافة ونشر رقمي',
    academicLevel: 'المستوى الأول',
    bio: '',
    skills: 'التحرير الصحفي، التصوير، المقابلات الميدانية',
  });
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [attachmentFile, setAttachmentFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUrl = await fileToDataUrl(file);
        setAvatarPreview(dataUrl);
      } catch {
        addToast('error', 'فشل الرفع', 'تعذر تحميل الصورة من الجهاز');
      }
    }
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        addToast('warning', 'حجم الملف كبير', 'الحد الأقصى لحجم وثيقة الاعتماد هو 25 ميجابايت.');
        return;
      }
      setIsUploadingDoc(true);
      setDocUploadProgress(0);
      try {
        const res = await uploadFileWithProgress(file, 'attachments', (p) => {
          setDocUploadProgress(p);
        });
        if (res.success && res.url) {
          setAttachmentFile({
            url: res.url,
            name: res.originalName || file.name,
            size: res.size || file.size,
          });
          addToast('success', 'تم رفع الوثيقة', 'تم تحميل وثيقة الاعتماد بنجاح وجاهزة للإرسال مع الطلب');
        } else {
          addToast('error', 'فشل الرفع', res.message || 'تعذر رفع الملف');
        }
      } catch (err) {
        addToast('error', 'خطأ في الرفع', 'حدث خطأ أثناء تحميل الوثيقة');
      } finally {
        setIsUploadingDoc(false);
        setDocUploadProgress(0);
        if (documentInputRef.current) documentInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!formData.studentId.trim()) {
      setErrorMessage('يرجى إدخال الرقم الجامعي');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني الجامعي');
      return;
    }
    if (!formData.password || formData.password.length < 4) {
      setErrorMessage('يرجى إدخال كلمة مرور مناسبة (4 خانات على الأقل)');
      return;
    }

    setIsLoading(true);
    try {
      const skillsArray = formData.skills
        .split('،')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await registerJournalist({
        name: formData.name.trim(),
        studentId: formData.studentId.trim(),
        email: formData.email.trim(),
        password: formData.password,
        major: formData.major,
        academicLevel: formData.academicLevel,
        avatar: avatarPreview,
        attachmentUrl: attachmentFile?.url,
        attachmentName: attachmentFile?.name,
        attachmentSize: attachmentFile?.size,
        bio: formData.bio.trim(),
        skills: skillsArray.length ? skillsArray : ['التحرير الصحفي'],
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء إرسال طلب الانضمام');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close */}
        <button
          onClick={() => {
            if (isSubmitted) {
              setIsSubmitted(false);
              onSuccess();
            }
            onClose();
          }}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cairo">
                تم استلام طلبك بنجاح!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed font-tajawal">
                تم تسجيل بياناتك وإرسال إشعار فوري إلى المشرف العام في لوحة التحكم لمراجعة واعتماد طلبك.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-right space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">ماذا يحدث الآن؟</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>يقوم المشرف العام بفحص الرقم الجامعي والتخصص واعتماد الحساب.</li>
                <li>بمجرد الاعتماد، يمكنك تسجيل الدخول فوراً ببريدك وكلمة المرور التي حددتها.</li>
                <li>ستتمكن من إنشاء ونشر مقالاتك والتقارير الميدانية والصور مباشرة.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setIsSubmitted(false);
                onSuccess();
                onClose();
              }}
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#00838f] hover:bg-[#00707c] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              تم، حسناً
            </button>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="text-center space-y-1 mb-6">
              <div className="inline-flex p-2.5 rounded-2xl bg-[#00838f]/10 text-[#00838f] mb-1">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cairo">
                انضم كصحفي في صحيفة QU
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
                طلب اعتماد طالب صحفي بقسم الإعلام والاتصال - جامعة القصيم
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar upload from device */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-[#00838f]/30 flex-shrink-0 relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="المعاينة" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">الصورة الشخصية الرسمية</p>
              <p className="text-[11px] text-slate-500 mb-2">اختر صورة من جهازك (PNG, JPG)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-[#00838f]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع من الجهاز</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم الرباعي للطالب *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: شذى المطيري"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الرقم الجامعي *
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="مثال: 441052341"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الجامعي الرسمي *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="s441052341@qu.edu.sa"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور للحساب *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                dir="ltr"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المسار / التخصص
              </label>
              <select
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              >
                <option value="صحافة ونشر رقمي">صحافة ونشر رقمي</option>
                <option value="علاقات عامة">علاقات عامة</option>
                <option value="إذاعة وتلفزيون">إذاعة وتلفزيون</option>
                <option value="اتصال تسويقي وإعلان">اتصال تسويقي وإعلان</option>
                <option value="إعلام عام">إعلام عام</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المستوى الدراسي
              </label>
              <select
                value={formData.academicLevel}
                onChange={(e) => setFormData({ ...formData, academicLevel: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              >
                <option value="المستوى الأول">المستوى الأول</option>
                <option value="المستوى الثاني">المستوى الثاني</option>
                <option value="المستوى الثالث">المستوى الثالث</option>
                <option value="المستوى الرابع">المستوى الرابع</option>
                <option value="المستوى الخامس">المستوى الخامس</option>
                <option value="المستوى السادس">المستوى السادس</option>
                <option value="المستوى السابع">المستوى السابع</option>
                <option value="المستوى الثامن (تخرج)">المستوى الثامن (تخرج)</option>
                <option value="دراسات عليا">دراسات عليا</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              المهارات الصحفية (مفصولة بفواصل)
            </label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="التحرير الإخباري، التصوير، التحقيقات، المونتاج"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نبذة مختصرة عن اهتماماتك الصحفية
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="اكتب نبذة موجزة عن خبراتك ومجالات التغطية التي تفضل العمل عليها في المنصة..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              إثبات القيد / البطاقة الجامعية / السيرة الذاتية (ملف مرفق - اختياري)
            </label>
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/*"
              onChange={handleDocumentChange}
              disabled={isUploadingDoc}
              className="hidden"
            />
            {attachmentFile ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-500/30 dark:border-emerald-500/20">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {attachmentFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachmentFile.size)} • تم التحميل بنجاح
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mr-2">
                  <a
                    href={getFileViewUrl(attachmentFile.url, attachmentFile.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-[11px] font-semibold text-[#00838f] hover:bg-[#00838f]/10 rounded-lg transition-colors cursor-pointer"
                  >
                    معاينة
                  </a>
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="إزالة الملف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                disabled={isUploadingDoc}
                className="w-full flex items-center justify-between p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00838f] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#00838f]" />
                  <span>
                    {isUploadingDoc
                      ? `جاري الرفع (${docUploadProgress}%)...`
                      : 'اضغط هنا لرفع البطاقة الجامعية أو السيرة الذاتية (PDF أو صورة)'}
                  </span>
                </span>
                {isUploadingDoc ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00838f]" />
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    اختيار ملف
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00838f] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              يخضع طلب الانضمام لتدقيق إدارة المنصة للتأكد من القيد في قسم الإعلام والاتصال. بعد الاعتماد، ستتمكن من نشر المواد الصحفية مباشرة من لوحة التحكم الخاصة بك.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#006699] to-[#00838f] hover:from-[#005580] hover:to-[#00707a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>إرسال طلب الانضمام للاعتماد</span>
              </>
            )}
          </button>
        </form>
        </>
      )}
      </div>
    </div>
  );
};
