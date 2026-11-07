import { getAuthHeaders } from '../context/NewsContext';

export interface UploadedFileResponse {
  success: boolean;
  url?: string;
  filename?: string;
  name?: string;
  originalName?: string;
  size?: number;
  type?: string;
  mimeType?: string;
  storage?: string;
  message?: string;
}

/**
 * Formats byte size into human readable Arabic string (e.g., 2.4 ميجابايت, 450 كيلوبايت)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 كيلوبايت';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

/**
 * Extracts normalized file extension (e.g., 'pdf', 'docx', 'mp4')
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Returns a human-friendly Arabic label for file type
 */
export function getFileTypeLabel(mimeOrName: string): string {
  if (!mimeOrName) return 'ملف مستند';
  const lower = mimeOrName.toLowerCase();

  if (lower.includes('pdf')) return 'مستند PDF';
  if (lower.includes('word') || lower.includes('docx') || lower.includes('doc')) return 'مستند Word';
  if (lower.includes('sheet') || lower.includes('excel') || lower.includes('xlsx') || lower.includes('xls')) return 'جدول بيانات Excel';
  if (lower.includes('presentation') || lower.includes('powerpoint') || lower.includes('pptx') || lower.includes('ppt')) return 'عرض تقديمي PowerPoint';
  if (lower.includes('zip') || lower.includes('rar') || lower.includes('7z') || lower.includes('compressed')) return 'أرشيف مضغوط';
  if (lower.includes('text') || lower.includes('txt') || lower.includes('csv')) return 'ملف نصي / بيانات';
  if (lower.includes('image') || lower.includes('png') || lower.includes('jpg') || lower.includes('jpeg')) return 'صورة فوتوغرافية';
  if (lower.includes('video') || lower.includes('mp4') || lower.includes('mov')) return 'ملف فيديو';
  if (lower.includes('audio') || lower.includes('mp3') || lower.includes('wav')) return 'ملف صوتي';

  const ext = getFileExtension(lower);
  if (ext) return `ملف (${ext.toUpperCase()})`;
  return 'ملف مرفق';
}

/**
 * Uploads any file to the server /api/upload endpoint with real-time percentage progress
 */
export function uploadFileWithProgress(
  file: File,
  bucket: 'news-images' | 'avatars' | 'attachments' = 'attachments',
  onProgress?: (percent: number) => void
): Promise<UploadedFileResponse> {
  return new Promise((resolve) => {
    // Client-side file size limit (100 MB max)
    if (file.size > 100 * 1024 * 1024) {
      resolve({
        success: false,
        message: `حجم الملف (${formatFileSize(file.size)}) يتجاوز الحد الأقصى المسموح به (100 ميجابايت).`,
      });
      return;
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
          if (onProgress) onProgress(100);
          resolve({
            success: true,
            url: data.url,
            filename: data.filename || file.name,
            name: file.name,
            size: data.size || file.size,
            type: data.mimeType || file.type || getFileExtension(file.name),
            storage: data.storage,
          });
        } else {
          resolve({
            success: false,
            message: data.message || `فشل رفع الملف إلى الخادم (رمز الاستجابة: ${xhr.status})`,
          });
        }
      } catch {
        resolve({
          success: false,
          message: 'حدث خطأ أثناء معالجة استجابة الخادم لرفع الملف.',
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        message: 'انقطع الاتصال بالخادم أثناء رفع الملف. يرجى التحقق من الشبكة وإعادة المحاولة.',
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        message: 'تم إلغاء عملية رفع الملف.',
      });
    });

    xhr.open('POST', '/api/upload');
    const headers = getAuthHeaders({ isFormData: true });
    for (const [key, value] of Object.entries(headers)) {
      if (key && value) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.send(formData);
  });
}

/**
 * Returns safe URL for viewing files inline (using backend proxy to bypass iframe/CORS issues)
 */
export function getFileViewUrl(url: string, name?: string): string {
  if (!url) return '';
  return `/api/files/view?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || '')}`;
}

/**
 * Returns safe URL for downloading files with proper Content-Disposition header
 */
export function getFileDownloadUrl(url: string, name?: string): string {
  if (!url) return '';
  return `/api/files/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || '')}`;
}

/**
 * Checks if the file can be previewed directly in browser (PDF, images, text)
 */
export function canPreviewInline(filenameOrUrl: string): boolean {
  if (!filenameOrUrl) return false;
  const lower = filenameOrUrl.toLowerCase();
  return (
    lower.includes('.pdf') ||
    lower.includes('.png') ||
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.webp') ||
    lower.includes('.gif') ||
    lower.includes('.svg') ||
    lower.includes('.txt')
  );
}

/**
 * Safely downloads a file by fetching blob or using download proxy
 */
export async function downloadFileSafely(url: string, filename?: string): Promise<void> {
  const downloadUrl = getFileDownloadUrl(url, filename);
  const safeName = filename || 'document';

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.warn('[Download] Blob download failed, falling back to direct navigation:', err);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.target = '_blank';
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

