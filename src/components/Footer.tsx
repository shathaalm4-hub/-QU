import React from 'react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenJoin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  setCurrentTab,
  onOpenLogin,
  onOpenJoin,
}) => {
  return (
    <footer className="mt-16 border-t border-border bg-primary text-primary-foreground" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/qu-logo.png"
                alt="شعار جامعة القصيم"
                className="h-10 w-auto rounded bg-white/95 p-1 object-contain"
              />
              <span className="text-xl font-extrabold">صحيفة QU</span>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/75">
              المنصة الصحفية الرقمية لطلاب قسم الإعلام والاتصال
            </p>
          </div>

          {/* Newspaper Sections */}
          <div>
            <h4 className="mb-3 text-sm font-bold">أقسام الصحيفة</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              <li>
                <button
                  onClick={() => setCurrentTab('news')}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  آخر الأخبار
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('full-story')}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  القصة الكاملة
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('journalists')}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  دليل الصحفيين
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('archive')}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  الأرشيف
                </button>
              </li>
            </ul>
          </div>

          {/* For Students */}
          <div>
            <h4 className="mb-3 text-sm font-bold">للطلاب</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              <li>
                <button
                  onClick={onOpenJoin}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  انضم كصحفي طالب
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('academy')}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  أكاديمية الصحفي
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenLogin}
                  className="hover:text-primary-foreground transition-colors cursor-pointer text-right"
                >
                  تسجيل الدخول
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Official Institutional Copyright Notice */}
        <div className="mt-10 border-t border-primary-foreground/15 pt-6">
          <p className="text-center text-xs leading-6 text-primary-foreground/80 sm:text-sm">
            موقع إخباري لطلاب قسم الإعلام والاتصال الفصل الثاني بالجامعة | جميع الحقوق محفوظة © 2026 - صُمم ونفذ بواسطة: شذى المطيري
          </p>
        </div>
      </div>
    </footer>
  );
};
