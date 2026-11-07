import React from 'react';

interface UniversityLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon-only' | 'white';
  showSubtitle?: boolean;
}

export const UniversityLogo: React.FC<UniversityLogoProps> = ({
  className = '',
  variant = 'full',
  showSubtitle = false,
}) => {
  const isWhite = variant === 'white';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} dir="rtl">
      {/* Official Qassim University Logo Image */}
      <img
        src="/qu-logo.png"
        alt="شعار جامعة القصيم"
        className={`h-9 w-auto object-contain sm:h-11 ${isWhite ? 'rounded bg-white/95 p-1' : ''}`}
      />

      {variant !== 'icon-only' && (
        <div className="flex flex-col justify-center">
          <span className={`text-xl font-extrabold tracking-tight sm:text-2xl ${isWhite ? 'text-primary-foreground' : 'text-foreground'}`}>
            صحيفة QU
          </span>
          {showSubtitle && (
            <span className="text-xs text-muted-foreground">
              المنصة الصحفية الرقمية لطلاب قسم الإعلام والاتصال
            </span>
          )}
        </div>
      )}
    </div>
  );
};

