import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center" dir="rtl">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-7" />
            </div>

            <h2 className="text-xl font-bold text-foreground">
              {this.props.fallbackTitle || 'عذراً، حدث خطأ غير متوقع أثناء عرض المادة الصحفية'}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              {this.props.fallbackMessage ||
                'نعتذر عن هذا الخلل المؤقت. يمكنك تحديث الصفحة أو العودة إلى قائمة الأخبار لتصفح المواد الصحفية الأخرى.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-brand-foreground shadow-xs hover:bg-brand/90 transition-colors cursor-pointer"
              >
                <RotateCcw className="size-4" />
                <span>إعادة المحاولة</span>
              </button>

              {this.props.onReset && (
                <button
                  onClick={this.props.onReset}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-2.5 text-xs sm:text-sm font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <ArrowRight className="size-4" />
                  <span>العودة للأخبار</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
