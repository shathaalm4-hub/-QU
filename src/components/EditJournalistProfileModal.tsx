import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Lock,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
  Info
} from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { fileToDataUrl } from '../utils/storage';

interface EditJournalistProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_MAJORS = [
  'صحافة ونشر رقمي',
  'إذاعة وتلفزيون',
  'علاقات عامة',
  'إعلام واتصال',
  'لغة عربية وآدابها',
  'تقنية معلومات',
  'تصميم جرافيكي ووسائط متعددة'
];

const ACADEMIC_LEVELS = [
  'المستوى الأول',
  'المستوى الثاني',
  'المستوى الثالث',
  'المستوى الرابع',
  'المستوى الخامس',
  'المستوى السادس',
  'المستوى السابع',
  'المستوى الثامن',
  'دراسات عليا'
];

const SUGGESTED_SKILLS = [
  'التحرير الصحفي',
  'إعداد التقارير',
  'التحقيقات الاستقصائية',
  'التصوير الصحفي',
  'المونتاج الرقمي',
  'صناعة البودكاست',
  'صحافة البيانات',
  'إدارة المنصات الرقمية'
];

export const EditJournalistProfileModal: React.FC<EditJournalistProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, updateJournalistProfile, addToast } = useNews();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [academicLevel, setAcademicLevel] = useState('المستوى الأول');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form with current user data on open
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || '');
      setBio(currentUser.bio || '');
      setMajor(currentUser.major || 'صحافة ونشر رقمي');
      setAcademicLevel(currentUser.academicLevel || 'المستوى الأول');
      setSkills(Array.isArray(currentUser.skills) && currentUser.skills.length > 0 ? [...currentUser.skills] : ['التحرير الصحفي']);
      setNewSkillInput('');
      setErrorMessage('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUrl = await fileToDataUrl(file);
        setAvatar(dataUrl);
      } catch {
        addToast('error', 'فشل تحميل الصورة', 'تعذر معالجة الصورة المحددة.');
      }
    }
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (!s) return;
    if (!skills.includes(s)) {
      setSkills([...skills, s]);
    }
    if (!skillToAdd) {
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('يرجى إدخال اسم صحيح يتكون من حرفين على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateJournalistProfile({
        name: trimmedName,
        avatar: avatar.trim(),
        bio: bio.trim(),
        major: major.trim(),
        academicLevel: academicLevel.trim(),
        skills: skills,
      });

      if (result.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(result.message || 'فشل حفظ التعديلات.');
      }
    } catch (err: any) {
      setErrorMessage('حدث خطأ غير متوقع أثناء حفظ التعديلات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="edit-journalist-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div
        id="edit-journalist-profile-modal-container"
        className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-accent/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">تعديل الملف الصحفي العام</h2>
              <p className="text-xs text-muted-foreground">
                البيانات الظاهرة للجمهور في دليل الصحفيين وصفحات المواد المنشورة
              </p>
            </div>
          </div>
          <button
            id="btn-close-edit-profile-modal"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-brand/5 border border-brand/20 flex items-start gap-3 text-xs text-foreground/90">
          <Info className="size-4 text-brand shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-brand">تكامل مباشر مع Supabase كمصدر وحيد للحقيقة</p>
            <p className="text-muted-foreground mt-0.5">
              يتم حفظ التعديلات مباشرة في Supabase وتنعكس فوراً على بطاقتك في دليل الصحفيين المعتمدين والمواد المنشورة باسمك، مع حماية هويتك الأكاديمية ورقمك الجامعي.
            </p>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Protected Immutable Credentials */}
          <div className="rounded-xl p-4 bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                بيانات الاعتماد المحمية (غير قابلة للتعديل لأسباب أمنية)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="size-3" />
                صحفي معتمد رسمياً
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-background border border-border/60">
                <span className="text-muted-foreground block text-[10px] mb-1">الرقم الجامعي الرسمي</span>
                <span className="font-mono font-semibold text-foreground">
                  {currentUser.studentId || 'غير متوفر'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-border/60">
                <span className="text-muted-foreground block text-[10px] mb-1">البريد الإلكتروني الجامعي</span>
                <span className="font-semibold text-foreground truncate block">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Avatar & Photo */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              الصورة الشخصية / الرمزية
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="size-20 rounded-2xl bg-accent overflow-hidden border-2 border-brand/20 flex items-center justify-center text-xl font-bold text-foreground shrink-0 shadow-xs">
                {avatar ? (
                  <img src={avatar} alt={name || 'الصحفي'} className="size-full object-cover" />
                ) : (
                  <span>{name ? name.charAt(0) : <User className="size-8 text-muted-foreground" />}</span>
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex gap-2">
                  <input
                    id="input-avatar-url"
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="أدخل رابط صورة (URL) مباشر أو اختر من جهازك..."
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Upload className="size-3.5" />
                    <span>رفع صورة</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </div>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="text-[11px] text-destructive hover:underline cursor-pointer"
                  >
                    إزالة الصورة الحالية
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section: Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="input-profile-name" className="block text-sm font-semibold text-foreground">
              الاسم الكامل الظاهر للقراء <span className="text-destructive">*</span>
            </label>
            <input
              id="input-profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: تركي بن عبدالرحمن الشدي"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {/* Section: Major & Academic Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="input-profile-major" className="block text-sm font-semibold text-foreground">
                التخصص الأكاديمي
              </label>
              <div className="space-y-2">
                <input
                  id="input-profile-major"
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="مثال: صحافة ونشر رقمي"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MAJORS.slice(0, 4).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMajor(m)}
                      className={`text-[11px] px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        major === m
                          ? 'bg-brand text-brand-foreground font-semibold'
                          : 'bg-accent text-accent-foreground hover:bg-accent/80'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-academic-level" className="block text-sm font-semibold text-foreground">
                المستوى الأكاديمي
              </label>
              <select
                id="select-academic-level"
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="textarea-profile-bio" className="block text-sm font-semibold text-foreground">
                النبذة التعريفية (Bio)
              </label>
              <span className="text-[11px] text-muted-foreground">{bio.length}/500</span>
            </div>
            <textarea
              id="textarea-profile-bio"
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة موجزة عن اهتماماتك الصحفية، مجالات تغطيتك، وخبراتك..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none leading-relaxed"
            />
          </div>

          {/* Section: Skills */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              المهارات والاهتمامات الصحفية
            </label>
            <div className="flex gap-2">
              <input
                id="input-new-skill"
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="أضف مهارة جديدة واضغط إضافة..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button
                type="button"
                onClick={() => handleAddSkill()}
                className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-semibold hover:bg-brand/90 cursor-pointer"
              >
                إضافة
              </button>
            </div>

            {/* Current Skills Tags */}
            <div className="flex flex-wrap gap-2 pt-1 min-h-[32px]">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="size-3.5 rounded-full hover:bg-brand/20 inline-flex items-center justify-center cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Suggestions */}
            <div className="pt-1">
              <span className="text-[11px] text-muted-foreground block mb-1">اقتراحات شائعة:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAddSkill(skill)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer transition-colors"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              id="btn-cancel-profile-edit"
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-input text-sm font-semibold text-foreground hover:bg-accent cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            <button
              id="btn-save-profile-to-supabase"
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold shadow-md hover:bg-brand/90 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>جاري الحفظ في Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>حفظ التعديلات في Supabase</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
