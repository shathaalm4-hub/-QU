/**
 * Utility functions for detecting, parsing, and normalizing video URLs
 * Supports YouTube (standard watch, short youtu.be, shorts, embeds), Vimeo, and direct video files.
 */
import { getAuthHeaders } from '../context/NewsContext';

export interface ParsedVideo {
  isEmbed: boolean;
  isEmbeddable: boolean;
  isDirectVideo: boolean;
  platform: 'youtube' | 'vimeo' | 'direct';
  type: 'youtube' | 'vimeo' | 'direct';
  embedUrl: string;
  directUrl: string;
  effectiveUrl: string;
  videoId?: string;
}

export function parseVideoUrl(rawUrl?: string | null): ParsedVideo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isEmbed: false,
      isEmbeddable: false,
      isDirectVideo: false,
      platform: 'direct',
      type: 'direct',
      directUrl: '',
      embedUrl: '',
      effectiveUrl: '',
    };
  }

  const url = rawUrl.trim();

  // 1. YouTube standard watch (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
  const ytWatchMatch = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (ytWatchMatch && ytWatchMatch[1]) {
    const videoId = ytWatchMatch[1];
    const embed = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    return {
      isEmbed: true,
      isEmbeddable: true,
      isDirectVideo: false,
      platform: 'youtube',
      type: 'youtube',
      videoId,
      embedUrl: embed,
      directUrl: url,
      effectiveUrl: embed,
    };
  }

  // 2. YouTube short link (e.g., https://youtu.be/VIDEO_ID)
  const ytShortMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (ytShortMatch && ytShortMatch[1]) {
    const videoId = ytShortMatch[1];
    const embed = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    return {
      isEmbed: true,
      isEmbeddable: true,
      isDirectVideo: false,
      platform: 'youtube',
      type: 'youtube',
      videoId,
      embedUrl: embed,
      directUrl: url,
      effectiveUrl: embed,
    };
  }

  // 3. YouTube Shorts (e.g., https://www.youtube.com/shorts/VIDEO_ID)
  const ytShortsMatch = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    const videoId = ytShortsMatch[1];
    const embed = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    return {
      isEmbed: true,
      isEmbeddable: true,
      isDirectVideo: false,
      platform: 'youtube',
      type: 'youtube',
      videoId,
      embedUrl: embed,
      directUrl: url,
      effectiveUrl: embed,
    };
  }

  // 4. YouTube already embed (e.g., https://www.youtube.com/embed/VIDEO_ID)
  const ytEmbedMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (ytEmbedMatch && ytEmbedMatch[1]) {
    return {
      isEmbed: true,
      isEmbeddable: true,
      isDirectVideo: false,
      platform: 'youtube',
      type: 'youtube',
      videoId: ytEmbedMatch[1],
      embedUrl: url,
      directUrl: url,
      effectiveUrl: url,
    };
  }

  // 5. Vimeo (e.g., https://vimeo.com/123456789)
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[3] || vimeoMatch[2];
    if (videoId) {
      const embed = `https://player.vimeo.com/video/${videoId}`;
      return {
        isEmbed: true,
        isEmbeddable: true,
        isDirectVideo: false,
        platform: 'vimeo',
        type: 'vimeo',
        videoId,
        embedUrl: embed,
        directUrl: url,
        effectiveUrl: embed,
      };
    }
  }

  // 6. Direct video or local upload (MP4, WebM, MOV, Supabase Storage, /uploads/...)
  return {
    isEmbed: false,
    isEmbeddable: false,
    isDirectVideo: true,
    platform: 'direct',
    type: 'direct',
    directUrl: url,
    embedUrl: url,
    effectiveUrl: url,
  };
}

export function isEmbeddableVideo(url?: string | null): boolean {
  if (!url) return false;
  const parsed = parseVideoUrl(url);
  return parsed.isEmbed;
}

export function getNormalizedVideoUrl(url?: string | null): string {
  if (!url) return '';
  const parsed = parseVideoUrl(url);
  if (parsed.isEmbed && parsed.embedUrl) {
    return parsed.embedUrl;
  }
  return parsed.directUrl || url;
}

/**
 * Uploads media file to /api/upload using XMLHttpRequest to provide real-time progress updates
 */
export function uploadMediaWithProgress(
  file: File,
  bucket: 'news-images' | 'avatars' | 'attachments' = 'news-images',
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; url?: string; message?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
          resolve({ success: true, url: data.url });
        } else {
          resolve({
            success: false,
            message: data.message || `فشل رفع الملف (رمز الخطأ: ${xhr.status})`,
          });
        }
      } catch {
        resolve({
          success: false,
          message: 'استجابة غير متوقعة من خادم الرفع. يرجى إعادة المحاولة.',
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        message: 'انقطع الاتصال بالخادم أثناء رفع الملف. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.',
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        message: 'تم إلغاء عملية الرفع من قبل المستخدم.',
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
