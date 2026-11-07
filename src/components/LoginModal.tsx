import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, KeyRound, Check, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { UniversityLogo } from './UniversityLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: string) => void;
  onSwitchToJoin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToJoin,
}) => {
  const { login, setupLegacyPassword } = useNews();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // First-time legacy password configuration state
  const [isPasswordNotConfigured, setIsPasswordNotConfigured] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [legacyUserInfo, setLegacyUserInfo] = useState<{
    userId?: string;
    studentId?: string;
    email?: string;
    name?: string;
  } | null>(null);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupSuccessMessage, setSetupSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleResetState = () => {
    setIsPasswordNotConfigured(false);
    setIsResetMode(false);
    setLegacyUserInfo(null);
    setResetIdentifier('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSetupSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني أو الرقم الجامعي وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        onSuccess(email.includes('admin') ? 'admin' : 'user');
        onClose();
      } else if (res.status === 'password_not_configured' || res.requiresPasswordSetup) {
        // Switch view to first-time password setup for this approved journalist
        setIsPasswordNotConfigured(true);
        setIsResetMode(false);
        setLegacyUserInfo(res.userInfo || { email });
        setResetIdentifier(email.trim());
        setErrorMessage('');
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين');
      return;
    }

    const identifier = resetIdentifier.trim() || legacyUserInfo?.email || legacyUserInfo?.studentId || email.trim();
    if (!identifier) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني أو الرقم الجامعي أو اسمك المسجل');
      return;
    }

    setIsLoading(true);
    try {
      const res = await setupLegacyPassword(identifier, newPassword, isResetMode);
      if (res.success) {
        setSetupSuccessMessage('تم تعيين كلمة المرور بنجاح! جاري توجيهك إلى المنصة...');
        setTimeout(() => {
          onSuccess('user');
          onClose();
          handleResetState();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'تعذر إعداد كلمة المرور');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء إعداد كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={() => {
            handleResetState();
            onClose();
          }}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-1">
            <UniversityLogo className="h-10" showSubtitle={false} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white font-cairo">
            {isPasswordNotConfigured
              ? isResetMode
                ? 'إعادة تعيين كلمة المرور'
                : 'إعداد كلمة المرور لأول مرة'
              : 'تسجيل الدخول إلى المنصة'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
            {isPasswordNotConfigured
              ? isResetMode
                ? 'مخصص للصحفيين المعتمدين لتعيين كلمة مرور جديدة'
                : 'مخصص للصحفيين المعتمدين لتفعيل حساباتهم'
              : 'مخصص للطلاب المعتمدين وهيئة التحرير وإدارة الصحيفة'}
          </p>
        </div>

        {/* Dynamic State View */}
        {isPasswordNotConfigured ? (
          <div>
            {/* Approved Account Notice */}
            <div className="mb-5 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#00838f]">
                <ShieldCheck className="w-4 h-4" />
                <span>حساب صحفي معتمد</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {isResetMode
                  ? 'أدخل المعرف المسجل الخاص بك مع كلمة المرور الجديدة لتحديث بيانات دخولك مباشرة.'
                  : 'يحتاج هذا الحساب إلى إعداد كلمة مرور لأول مرة.'}
                {legacyUserInfo?.name && (
                  <span className="block mt-1 font-semibold text-slate-900 dark:text-white">
                    الصحفي(ة): {legacyUserInfo.name}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                اختر كلمة مرور خاصة بك لتسجيل الدخول مباشرة من الآن فصاعداً دون الحاجة لموافقة جديدة.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {setupSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{setupSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSetupPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  البريد الإلكتروني، الرقم الجامعي، أو اسمك المسجل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={resetIdentifier || legacyUserInfo?.email || legacyUserInfo?.studentId || email}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="مثال: 472212316 أو shathaalm4@gmail.com أو شذى المطيري"
                    dir="auto"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f] transition-all"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف أو أرقام على الأقل"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f] transition-all"
                    required
                    minLength={6}
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f] transition-all"
                    required
                    minLength={6}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#006699] to-[#00838f] hover:from-[#005580] hover:to-[#00707a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{isResetMode ? 'حفظ كلمة المرور الجديدة والدخول' : 'تثبيت كلمة المرور والدخول'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetState}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة إلى شاشة تسجيل الدخول</span>
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* Notice about restricted access */}
            <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00838f]" />
              <p className="leading-relaxed">
                تسجيل الدخول مقتصر على الصحفيين المعتمدين وهيئة الإدارة والتحرير.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  البريد الإلكتروني، الرقم الجامعي، أو اسمك المسجل
                </label>
                <div className="relative">
                  <input
                    id="login-email-input"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="مثال: 472212316 أو shathaalm4@gmail.com أو شذى المطيري"
                    dir="auto"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f] transition-all"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  يمكنك إدخال: البريد الجامعي، أو الشخصي، أو الرقم الجامعي، أو اسمك المسجل
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordNotConfigured(true);
                      setIsResetMode(true);
                      setResetIdentifier(email.trim());
                      setErrorMessage('');
                    }}
                    className="text-[11px] text-[#00838f] dark:text-[#26c6da] hover:underline font-semibold"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00838f] transition-all"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#006699] to-[#00838f] hover:from-[#005580] hover:to-[#00707a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>دخول إلى لوحة التحكم</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                طالب في قسم الإعلام وترغب في النشر؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToJoin();
                  }}
                  className="text-[#00838f] hover:underline font-bold"
                >
                  تقديم طلب انضمام كصحفي
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
