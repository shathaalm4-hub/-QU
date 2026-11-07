import React, { useState, useEffect } from 'react';
import { Play, Images, Eye, X, Plus, RefreshCw, Edit3 } from 'lucide-react';
import { NewsProvider, useNews } from './context/NewsContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageHeader } from './components/PageHeader';
import { EmptyState } from './components/EmptyState';
import { ToastContainer } from './components/ToastContainer';
import { LoginModal } from './components/LoginModal';
import { JoinJournalistModal } from './components/JoinJournalistModal';
import { CreateArticleModal } from './components/CreateArticleModal';
import { CreateVideoModal } from './components/CreateVideoModal';
import { CreateAlbumModal } from './components/CreateAlbumModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UniversalVideoPlayer } from './components/UniversalVideoPlayer';

// Pages
import { Homepage } from './pages/Homepage';
import { NewsListPage } from './pages/NewsListPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { JournalistsDirectoryPage } from './pages/JournalistsDirectoryPage';
import { JournalistPortfolioPage } from './pages/JournalistPortfolioPage';
import { JournalistDashboard } from './pages/JournalistDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { FullStoryPage } from './pages/FullStoryPage';
import { AcademyPage } from './pages/AcademyPage';
import { ArchivePage } from './pages/ArchivePage';

import { Article, VideoReport, PhotoAlbum } from './types';
import { logTrace } from './lib/traceLogger';

