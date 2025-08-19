"use client";

import { useState, useEffect } from "react";
import type { StatusData } from "./status-client";

interface WidgetSettingsProps {
  initial: StatusData;
}

export function WidgetSettings({ initial }: WidgetSettingsProps) {
  const [obsWidgetUrl, setObsWidgetUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('uk-UA-Standard-A');
  const [showUrl, setShowUrl] = useState<boolean>(false);

  // Генеруємо URL віджета тільки на клієнті для уникнення hydration помилки
  useEffect(() => {
    if (initial.obsWidgetToken && typeof window !== 'undefined') {
      // Невелика затримка для плавності
      const timer = setTimeout(() => {
        setObsWidgetUrl(`${window.location.origin}/obs/${initial.obsWidgetToken}?voice=${selectedVoice}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initial.obsWidgetToken, selectedVoice]);

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

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(event.target.value);
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
            <h3 className="text-lg font-medium text-white mb-3">OBS Browser Source</h3>
            
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
                  <li>3. Встановіть розмір: <strong>1920x1080</strong></li>
                  <li>4. Увімкніть "Shutdown source when not visible"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Додatkові налаштування */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-3">Налаштування звуку</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Голос для TTS
                </label>
                <select 
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                  className="w-full bg-neutral-900/80 text-white p-3 rounded-lg border border-neutral-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23a1a1aa%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22/%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:20px_20px] pr-10"
                >
                  <option value="uk-UA-Standard-A" className="bg-neutral-900 text-white">🇺🇦 Українська (жіночий голос)</option>
                  <option value="uk-UA-Standard-B" className="bg-neutral-900 text-white">🇺🇦 Українська (чоловічий голос)</option>
                  <option value="en-US-Standard-C" className="bg-neutral-900 text-white">🇺🇸 English (female)</option>
                  <option value="en-US-Standard-D" className="bg-neutral-900 text-white">🇺🇸 English (male)</option>
                  <option value="en-GB-Standard-A" className="bg-neutral-900 text-white">🇬🇧 British English (female)</option>
                  <option value="en-GB-Standard-B" className="bg-neutral-900 text-white">🇬🇧 British English (male)</option>
                </select>
                <p className="text-xs text-neutral-400 mt-1">
                  URL віджета автоматично оновлюється при зміні голосу
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
