import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Moon, 
  Sun, 
  Menu, 
  X, 
  LogIn, 
  LayoutDashboard, 
  LogOut,
} from 'lucide-react';
import { useNews } from '../context/NewsContext';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenJoin: () => void;
  onOpenCreateArticle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenLogin,
  onOpenJoin,
}) => {
  const { currentUser, logout, isDarkMode, toggleDarkMode, setIsSearchOpen } = useNews();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const formatted = new Intl.DateTimeFormat('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
      setCurrentDateString(formatted);
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'news', label: 'الأخبار' },
    { id: 'journalists', label: 'دليل الصحفيين' },
    { id: 'videos', label: 'تقارير مرئية' },
    { id: 'albums', label: 'ألبومات الصور' },
    { id: 'full-story', label: 'القصة الكاملة' },
    { id: 'academy', label: 'أكاديمية الصحفي' },
    { id: 'archive', label: 'الأرشيف' },
  ];

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  return (
    <header className="sticky top-0 z-50 w-full" dir="rtl">
      {/* Top Utility Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs">
          <span className="hidden text-xs text-primary-foreground/80 sm:inline">
            {currentDateString}
          </span>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setCurrentTab(isStaff ? 'admin-dashboard' : 'journalist-dashboard')}
                  className="flex items-center gap-1 hover:underline transition-all cursor-pointer"
                >
                  <LayoutDashboard className="size-3.5" />
                  <span>لوحة التحكم</span>
                </button>
                <button
                  id="btn-header-logout"
                  onClick={logout}
                  className="flex items-center gap-1 hover:underline transition-all cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>خروج</span>
                </button>
              </>
            ) : (
              <>
                <button
                  id="btn-open-login"
                  onClick={onOpenLogin}
                  className="flex items-center gap-1 hover:underline transition-all cursor-pointer"
                >
                  <LogIn className="size-3.5" />
                  <span>دخول</span>
                </button>
                <button
                  onClick={onOpenJoin}
                  className="hover:underline transition-all cursor-pointer"
                >
                  انضم كصحفي
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Branding & Navigation Header */}
      <div className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          {/* Official University Logo & Newspaper Brand */}
          <button
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-3 cursor-pointer text-right bg-transparent border-0 p-0"
          >
            <img
              src="/qu-logo.png"
              alt="شعار جامعة القصيم"
              className="h-9 w-auto object-contain sm:h-11"
            />
            <span className="text-xl font-extrabold tracking-tight sm:text-2xl text-foreground">
              صحيفة QU
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent hover:text-brand cursor-pointer ${
                    isActive ? 'text-brand bg-accent' : 'text-foreground/80'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="بحث"
              className="flex items-center justify-center size-9 rounded-md text-foreground/80 hover:bg-accent transition-colors cursor-pointer"
            >
              <Search className="size-5" />
            </button>

            <button
              onClick={toggleDarkMode}
              aria-label="تبديل الوضع الليلي"
              className="flex items-center justify-center size-9 rounded-md text-foreground/80 hover:bg-accent transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            {isStaff && (
              <button
                onClick={() => setCurrentTab('admin-dashboard')}
                className="hidden md:inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-1.5 hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                غرفة التحرير
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="القائمة"
              className="flex lg:hidden items-center justify-center size-9 rounded-md text-foreground/80 hover:bg-accent transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" dir="rtl">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative mr-auto w-72 bg-card h-full p-6 shadow-2xl border-l border-border flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img src="/qu-logo.png" alt="شعار جامعة القصيم" className="h-8 w-auto object-contain" />
                <span className="text-lg font-extrabold text-foreground">صحيفة QU</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold text-right transition-colors cursor-pointer ${
                      isActive ? 'bg-accent text-brand' : 'text-foreground/80 hover:bg-accent'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-border flex flex-col gap-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setCurrentTab(isStaff ? 'admin-dashboard' : 'journalist-dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-secondary text-secondary-foreground text-sm font-semibold"
                  >
                    <LayoutDashboard className="size-4" />
                    لوحة التحكم
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-destructive text-sm font-semibold hover:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onOpenLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    <LogIn className="size-4" />
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => {
                      onOpenJoin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center px-3 py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-semibold"
                  >
                    انضم كصحفي
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
