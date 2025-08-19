"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface YouTubeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => void;
  currentUrl: string;
}

export function YouTubeDialog({ isOpen, onClose, onAdd, currentUrl }: YouTubeDialogProps) {
  const [url, setUrl] = useState(currentUrl);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUrl(currentUrl);
      // Блокуємо прокрутку body коли діалог відкритий
      document.body.style.overflow = 'hidden';
    } else {
      // Відновлюємо прокрутку коли діалог закритий
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentUrl]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Закриття на Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen) return null;

  const handleAdd = () => {
    onAdd(url);
    onClose();
  };

  // Функція для отримання YouTube відео ID з URL
  const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(url);

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Dialog Content */}
      <div className="relative w-full max-w-lg mx-4 rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-6 shadow-2xl shadow-purple-900/20">
        {/* Header */}
        <div className="mb-6">
          <h2 className="title-gradient text-2xl font-extrabold">
            Додати YouTube відео
          </h2>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium mb-2 text-white">
              Посилання на YouTube відео
            </label>
            <div className="flex gap-2">
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 w-full rounded-2xl bg-white/5 px-5 py-3.5 text-neutral-100 placeholder-neutral-400 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-purple-400"
                placeholder="https://youtube.com/watch?v=..."
              />
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white shadow-lg shadow-fuchsia-900/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
              >
                Додати
              </button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="w-full aspect-video bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-700 relative overflow-hidden">
            {url && videoId ? (
              <>
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="YouTube відео"
                  className="w-full h-full object-cover rounded-lg absolute inset-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {/* Fallback SVG */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-neutral-600" fill="currentColor" viewBox="0 0 28.57 20">
                    <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" />
                    <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
                  </svg>
                </div>
              </>
            ) : (
              // Показуємо сірий логотип YouTube коли немає відео
              <svg className="w-16 h-16 text-neutral-600" fill="currentColor" viewBox="0 0 28.57 20">
                <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" />
                <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
              </svg>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