function MainAppContent() {
  const { currentUser, articles, videoReports, photoAlbums, isSearchOpen, setIsSearchOpen, syncVideoReports } = useNews();
  const [isSyncingVideos, setIsSyncingVideos] = useState(false);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedJournalistId, setSelectedJournalistId] = useState<string | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [videoToEdit, setVideoToEdit] = useState<VideoReport | null>(null);
  const [newsFilterCategory, setNewsFilterCategory] = useState<string>('الكل');
  const [newsFilterKind, setNewsFilterKind] = useState<string>('all');

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateArticleOpen, setIsCreateArticleOpen] = useState(false);
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);

  const modalKey = articleToEdit ? `edit-${articleToEdit.id}` : (isCreateArticleOpen ? 'create-new' : 'closed');
  logTrace('APP_MAIN_CONTENT_RENDER', {
    currentTab,
    isCreateArticleOpen,
    articleToEditId: articleToEdit?.id || null,
    modalKey,
  });

  // Media view modals
  const [selectedVideo, setSelectedVideo] = useState<VideoReport | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);

  // Navigation Handlers
  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setCurrentTab('article-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectJournalist = (id: string) => {
    setSelectedJournalistId(id);
    setCurrentTab('journalist-portfolio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditArticle = (article: Article) => {
    setArticleToEdit(article);
    setIsCreateArticleOpen(true);
  };

  const handleEditVideo = (video: VideoReport) => {
    setVideoToEdit(video);
    setIsCreateVideoOpen(true);
  };

  const handleTabChange = (tab: string, cat?: string, kind?: string) => {
    if (cat !== undefined) setNewsFilterCategory(cat);
    if (kind !== undefined) setNewsFilterKind(kind);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-sync video reports with Supabase when visiting the videos tab
  useEffect(() => {
    if (currentTab === 'videos') {
      syncVideoReports();
    }
  }, [currentTab, syncVideoReports]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-cairo selection:bg-brand selection:text-brand-foreground transition-colors duration-200" dir="rtl">
      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Main Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenJoin={() => setIsJoinOpen(true)}
        onOpenCreateArticle={() => {
          setArticleToEdit(null);
          setIsCreateArticleOpen(true);
        }}
      />

      {/* Dynamic Page Views */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <Homepage
            onSelectArticle={handleSelectArticle}
            onNavigateTab={handleTabChange}
            onOpenJoin={() => setIsJoinOpen(true)}
            onOpenCreateArticle={() => {
              setArticleToEdit(null);
              setIsCreateArticleOpen(true);
            }}
            onSelectJournalist={handleSelectJournalist}
            onEditArticle={handleEditArticle}
            onEditVideo={handleEditVideo}
          />
        )}

        {currentTab === 'news' && (
          <NewsListPage
            onSelectArticle={handleSelectArticle}
            onOpenJoin={() => setIsJoinOpen(true)}
            onEditArticle={handleEditArticle}
            initialCategory={newsFilterCategory}
            initialKind={newsFilterKind}
          />
        )}

        {/* Dedicated Video Reports Page */}
        {currentTab === 'videos' && (
          <div>
            <PageHeader
              title="تقارير مرئية"
              subtitle="استديو صحيفة QU: تغطيات مرئية، لقاءات مصورة، وتقارير ميدانية بعدسة الطلاب"
            />
            <div className="mx-auto max-w-7xl px-4 py-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground">
                    إجمالي التقارير المرئية: {videoReports.length}
                  </span>
                  <button
                    onClick={async () => {
                      setIsSyncingVideos(true);
                      await syncVideoReports();
                      setIsSyncingVideos(false);
                    }}
                    disabled={isSyncingVideos}
                    title="تحديث ومزامنة التقارير المرئية مع السحابة"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${isSyncingVideos ? 'animate-spin text-brand' : ''}`} />
                    <span>{isSyncingVideos ? 'جارِ التحديث...' : 'مزامنة السحابة'}</span>
                  </button>
                </div>
                {currentUser && (
                  <button
                    onClick={() => setIsCreateVideoOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-2 text-xs font-bold hover:bg-brand/90 transition-colors cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>رفع تقرير مرئي جديد</span>
                  </button>
                )}
              </div>

              {videoReports.length === 0 ? (
                <EmptyState
                  title="لا توجد تقارير مرئية حالياً"
                  description="كن أول من ينشر تقريراً مرئياً مصوراً في صحيفة QU!"
                  onCtaClick={() => setIsCreateVideoOpen(true)}
                />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {videoReports.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className="surface-card group overflow-hidden cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={video.thumbnailUrl && video.thumbnailUrl.trim() ? video.thumbnailUrl : 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80'}
                          alt={video.title}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform group-hover:scale-110">
                            <Play className="size-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                          {video.duration || '02:45'}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="kicker">فيديو</span>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
                          {video.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {video.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (video.authorId) {
                                handleSelectJournalist(video.authorId);
                              }
                            }}
                            className="hover:text-brand hover:underline cursor-pointer text-right font-medium"
                          >
                            {video.authorName}
                            {video.coAuthors && video.coAuthors.length > 0 && (
                              <span className="text-[11px] text-purple-600 dark:text-purple-400 mr-1">
                                (بمشاركة {video.coAuthors.map((c) => c.name).join('، ')})
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            {currentUser && (currentUser.role === 'admin' || currentUser.id === video.authorId || (currentUser.studentId && currentUser.studentId === video.authorStudentId) || video.coAuthorIds?.includes(currentUser.id)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditVideo(video);
                                }}
                                className="p-1 rounded-md bg-secondary hover:bg-muted text-amber-600 transition-colors cursor-pointer"
                                title="تعديل التقرير المرئي"
                              >
                                <Edit3 className="size-3.5" />
                              </button>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="size-3.5" />
                              {video.viewsCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dedicated Photo Albums Page */}
        {currentTab === 'albums' && (
          <div>
            <PageHeader
              title="ألبومات الصور"
              subtitle="معارض الصور والتغطيات الميدانية لفعاليات الجامعة بعدسة طلاب قسم الإعلام والاتصال"
            />
            <div className="mx-auto max-w-7xl px-4 py-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-bold text-muted-foreground">
                  إجمالي ألبومات الصور: {photoAlbums.length}
                </span>
                {currentUser && (
                  <button
                    onClick={() => setIsCreateAlbumOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-2 text-xs font-bold hover:bg-brand/90 transition-colors cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>إنشاء ألبوم صور جديد</span>
                  </button>
                )}
              </div>

              {photoAlbums.length === 0 ? (
                <EmptyState
                  title="لا توجد ألبومات صور حالياً"
                  description="كن أول من ينشر ألبوماً مصوراً يوثق فعاليات الجامعة!"
                  onCtaClick={() => setIsCreateAlbumOpen(true)}
                />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photoAlbums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbum(album)}
                      className="surface-card group overflow-hidden cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={album.coverImage && album.coverImage.trim() ? album.coverImage : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                          alt={album.title}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                          <Images className="size-3.5" />
                          {album.images?.length || 0} صورة
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="kicker">ألبوم مصور</span>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-7 headline-link text-foreground">
                          {album.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {album.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <span>{album.photographerName}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3.5" />
                            {album.viewsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'journalists' && (
          <JournalistsDirectoryPage
            onSelectJournalist={handleSelectJournalist}
            onOpenJoin={() => setIsJoinOpen(true)}
          />
        )}

        {currentTab === 'full-story' && (
          <FullStoryPage
            onSelectArticle={handleSelectArticle}
            onBack={() => handleTabChange('home')}
          />
        )}

        {currentTab === 'academy' && (
          <AcademyPage onBack={() => handleTabChange('home')} />
        )}

        {currentTab === 'archive' && (
          <ArchivePage
            onSelectArticle={handleSelectArticle}
            onEditArticle={handleEditArticle}
            onBack={() => handleTabChange('home')}
          />
        )}

        {currentTab === 'article-detail' && (
          <ErrorBoundary
            fallbackTitle="تعذر عرض تفاصيل المادة الصحفية"
            fallbackMessage="حدث خطأ غير متوقع أثناء معالجة بيانات الخبر. نعتذر عن هذا الخلل المؤقت."
            onReset={() => handleTabChange('news')}
          >
            <ArticleDetailPage
              article={selectedArticle ? (articles.find((a) => a.id === selectedArticle.id) || selectedArticle) : null}
              onBack={() => handleTabChange('news')}
              onSelectArticle={handleSelectArticle}
              onSelectJournalist={handleSelectJournalist}
              onEditArticle={handleEditArticle}
            />
          </ErrorBoundary>
        )}

        {currentTab === 'journalist-portfolio' && selectedJournalistId && (
          <JournalistPortfolioPage
            journalistId={selectedJournalistId}
            onBack={() => handleTabChange('journalists')}
            onSelectArticle={handleSelectArticle}
            onEditArticle={handleEditArticle}
            onEditVideo={handleEditVideo}
          />
        )}

        {currentTab === 'journalist-dashboard' && (
          <JournalistDashboard
            onOpenCreateArticle={() => {
              setArticleToEdit(null);
              setIsCreateArticleOpen(true);
            }}
            onOpenCreateVideo={() => {
              setVideoToEdit(null);
              setIsCreateVideoOpen(true);
            }}
            onOpenCreateAlbum={() => setIsCreateAlbumOpen(true)}
            onEditArticle={handleEditArticle}
            onSelectArticle={handleSelectArticle}
            onEditVideo={handleEditVideo}
          />
        )}

        {currentTab === 'admin-dashboard' && (
          <AdminDashboard
            onSelectArticle={handleSelectArticle}
            onEditArticle={handleEditArticle}
          />
        )}
      </main>

      {/* Mandatory Official Footer */}
      <Footer
        setCurrentTab={handleTabChange}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenJoin={() => setIsJoinOpen(true)}
      />

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(role) => {
          if (role === 'admin' || role === 'editor') {
            handleTabChange('admin-dashboard');
          } else {
            handleTabChange('journalist-dashboard');
          }
        }}
        onSwitchToJoin={() => setIsJoinOpen(true)}
      />

      <JoinJournalistModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={() => {
          // Toast is shown by modal
        }}
      />

      {isCreateArticleOpen && (
        <CreateArticleModal
          key={articleToEdit ? `edit-${articleToEdit.id}` : 'create-new'}
          isOpen={isCreateArticleOpen}
          onClose={() => {
            setIsCreateArticleOpen(false);
            setArticleToEdit(null);
          }}
          existingArticle={articleToEdit}
          onSuccess={() => {
            if (currentTab === 'article-detail') {
              if (articleToEdit) {
                const fresh = articles.find((a) => a.id === articleToEdit.id);
                if (fresh) setSelectedArticle(fresh);
              }
            } else if (currentUser?.role === 'journalist') {
              handleTabChange('journalist-dashboard');
            } else {
              handleTabChange('admin-dashboard');
            }
          }}
        />
      )}

      <CreateVideoModal
        isOpen={isCreateVideoOpen}
        videoToEdit={videoToEdit}
        onClose={() => {
          setIsCreateVideoOpen(false);
          setVideoToEdit(null);
        }}
        onSuccess={() => {
          handleTabChange('videos');
        }}
      />

      <CreateAlbumModal
        isOpen={isCreateAlbumOpen}
        onClose={() => setIsCreateAlbumOpen(false)}
        onSuccess={() => {
          handleTabChange('albums');
        }}
      />

      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={handleSelectArticle}
        onSelectJournalist={handleSelectJournalist}
      />

      {/* Video Modal Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden border border-border shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-foreground line-clamp-1">{selectedVideo.title}</h3>
                {currentUser && (
                  currentUser.role === 'admin' ||
                  currentUser.role === 'editor' ||
                  selectedVideo.authorId === currentUser.id ||
                  selectedVideo.authorName === currentUser.name ||
                  (selectedVideo.coAuthors && selectedVideo.coAuthors.some((ca) => ca.journalistId === currentUser.id || ca.id === currentUser.id || ca.name === currentUser.name))
                ) && (
                  <button
                    onClick={() => {
                      const vid = selectedVideo;
                      setSelectedVideo(null);
                      handleEditVideo(vid);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer shrink-0"
                    title="تعديل بيانات التقرير المرئي"
                  >
                    <Edit3 className="size-3.5" />
                    <span>تعديل التقرير</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <UniversalVideoPlayer
                url={selectedVideo.videoUrl}
                title={selectedVideo.title}
                autoPlay={true}
              />
            </div>
            <div className="p-4 text-sm text-muted-foreground">
              {selectedVideo.description}
            </div>
          </div>
        </div>
      )}

      {/* Photo Album Modal Viewer */}
      {selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden border border-border shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">{selectedAlbum.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedAlbum.photographerName}</p>
              </div>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedAlbum.images?.map((img, idx) => (
                <div key={idx} className="space-y-1">
                  <img
                    src={img.url && img.url.trim() ? img.url : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&q=80'}
                    alt={img.caption || selectedAlbum.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  {img.caption && (
                    <p className="text-xs text-muted-foreground text-center">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <NewsProvider>
      <MainAppContent />
    </NewsProvider>
  );
}
