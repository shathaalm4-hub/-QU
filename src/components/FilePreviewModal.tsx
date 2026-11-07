import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileCheck,
  Eye,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileCode,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import {
  formatFileSize,
  getFileTypeLabel,
  getFileViewUrl,
  getFileDownloadUrl,
  downloadFileSafely,
} from '../utils/fileUpload';

export interface FilePreviewItem {
  id?: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FilePreviewItem | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    setIframeError(false);
    setIsFullScreen(false);
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const fileName = file.name || 'ملف مرفق';
  const lowerName = fileName.toLowerCase();
  const lowerUrl = (file.url || '').toLowerCase();

  const isPdf = lowerName.endsWith('.pdf') || lowerUrl.includes('.pdf') || file.type?.includes('pdf');
  const isImage =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.svg') ||
    file.type?.startsWith('image/');
  const isOffice =
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.pptx') ||
    lowerName.endsWith('.ppt');

  const viewUrl = getFileViewUrl(file.url, file.name);
  const downloadUrl = getFileDownloadUrl(file.url, file.name);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadFileSafely(file.url, file.name);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-6 h-6 text-rose-500" />;
    if (isImage) return <ImageIcon className="w-6 h-6 text-purple-500" />;
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    }
    if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
      return <FileText className="w-6 h-6 text-sky-500" />;
    }
    return <File className="w-6 h-6 text-[#00838f]" />;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`معاينة ${fileName}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-5xl h-[92vh] max-h-[920px]'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
              {getFileIcon()}
            </div>
            <div className="min-w-0">
              <h2
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate"
                title={fileName}
              >
                {fileName}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold">{getFileTypeLabel(fileName)}</span>
                {file.size ? (
                  <>
                    <span>•</span>
                    <span dir="ltr">{formatFileSize(file.size)}</span>
                  </>
                ) : null}
                <span className="hidden sm:inline">• وثيقة رسمية معتمدة</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 mr-2">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title="فتح الملف في تبويب مستقل"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تبويب مستقل</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00838f] hover:bg-[#006064] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
              title="تحميل الملف إلى جهازك"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'جاري التحميل...' : 'تحميل'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="hidden md:inline-flex p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="إغلاق النافذة (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 relative flex items-center justify-center p-2 sm:p-4">
          {/* PDF Viewer */}
          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              {viewUrl && viewUrl.trim() ? (
                <iframe
                  src={`${viewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-md"
                  title={fileName}
                  onError={() => setIframeError(true)}
                />
              ) : null}

              {(iframeError || !viewUrl || !viewUrl.trim()) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      تعذر عرض المستند تلقائياً في المتصفح
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      قد يقوم متصفحك أو إعدادات الأمان بحجب المعاينة المباشرة لملفات PDF. يمكنك فتح الملف مباشرة أو حفظه على جهازك:
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="px-4 py-2 rounded-xl bg-[#00838f] text-white text-xs font-bold shadow-xs hover:bg-[#006064]"
                    >
                      فتح الملف مباشرة
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700"
                    >
                      تحميل الملف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isImage && viewUrl && viewUrl.trim() ? (
            /* Image Viewer */
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={viewUrl.trim()}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800"
              />
            </div>
          ) : isOffice ? (
            /* Word/Excel/PowerPoint fallback with Google Docs Viewer embed and direct download */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-[#00838f]/10 text-[#00838f] flex items-center justify-center shadow-inner">
                {getFileIcon()}
              </div>

              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {fileName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  هذا الملف من نوع ({getFileTypeLabel(fileName)})، يمكنك تنزيله مباشرة لفتحه باستخدام البرامج المكتبية على جهازك، أو معاينته عبر الإنترنت.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00838f] hover:bg-[#006064] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل المستند الآن</span>
                </button>

                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    file.url.startsWith('http') ? file.url : window.location.origin + file.url
                  )}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>معاينة عبر Google Docs</span>
                </a>
              </div>
            </div>
          ) : (
            /* Generic File */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <File className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{fileName}</h3>
                <p className="text-xs text-slate-500">
                  {getFileTypeLabel(fileName)} • {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00838f] text-white text-xs font-bold shadow-xs hover:bg-[#006064] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الملف</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center sm:text-right flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[#00838f] dark:text-cyan-400 font-medium">
            <FileCheck className="w-3.5 h-3.5" />
            <span>ملف موثق ومتاح لجميع القراء ومنسوبي جامعة القصيم</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>اضغط Esc للإغلاق</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FilePreviewModal;
