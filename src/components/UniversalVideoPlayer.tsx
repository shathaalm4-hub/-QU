import React, { useState } from 'react';
import { parseVideoUrl } from '../utils/videoUtils';
import { AlertCircle, ExternalLink, RefreshCw, Play } from 'lucide-react';

interface UniversalVideoPlayerProps {
  url?: string | null;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  url,
  title = 'فيديو',
  poster,
  autoPlay = false,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  if (!url || typeof url !== 'string' || !url.trim()) {
    return (
      <div className={`aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-4 ${className}`}>
        <Play className="w-10 h-10 mb-2 opacity-50 text-slate-500" />
        <p className="text-xs font-tajawal">لم يتم تحديد رابط فيديو صالح</p>
      </div>
    );
  }

  const parsed = parseVideoUrl(url) as any;
  const isEmbed = Boolean(parsed.isEmbed || parsed.isEmbeddable);
  const embedSrc = parsed.embedUrl || '';
  const videoSrc = parsed.directUrl || parsed.embedUrl || url;

  if (hasError) {
    return (
      <div className={`aspect-video w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-6 text-center space-y-3 ${className}`} dir="rtl">
        <AlertCircle className="w-8 h-8 text-amber-500" />
        <div>
          <p className="text-sm font-bold text-white mb-1">تعذر تشغيل المقطع مباشرة في المتصفح</p>
          <p className="text-xs text-slate-400">قد تكون صيغة الفيديو بحاجة لدعم إضافي أو أن الرابط غير متاح حالياً.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setRetryKey((k) => k + 1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#00838f] hover:bg-[#00707a] text-xs text-white font-bold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>فتح الرابط المباشر</span>
          </a>
        </div>
      </div>
    );
  }

  if (isEmbed && embedSrc) {
    const finalEmbedUrl = autoPlay
      ? `${embedSrc}${embedSrc.includes('?') ? '&' : '?'}autoplay=1`
      : embedSrc;

    return (
      <div className={`aspect-video w-full bg-black overflow-hidden relative ${className}`}>
        <iframe
          key={`${finalEmbedUrl}-${retryKey}`}
          src={finalEmbedUrl}
          title={title}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // HTML5 native video player for MP4, WebM, /uploads/
  if (!videoSrc || !videoSrc.trim()) {
    return (
      <div className={`aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-4 ${className}`}>
        <Play className="w-10 h-10 mb-2 opacity-50 text-slate-500" />
        <p className="text-xs font-tajawal">لم يتم تحديد رابط فيديو صالح</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video w-full bg-black overflow-hidden relative flex items-center justify-center ${className}`}>
      <video
        key={`${videoSrc}-${retryKey}`}
        src={videoSrc.trim()}
        poster={poster && poster.trim() ? poster.trim() : undefined}
        controls
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      >
        <source src={videoSrc.trim()} type="video/mp4" />
        <source src={videoSrc.trim()} type="video/webm" />
        <source src={videoSrc.trim()} type="video/quicktime" />
        متصفحك الحالي لا يدعم تشغيل مقاطع الفيديو مباشرة.
      </video>
    </div>
  );
};
