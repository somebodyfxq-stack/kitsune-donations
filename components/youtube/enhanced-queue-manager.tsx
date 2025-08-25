"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

// =============================================
// TYPES & INTERFACES
// =============================================

interface QueueItem {
  id: string;
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  youtube_url: string;
  createdAt: string;
  status: 'pending' | 'playing' | 'completed' | 'skipped';
  addedAt: string;
}

interface QueueData {
  queue: QueueItem[];
  totalVideos: number;
  pendingVideos: number;
  playingVideos: number;
  completedVideos: number;
  statistics: {
    totalAmount: number;
    averageAmount: number;
    uniqueDonors: number;
  };
}

interface QueueFilters {
  status: 'all' | 'pending' | 'playing' | 'completed' | 'skipped';
  search: string;
  sortBy: 'createdAt' | 'amount' | 'nickname';
  sortOrder: 'asc' | 'desc';
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function EnhancedQueueManager() {
  const { data: session, status } = useSession();
  
  const [queueData, setQueueData] = useState<QueueData>({
    queue: [],
    totalVideos: 0,
    pendingVideos: 0,
    playingVideos: 0,
    completedVideos: 0,
    statistics: {
      totalAmount: 0,
      averageAmount: 0,
      uniqueDonors: 0,
    },
  });
  
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // =============================================
  // DATA FETCHING
  // =============================================

  const fetchQueue = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/youtube/queue", {
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch queue: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Calculate enhanced statistics
      const statistics = {
        totalAmount: data.queue.reduce((sum: number, item: QueueItem) => sum + item.amount, 0),
        averageAmount: data.queue.length > 0 ? 
          Math.round(data.queue.reduce((sum: number, item: QueueItem) => sum + item.amount, 0) / data.queue.length) : 0,
        uniqueDonors: new Set(data.queue.map((item: QueueItem) => item.nickname.toLowerCase())).size,
      };
      
      setQueueData({
        ...data,
        statistics
      });
    } catch (err) {
      console.error("Error fetching queue:", err);
      setError(err instanceof Error ? err.message : "Помилка завантаження черги");
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================
  // QUEUE ACTIONS
  // =============================================

  const performQueueAction = useCallback(async (
    action: 'stop' | 'skip' | 'restart',
    identifier: string,
    actionName: string
  ) => {
    try {
      setActionLoading(identifier);
      
      const statusMap = {
        'stop': 'completed',
        'skip': 'skipped',
        'restart': 'pending'
      };

      const response = await fetch("/api/youtube/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action,
          identifier,
          status: statusMap[action]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} video: ${response.status}`);
      }

      console.log(`✅ Video ${action}ed:`, identifier);
      
      // Refresh queue data immediately
      await fetchQueue();
      
    } catch (err) {
      console.error(`Error ${action}ing video:`, err);
      setError(`Помилка виконання дії: ${actionName}`);
    } finally {
      setActionLoading(null);
    }
  }, [fetchQueue]);

  const stopVideo = useCallback((identifier: string) => 
    performQueueAction('stop', identifier, 'зупинки'), [performQueueAction]);
    
  const skipVideo = useCallback((identifier: string) => 
    performQueueAction('skip', identifier, 'пропуску'), [performQueueAction]);
    
  const restartVideo = useCallback((identifier: string) => 
    performQueueAction('restart', identifier, 'перезапуску'), [performQueueAction]);

  const clearCompleted = useCallback(async () => {
    try {
      setActionLoading('clear-completed');
      
      const response = await fetch("/api/youtube/queue", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to clear completed: ${response.status}`);
      }

      const result = await response.json();
      console.log("🧹", result.message || "Завершені відео очищені");
      
      await fetchQueue();
    } catch (err) {
      console.error("Error clearing completed:", err);
      setError("Помилка очищення завершених відео");
    } finally {
      setActionLoading(null);
    }
  }, [fetchQueue]);

  // =============================================
  // FILTERING & SORTING
  // =============================================

  const filteredAndSortedQueue = useMemo(() => {
    let filtered = queueData.queue;

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(video => video.status === filters.status);
    }

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(video => 
        video.nickname.toLowerCase().includes(searchTerm) ||
        video.message.toLowerCase().includes(searchTerm) ||
        video.identifier.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'nickname':
          comparison = a.nickname.localeCompare(b.nickname);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [queueData.queue, filters]);

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  const getVideoId = useCallback((url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }, []);

  const getThumbnailUrl = useCallback((url: string): string | null => {
    const videoId = getVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  }, [getVideoId]);

  const timeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "щойно";
    if (diffMins < 60) return `${diffMins} хв тому`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} год тому`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн тому`;
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const badges = {
      'completed': { emoji: '✓', text: 'Завершено', color: 'green' },
      'playing': { emoji: '▶️', text: 'Відтворюється', color: 'blue' },
      'skipped': { emoji: '⏭️', text: 'Пропущено', color: 'red' },
      'pending': { emoji: '⏳', text: 'Очікує', color: 'yellow' }
    };
    
    return badges[status as keyof typeof badges] || badges.pending;
  }, []);

  // =============================================
  // AUTO-REFRESH
  // =============================================

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // =============================================
  // AUTHENTICATION & LOADING GUARDS
  // =============================================

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Завантаження...</div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg">Завантаження черги...</div>
        </div>
      </div>
    );
  }

  // =============================================
  // RENDER
  // =============================================

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold leading-tight md:text-4xl pb-1">
            🎬 Розширена черга YouTube відео
          </h1>
          <p className="text-neutral-300 mt-2">
            Професійне управління чергою відтворення замовлених відео
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="card p-6 mb-6">
            <div className="text-red-400 text-center flex items-center justify-center">
              <span className="mr-2">❌</span>
              {error}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {queueData.completedVideos > 0 && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-yellow-300 flex items-center">
                <span className="mr-2">🧹</span>
                У вас є {queueData.completedVideos} завершених відео в списку
              </div>
              <button
                onClick={clearCompleted}
                disabled={actionLoading === 'clear-completed'}
                className="btn-primary disabled:opacity-50"
              >
                {actionLoading === 'clear-completed' ? '⏳ Очищення...' : '🧹 Очистити завершені'}
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-gradient mb-2">{queueData.totalVideos}</div>
            <div className="text-neutral-400 text-sm">Всього відео</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{queueData.pendingVideos}</div>
            <div className="text-neutral-400 text-sm">Очікують</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {queueData.statistics.totalAmount}₴
            </div>
            <div className="text-neutral-400 text-sm">Загальна сума</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {queueData.statistics.uniqueDonors}
            </div>
            <div className="text-neutral-400 text-sm">Унікальних донерів</div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Статус
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  status: e.target.value as QueueFilters['status']
                }))}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="all">Всі відео</option>
                <option value="pending">Очікують</option>
                <option value="playing">Відтворюються</option>
                <option value="completed">Завершені</option>
                <option value="skipped">Пропущені</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Пошук
              </label>
              <input
                type="text"
                placeholder="Нікнейм, повідомлення..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Сортування
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  sortBy: e.target.value as QueueFilters['sortBy']
                }))}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="createdAt">За часом</option>
                <option value="amount">За сумою</option>
                <option value="nickname">За нікнеймом</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Порядок
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: e.target.value as QueueFilters['sortOrder']
                }))}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="desc">За спаданням</option>
                <option value="asc">За зростанням</option>
              </select>
            </div>
          </div>
        </div>

        {/* Queue List */}
        <div className="card">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-100 flex items-center">
                <span className="mr-2">📋</span>
                YouTube відео ({filteredAndSortedQueue.length})
              </h2>
              {filteredAndSortedQueue.length > 0 && filters.search && (
                <div className="text-sm text-neutral-400">
                  Знайдено {filteredAndSortedQueue.length} з {queueData.totalVideos}
                </div>
              )}
            </div>
          </div>

          {filteredAndSortedQueue.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <div className="text-8xl mb-6">
                {filters.search || filters.status !== 'all' ? '🔍' : '🎬'}
              </div>
              <div className="text-xl font-medium mb-3 text-neutral-300">
                {filters.search || filters.status !== 'all' ? 'Нічого не знайдено' : 'Черга пуста'}
              </div>
              <div className="text-neutral-400">
                {filters.search || filters.status !== 'all' 
                  ? 'Спробуйте змінити фільтри пошуку'
                  : 'Очікуємо на замовлення YouTube відео від глядачів'
                }
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredAndSortedQueue.map((video, index) => {
                const badge = getStatusBadge(video.status);
                const isActionLoading = actionLoading === video.identifier;
                
                return (
                  <div 
                    key={video.id} 
                    className={`p-6 hover:bg-white/5 transition-colors ${
                      video.status === 'completed' || video.status === 'skipped' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-6">
                      
                      {/* Queue Position */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        video.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        video.status === 'playing' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        video.status === 'skipped' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                        'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                      }`}>
                        {badge.emoji}
                      </div>
                      
                      {/* Video Thumbnail */}
                      <img 
                        src={getThumbnailUrl(video.youtube_url) || "/placeholder.jpg"}
                        alt="Video thumbnail"
                        className="w-32 h-24 object-cover rounded-2xl flex-shrink-0 ring-1 ring-white/10"
                        loading="lazy"
                      />
                      
                      {/* Video Info */}
                      <div className="flex-1">
                        <div className="font-semibold text-neutral-100 text-lg mb-2 flex items-center flex-wrap">
                          <span>{video.nickname} • {video.amount}₴</span>
                          <span className={`ml-3 badge text-${badge.color}-400 ring-${badge.color}-500/20 bg-${badge.color}-500/10`}>
                            {badge.emoji} {badge.text}
                          </span>
                        </div>
                        
                        {video.message && (
                          <div className="text-neutral-300 mb-2">
                            {video.message}
                          </div>
                        )}
                        
                        <div className="text-sm text-neutral-400 mb-2">
                          Додано: {timeAgo(video.addedAt)} • ID: {video.identifier}
                        </div>
                        
                        <a 
                          href={video.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gradient-underline text-sm"
                        >
                          Відкрити на YouTube
                        </a>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 min-w-[120px]">
                        {video.status === 'pending' && (
                          <>
                            <button
                              onClick={() => stopVideo(video.identifier)}
                              disabled={isActionLoading}
                              className="btn-primary text-sm disabled:opacity-50"
                            >
                              {isActionLoading ? '⏳' : '⏹️'} Завершити
                            </button>
                            <button
                              onClick={() => skipVideo(video.identifier)}
                              disabled={isActionLoading}
                              className="btn-secondary text-sm disabled:opacity-50"
                            >
                              {isActionLoading ? '⏳' : '⏭️'} Пропустити
                            </button>
                          </>
                        )}
                        
                        {video.status === 'playing' && (
                          <button
                            onClick={() => stopVideo(video.identifier)}
                            disabled={isActionLoading}
                            className="btn-primary bg-red-600 hover:bg-red-700 text-sm disabled:opacity-50"
                          >
                            {isActionLoading ? '⏳' : '⏹️'} Зупинити
                          </button>
                        )}
                        
                        {(video.status === 'completed' || video.status === 'skipped') && (
                          <button
                            onClick={() => restartVideo(video.identifier)}
                            disabled={isActionLoading}
                            className="btn-secondary text-sm disabled:opacity-50"
                          >
                            {isActionLoading ? '⏳' : '🔄'} Перезапустити
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
