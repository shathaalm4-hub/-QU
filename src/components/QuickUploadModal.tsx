import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  Copy, 
  FileText, 
  Download, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Video,
  File
} from 'lucide-react';
import { uploadFileWithProgress, formatFileSize, getFileTypeLabel, getFileExtension } from '../utils/fileUpload';
import { useNews } from '../context/NewsContext';

interface UploadedFileRecord {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: UploadedFileRecord) => void;
  title?: string;
  bucket?: 'attachments' | 'news-images' | 'avatars';
}

export const QuickUploadModal: React.FC<QuickUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  title = 'رفع ملف وإدارته',
  bucket = 'attachments',
}) => {
  const { addToast } = useNews();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('qu_quick_uploaded_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const saveRecentFiles = (files: UploadedFileRecord[]) => {
    setUploadedFiles(files);
    try {
      sessionStorage.setItem('qu_quick_uploaded_files', JSON.stringify(files.slice(0, 20)));
    } catch {}
  };

  const handleFileProcess = async (file: File) => {
    if (file.size > 80 * 1024 * 1024) {
      addToast('error', 'حجم كبير', `حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد المسموح به (80 ميجابايت).`);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const res = await uploadFileWithProgress(file, bucket, (percent) => {
        setProgress(percent);
      });

      if (res.success && res.url) {
        const record: UploadedFileRecord = {
          id: 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          url: res.url,
          name: res.originalName || file.name,
          size: res.size || file.size,
          type: res.mimeType || file.type,
          uploadedAt: new Date().toISOString(),
        };

        const updated = [record, ...uploadedFiles];
        saveRecentFiles(updated);
        addToast('success', 'تم رفع الملف بنجاح', `تم تخزين ${file.name} في السحابة بنجاح`);

        if (onSelectFile) {
          onSelectFile(record);
        }
      } else {
        addToast('error', 'فشل الرفع', res.message || 'تعذر حفظ الملف في السحابة');
      }
    } catch (err: any) {
      addToast('error', 'خطأ في الاتصال', 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleCopyLink = (record: UploadedFileRecord) => {
    try {
      const fullUrl = record.url.startsWith('http')
        ? record.url
        : `${window.location.origin}${record.url}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedId(record.id);
      addToast('success', 'تم نسخ الرابط', 'تم نسخ الرابط المباشر للملف إلى الحافظة');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (['mp4', 'mov', 'webm'].includes(ext)) {
      return <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    }
    return <FileText className="w-5 h-5 text-[#00838f] dark:text-[#26c6da]" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00838f]/10 text-[#00838f]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-cairo">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                رفع مستندات PDF، ملفات وورد، إكسل، وصور بروابط سريعة ومباشرة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer space-y-3 ${
            dragOver
              ? 'border-[#00838f] bg-[#00838f]/5 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 hover:border-[#00838f]/70'
          } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            disabled={isUploading}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-[#00838f]/10 text-[#00838f] mx-auto flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-cairo">
              {isUploading
                ? `جاري رفع وتخزين الملف (${progress}%)...`
                : 'اسحب وأفلت الملف هنا، أو انقر للاختيار من جهازك'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
              ندعم: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, والصور (حتى 80 ميجابايت)
            </p>
          </div>

          {isUploading && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-[#00838f] h-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Recent Uploads List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الملفات المرفوعة حديثاً ({uploadedFiles.length})
              </span>
              <button
                type="button"
                onClick={() => saveRecentFiles([])}
                className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                مسح السجل
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-2xs">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{getFileTypeLabel(file.name)}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(file)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                        copiedId === file.id
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-[#00838f]'
                      }`}
                      title="نسخ الرابط المباشر"
                    >
                      {copiedId === file.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تم</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>

                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-[#00838f] border border-slate-300 dark:border-slate-600 hover:border-[#00838f] transition-all cursor-pointer"
                      title="معاينة أو تنزيل"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
