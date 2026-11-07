import React, { useState, useRef } from 'react';
import { X, Upload, Images, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useNews } from '../context/NewsContext';
import { fileToDataUrl } from '../utils/storage';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, submitPhotoAlbum, addToast } = useNews();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverageDate, setCoverageDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('المدينة الجامعية - جامعة القصيم');
  const [coverImage, setCoverImage] = useState('');
  const [images, setImages] = useState<{ id: string; url: string; caption?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const url = await fileToDataUrl(e.target.files[0]);
        setCoverImage(url);
        addToast('info', 'صورة الغلاف', 'تم رفع غلاف الألبوم من جهازك');
      } catch {
        addToast('error', 'فشل الرفع', 'تعذر تحميل صورة الغلاف');
      }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const fileList = Array.from(e.target.files) as File[];
        const promises = fileList.map(async (file: File) => ({
          id: 'img-' + Math.random().toString(36).substring(2, 9),
          url: await fileToDataUrl(file),
          caption: file.name.replace(/\.[^/.]+$/, ''),
        }));
        const uploaded = await Promise.all(promises);
        setImages((prev) => [...prev, ...uploaded]);
        if (!coverImage && uploaded[0]) {
          setCoverImage(uploaded[0].url);
        }
        addToast('info', 'تم رفع الصور', `تمت إضافة ${uploaded.length} صور للألبوم`);
      } catch {
        addToast('error', 'فشل الرفع', 'تعذر رفع الصور من الجهاز');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!title.trim()) {
      addToast('warning', 'حقل مطلوب', 'يرجى كتابة عنوان لألبوم الصور');
      return;
    }
    if (!coverImage) {
      addToast('warning', 'غلاف مطلوب', 'يرجى رفع غلاف أو صور للألبوم');
      return;
    }

    setIsLoading(true);
    try {
      await submitPhotoAlbum({
        title,
        description,
        coverImage,
        images: images.length > 0 ? images : [{ id: 'img-1', url: coverImage, caption: title }],
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        coverageDate,
        location,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      addToast('error', 'خطأ', 'حدث خطأ أثناء حفظ الألبوم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-6">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <Images className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-cairo text-slate-900 dark:text-white">
              إنشاء ألبوم صور جديد
            </h3>
            <p className="text-xs text-slate-500 font-tajawal">
              توثيق الفعاليات والأنشطة الجامعية بعدسة الطلاب
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم الألبوم الصحفي *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تغطية مصورة لفعاليات اليوم الوطني بالحرم الجامعي"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ التغطية
              </label>
              <input
                type="date"
                value={coverageDate}
                onChange={(e) => setCoverageDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                موقع الفعالية
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="المدينة الجامعية، بهو المؤتمرات..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              وصف التغطية الفوتوغرافية
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن مناسبة التغطية الفوتوغرافية..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00838f] focus:outline-none resize-none"
            />
          </div>

          {/* Cover image upload */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">صورة غلاف الألبوم الرئيسية *</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">اختر صورة بارزة من جهازك</p>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00838f] text-white hover:bg-[#00707a] cursor-pointer"
              >
                رفع الغلاف
              </button>
            </div>
            {coverImage && (
              <div className="mt-2 w-full h-32 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                <img src={coverImage} alt="غلاف الألبوم" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Gallery images upload from device */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">صور الألبوم (رفع متعدد من الجهاز)</p>
                <p className="text-[11px] text-slate-500">يمكنك اختيار عدة صور دفعة واحدة</p>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صور</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {images.map((img, i) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300">
                    <img src={img.url} alt={`صورة ${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Images className="w-4 h-4" />
                <span>نشر ألبوم الصور ({images.length} صور)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
