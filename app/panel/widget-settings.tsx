"use client";

import { useState, useEffect } from "react";
import type { StatusData } from "./status-client";

interface WidgetSettingsProps {
  initial: StatusData;
}

export function WidgetSettings({ initial }: WidgetSettingsProps) {
  const [obsWidgetUrl, setObsWidgetUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showUrl, setShowUrl] = useState<boolean>(false);
  
  // YouTube налаштування
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(5);
  const [volume, setVolume] = useState<number>(50);
  const [showClipTitle, setShowClipTitle] = useState<boolean>(true);
  const [showDonorName, setShowDonorName] = useState<boolean>(true);
  const [minLikes, setMinLikes] = useState<number>(0);
  const [minViews, setMinViews] = useState<number>(0);
  const [minComments, setMinComments] = useState<number>(0);
  const [showImmediately, setShowImmediately] = useState<boolean>(false);

  // Генеруємо URL віджета тільки на клієнті для уникнення hydration помилки
  useEffect(() => {
    if (initial.obsWidgetToken && typeof window !== 'undefined') {
      // Невелика затримка для плавності
      const timer = setTimeout(() => {
        setObsWidgetUrl(`${window.location.origin}/obs/${initial.obsWidgetToken}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initial.obsWidgetToken]);

  // Завантажуємо існуючі налаштування YouTube при ініціалізації
  useEffect(() => {
    const loadYouTubeSettings = async () => {
      try {
        const response = await fetch('/api/youtube/settings');
        if (response.ok) {
          const data = await response.json();
          const settings = data.settings;
          
          setMaxDurationMinutes(settings.maxDurationMinutes);
          setVolume(settings.volume);
          setShowClipTitle(settings.showClipTitle);
          setShowDonorName(settings.showDonorName);
          setMinLikes(settings.minLikes);
          setMinViews(settings.minViews);
          setMinComments(settings.minComments);
          setShowImmediately(settings.showImmediately);
        }
      } catch (error) {
        console.error('Failed to load YouTube settings:', error);
      }
    };

    loadYouTubeSettings();
  }, []);

  const handleCopyUrl = async () => {
    if (obsWidgetUrl) {
      try {
        await navigator.clipboard.writeText(obsWidgetUrl);
        setCopySuccess(true);
        // Скидаємо стан через 2 секунди
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  const toggleUrlVisibility = () => {
    setShowUrl(!showUrl);
  };

  const getDisplayUrl = () => {
    if (!obsWidgetUrl) return 'Завантаження...';
    if (showUrl) return obsWidgetUrl;
    // Генеруємо точки рівно по довжині URL
    return '•'.repeat(obsWidgetUrl.length);
  };

  if (!initial.obsWidgetToken) {
    return (
      <div className="card p-6 md:p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Налаштування віджету</h3>
          <p className="text-neutral-400 text-sm">
            Спочатку підключіть Monobank банку на вкладці "Monobank", щоб отримати унікальний URL віджета.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* OBS Browser Source */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-white mb-3">Віджет сповіщень</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  URL віджета
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={getDisplayUrl()}
                      readOnly
                      className="w-full text-xs bg-black/30 text-purple-300 p-3 rounded-lg border border-purple-500/30 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-mono transition-all duration-300"
                    />
                  </div>
                  
                  {/* Кнопка показу/приховування */}
                  <button
                    type="button"
                    onClick={toggleUrlVisibility}
                    disabled={!obsWidgetUrl}
                    className="p-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={showUrl ? "Приховати URL" : "Показати URL"}
                  >
                    {showUrl ? (
                      // Іконка ока (показано)
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      // Іконка закресленого ока (приховано)
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                      </svg>
                    )}
                  </button>

                  {/* Кнопка копіювання */}
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    disabled={!obsWidgetUrl}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      copySuccess
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
                    }`}
                    title={copySuccess ? "Скопійовано!" : "Копіювати URL"}
                  >
                    {copySuccess ? (
                      // Іконка галочки (успішно скопійовано)
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      // Іконка копіювання
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Інструкція для OBS</h4>
                <ol className="text-sm text-neutral-300 space-y-1">
                  <li>1. Додайте <strong>Browser Source</strong> в OBS</li>
                  <li>2. Вставте скопійований URL</li>
                  <li>3. Встановіть розмір: <strong>800x600</strong> (віджет 720x540)</li>
                  <li>4. Увімкніть "Shutdown source when not visible"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* YouTube Віджет */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-white mb-3">YouTube Віджет</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  URL YouTube віджета
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={obsWidgetUrl ? `${window.location.origin}/obs/${initial.obsWidgetToken}/youtube` : 'Завантаження...'}
                      readOnly
                      className="w-full text-xs bg-black/30 text-red-300 p-3 rounded-lg border border-red-500/30 focus:border-red-400 focus:ring-1 focus:ring-red-400 font-mono transition-all duration-300"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/obs/${initial.obsWidgetToken}/youtube`)}
                    disabled={!initial.obsWidgetToken}
                    className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    title="Копіювати URL"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-300 mb-2">📺 Інструкція для YouTube віджета</h4>
                <ol className="text-sm text-neutral-300 space-y-1">
                  <li>1. Додайте <strong>Browser Source</strong> в OBS</li>
                  <li>2. Вставте скопійований URL</li>
                  <li>3. Встановіть розмір: <strong>1920x1080</strong></li>
                  <li>4. Увімкніть "Shutdown source when not visible"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Комбінований віджет */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z"/>
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-white mb-3">🔥 Комбінований віджет (РЕКОМЕНДОВАНО)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  URL комбінованого віджета
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={obsWidgetUrl ? `${window.location.origin}/obs/${initial.obsWidgetToken}/combined` : 'Завантаження...'}
                      readOnly
                      className="w-full text-xs bg-black/30 text-purple-300 p-3 rounded-lg border border-purple-500/30 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-mono transition-all duration-300"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/obs/${initial.obsWidgetToken}/combined`)}
                    disabled={!initial.obsWidgetToken}
                    className="p-3 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white rounded-lg transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    title="Копіювати URL"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/10 to-red-500/10 border border-purple-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-300 mb-2">⚡ Переваги комбінованого віджета</h4>
                <ul className="text-sm text-neutral-300 space-y-1">
                  <li>✅ Обробляє як звичайні донати, так і YouTube відео</li>
                  <li>✅ Правильна логіка черг відповідно до налаштувань</li>
                  <li>✅ Один віджет замість двох окремих</li>
                  <li>✅ Автоматична синхронізація налаштувань</li>
                  <li>🎯 <strong>Рекомендується використовувати замість окремих віджетів</strong></li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">🔧 Інструкція для комбінованого віджета</h4>
                <ol className="text-sm text-neutral-300 space-y-1">
                  <li>1. Видаліть старі віджети з OBS (якщо є)</li>
                  <li>2. Додайте <strong>Browser Source</strong> в OBS</li>
                  <li>3. Вставте скопійований URL комбінованого віджета</li>
                  <li>4. Встановіть розмір: <strong>1920x1080</strong></li>
                  <li>5. Увімкніть "Shutdown source when not visible"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Налаштування YouTube віджету */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-3">Налаштування YouTube віджету</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Максимальний час відео */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Максимальний час відео (хвилини)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={maxDurationMinutes}
                  onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
                  className="w-full bg-neutral-900/80 text-white p-3 rounded-lg border border-neutral-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Гучність */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Гучність ({volume}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>

              {/* Мінімум лайків */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Мінімум лайків
                </label>
                <input
                  type="number"
                  min="0"
                  value={minLikes}
                  onChange={(e) => setMinLikes(Number(e.target.value))}
                  className="w-full bg-neutral-900/80 text-white p-3 rounded-lg border border-neutral-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Мінімум переглядів */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Мінімум переглядів
                </label>
                <input
                  type="number"
                  min="0"
                  value={minViews}
                  onChange={(e) => setMinViews(Number(e.target.value))}
                  className="w-full bg-neutral-900/80 text-white p-3 rounded-lg border border-neutral-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Мінімум коментарів */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Мінімум коментарів
                </label>
                <input
                  type="number"
                  min="0"
                  value={minComments}
                  onChange={(e) => setMinComments(Number(e.target.value))}
                  className="w-full bg-neutral-900/80 text-white p-3 rounded-lg border border-neutral-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Чекбокси */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showClipTitle}
                    onChange={(e) => setShowClipTitle(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-orange-500 rounded border-neutral-600 bg-neutral-800 focus:ring-orange-400 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">Відображати назву кліпу</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDonorName}
                    onChange={(e) => setShowDonorName(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-orange-500 rounded border-neutral-600 bg-neutral-800 focus:ring-orange-400 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">Відображати імя донатера</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showImmediately}
                    onChange={(e) => setShowImmediately(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-orange-500 rounded border-neutral-600 bg-neutral-800 focus:ring-orange-400 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">Відображати новий донат одразу</span>
                </label>
              </div>
            </div>

            {/* Кнопка збереження */}
            <div className="mt-6">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/youtube/settings', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        maxDurationMinutes,
                        volume,
                        showClipTitle,
                        showDonorName,
                        minLikes,
                        minViews,
                        minComments,
                        showImmediately
                      })
                    });

                    if (response.ok) {
                      console.log('✅ YouTube settings saved successfully');
                      // TODO: Показати успішне повідомлення користувачу
                    } else {
                      console.error('❌ Failed to save YouTube settings');
                      // TODO: Показати помилку користувачу
                    }
                  } catch (error) {
                    console.error('❌ Error saving YouTube settings:', error);
                    // TODO: Показати помилку користувачу
                  }
                }}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-200 font-medium"
              >
                Зберегти налаштування
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
