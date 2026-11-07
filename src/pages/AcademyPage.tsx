import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Mic, 
  Camera, 
  Video, 
  Scale, 
  ArrowLeft,
  X,
  CheckCircle
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

interface AcademyPageProps {
  onBack?: () => void;
}

interface GuideModule {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  fullContent: string[];
  tips: string[];
}

export const AcademyPage: React.FC<AcademyPageProps> = () => {
  const [selectedModule, setSelectedModule] = useState<GuideModule | null>(null);

  const modules: GuideModule[] = [
    {
      id: 'news-writing',
      title: 'كتابة الخبر الصحفي',
      desc: 'قواعد الهرم المقلوب، صياغة العناوين الجذابة والدقيقة، والإجابة على الأسئلة الستة (من، ماذا، متى، أين، لماذا، كيف).',
      icon: FileText,
      fullContent: [
        'المقدمة (الاستهلال): يجب أن تتضمن أهم تفصيلة في الخبر دون غموض، مع التركيز على العنصر الأكثر إثارة لاهتمام القارئ.',
        'جسم الخبر: يضم التفاصيل التفسيرية، التصريحات المباشرة للمسؤولين أو شهود العيان مرتبة تنازلياً حسب الأهمية.',
        'الخاتمة: معلومات خلفية تضع الحدث في سياقه العام أو توضح الخطوة القادمة.',
      ],
      tips: [
        'تجنب استخدام لغة الرأي أو الأحكام الذاتية مثل: (في حفل مهيب، في خطوة رائعة).',
        'التأكد من دقة الأرقام والأسماء والمناصب الرسمية.',
        'الفقرات قصيرة لا تتجاوز 3 إلى 4 أسطر لتسهيل القراءة على الشاشات.',
      ],
    },
    {
      id: 'source-verification',
      title: 'التحقق من المصادر',
      desc: 'آليات التثبت من صحة الأخبار والبيانات، فحص الصور والفيديوهات، ومكافحة الشائعات في البيئة الجامعية.',
      icon: ShieldCheck,
      fullContent: [
        'القاعدة الذهبية: التحقق من مصدرين مستقلين على الأقل قبل النشر إذا لم يكن المصدر رسمياً ومعلناً.',
        'فحص وسائط التواصل: استخدام البحث العكسي عن الصور للتأكد من عدم إعادة تدوير صور قديمة في سياقات مضللة.',
        'المصادر المجهولة: لا يُعتمد المصدر المجهول إلا بموافقة هيئة التحرير وفي حالات محددة مشروطة بوجود أدلة قطعية.',
      ],
      tips: [
        'لا تعتمد على لقطات الشاشة (Screenshots) دون التأكد من الحساب الأصلي والرابط الحي.',
        'احتفظ بسجل التواصل مع المصادر للرجوع إليه عند الضرورة القانونية أو المهنية.',
      ],
    },
    {
      id: 'interviews',
      title: 'إعداد المقابلات الصحفية',
      desc: 'مهارات الحوار، صياغة الأسئلة الذكية، استدراج المعلومة، وفنون تسجيل وتفريغ المقابلات الميدانية.',
      icon: Mic,
      fullContent: [
        'الإعداد المسبق: اقرأ جيداً عن الضيف ومواقفه وتصريحاته السابقة قبل الجلوس معه.',
        'الأسئلة المفتوحة: تجنب الأسئلة المغلقة التي تكون إجابتها بنعم أو لا، واطرح أسئلة تبدأ بـ (كيف، لماذا، ما أسباب).',
        'الإنصات النشط: ركز في كلام الضيف واستخرج أسئلة تعقيبية من إجاباته بدلاً من التقيد الجامد بقائمة الأسئلة.',
      ],
      tips: [
        'استأذن الضيف قبل بدء التسجيل الصوتي أو المرئي دائماً.',
        'أعد ترتيب تفريغ المقابلة بذكاء دون الإخلال بالسياق الحقيقي لحديث الضيف.',
      ],
    },
    {
      id: 'photojournalism',
      title: 'التصوير الصحفي',
      desc: 'قواعد التكوين البصري، زوايا الالتقاط التعبيرية، كتابة التعليق المصور، وأخلاقيات نشر الوجوه والخصوصية.',
      icon: Camera,
      fullContent: [
        'قاعدة الأثلاث: ضع موضوع الصورة في نقاط التقاطع لخلق توازن بصري ديناميكي وجذاب.',
        'التقاط اللحظة: ابحث عن الانفعالات الطبيعية وحركة المتحدثين بدلاً من الصور الرسمية المصطنعة.',
        'التعليق المصور (Caption): يجب أن يوضح من في الصورة، ماذا يفعلون، أين ومتى مع ذكر اسم المصور.',
      ],
      tips: [
        'يحظر تماماً التعديل على الصور بالفوتوشوب بما يغير الحقيقة أو يحذف عناصر أصلية.',
        'احترام خصوصية الطلاب والطالبات والحصول على موافقة في التغطيات المغلقة.',
      ],
    },
    {
      id: 'video-reports',
      title: 'التقرير المرئي',
      desc: 'أسس المونتاج السريع، تقنيات الـ Reels والـ TikTok الإخباري، والتحكم بجودة الصوت والإضاءة.',
      icon: Video,
      fullContent: [
        'الثواني الثلاث الأولى (Hook): ابدأ بأقوى مشهد أو تساؤل يحبس أنفاس المشاهد ويمنعه من التمرير.',
        'جودة الصوت: الصوت السيئ يفسد أجمل صورة؛ استخدم مايكروفون خارجي وتحقق من عزل الضوضاء.',
        'الإيقاع والمونتاج: قص الصمت والفراغات واعتمد على اللقطات التوضيحية (B-roll) لدعم الكلام.',
      ],
      tips: [
        'أضف الترجمة والنصوص التوضيحية (Subtitles) لأن معظم المشاهدين يتابعون بدون صوت.',
        'اجعل مدة الفيديو بين 60 إلى 90 ثانية لتقارير التواصل الاجتماعي.',
      ],
    },
    {
      id: 'ethics',
      title: 'أخلاقيات المهنة وميثاق الشرف',
      desc: 'الأمانة الصحفية، النزاهة والحياد، تجنب التشهير أو انتهاك الخصوصية، وحقوق الملكية الفكرية والاقتباس.',
      icon: Scale,
      fullContent: [
        'الدقة قبل السبق: التأكد من صحة المعلومة أهم بكثير من نشرها قبل الآخرين مع وجود خطأ.',
        'حق الرد: إتاحة الفرصة المتكافئة لأي طرف تم توجيه نقد أو اتهام له في مادة استقصائية.',
        'الملكية الفكرية: يمنع منعاً باتاً نقل أي فقرة أو معلومة دون الإشارة الصريحة للمصدر الأصلي.',
      ],
      tips: [
        'صحيفة QU تلتزم بحرية التعبير المسؤولة والداعمة للبيئة الأكاديمية والوطنية.',
        'التصحيح والاعتذار الفوري عند وقوع أي خطأ غير مقصود في النشر.',
      ],
    },
  ];

  return (
    <div dir="rtl">
      <PageHeader
        title="أكاديمية الصحفي"
        subtitle="أدلة إرشادية ومعايير مهنية لطلاب قسم الإعلام والاتصال"
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="surface-card p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="size-11 rounded-lg bg-brand-soft text-brand flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedModule(mod)}
                  className="mt-6 text-xs font-bold text-brand hover:underline flex items-center gap-1 self-start cursor-pointer"
                >
                  <span>قراءة الدليل الكامل</span>
                  <ArrowLeft className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide Detail Modal */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-card rounded-xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                  <selectedModule.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedModule.title}</h3>
                  <span className="text-xs text-muted-foreground">دليل التحرير الأكاديمي</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3">الخطوات والمحددات الرئيسية</h4>
                <div className="space-y-3">
                  {selectedModule.fullContent.map((paragraph, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-accent/40 border border-border/60 text-xs text-foreground/90 leading-relaxed">
                      {paragraph}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-brand mb-3">وصايا ذهبية لهيئة التحرير</h4>
                <div className="space-y-2">
                  {selectedModule.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-accent/20 flex justify-end">
              <button
                onClick={() => setSelectedModule(null)}
                className="rounded-md bg-brand text-brand-foreground px-4 py-2 text-xs font-bold cursor-pointer"
              >
                فهمت المعيار، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
