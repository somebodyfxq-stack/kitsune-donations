"use client";

import React, { useState, useEffect } from "react";
import type { DonationEvent } from "@prisma/client";

interface DonationWithDate extends Omit<DonationEvent, 'createdAt'> {
  createdAt: string;
  // jarTitle вже визначено в DonationEvent як string | null
}

interface DonationsHistoryProps {
  initial: DonationWithDate[];
}

export function DonationsHistory({ initial }: DonationsHistoryProps) {
  const [donations, setDonations] = useState<DonationWithDate[]>(initial);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [donationsPaused, setDonationsPaused] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'recent' | 'large'>('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(0)} ₴`;
  };

  const getFilteredDonations = () => {
    let filtered;
    switch (filter) {
      case 'recent':
        // Останні 24 години
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        filtered = donations.filter(d => new Date(d.createdAt) > yesterday);
        break;
      case 'large':
        // Донати більше 50 грн
        filtered = donations.filter(d => d.amount >= 50);
        break;
      default:
        filtered = donations;
    }
    
    // Сортуємо за часом: найновіші вгорі
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);
  const filteredDonations = getFilteredDonations();

  const handleCreateTestDonation = async () => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/donations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create test donation');
      }

      const result = await response.json();
      
      // Додаємо новий донат в список (на початок)
      setDonations(prev => [result.donation, ...prev]);
      
    } catch (error) {
      console.error('Failed to create test donation:', error);
      alert('Помилка створення тестового донату: ' + (error as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleDeleteTestDonations = async () => {
    const testCount = donations.filter(d => d.identifier.startsWith('test-')).length;
    if (testCount === 0) {
      alert('Немає тестових донатів для видалення');
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/donations/test-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete test donations');
      }

      const result = await response.json();
      
      // Видаляємо тестові донати зі стану
      setDonations(prev => prev.filter(d => !d.identifier.startsWith('test-')));
      
    } catch (error) {
      console.error('Failed to delete test donations:', error);
      alert('Помилка видалення тестових донатів: ' + (error as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Функція для отримання стану паузи
  const fetchPauseState = async () => {
    try {
      const response = await fetch('/api/donations/pause');
      if (response.ok) {
        const data = await response.json();
        setDonationsPaused(data.paused);
      }
    } catch (error) {
      console.error('Failed to fetch pause state:', error);
    }
  };

  // Функція для зміни стану паузи
  const togglePause = async () => {
    setPauseLoading(true);
    try {
      const response = await fetch('/api/donations/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paused: !donationsPaused }),
      });

      if (response.ok) {
        const data = await response.json();
        setDonationsPaused(data.paused);
      } else {
        const error = await response.json();
        alert('Помилка: ' + (error.error || 'Не вдалося змінити стан паузи'));
      }
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      alert('Помилка підключення до сервера');
    } finally {
      setPauseLoading(false);
    }
  };

  // Завантажуємо стан паузи при ініціалізації
  React.useEffect(() => {
    fetchPauseState();
  }, []);

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-white">{donations.length}</div>
          <div className="text-sm text-neutral-400">Всього донатів</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-400">{formatAmount(totalAmount)}</div>
          <div className="text-sm text-neutral-400">Загальна сума</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-purple-400">
            {donations.length > 0 ? formatAmount(totalAmount / donations.length) : '0 ₴'}
          </div>
          <div className="text-sm text-neutral-400">Середній донат</div>
        </div>
      </div>

      {/* Фільтри та тестовий донат */}
      <div className="card p-4 space-y-4">
        {/* Кнопки тестових донатів і управління чергою */}
        <div className="flex flex-wrap justify-start gap-3">
          <button
            onClick={handleCreateTestDonation}
            disabled={testLoading || deleteLoading || pauseLoading}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              testLoading || deleteLoading || pauseLoading
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {testLoading ? (
              <>
                <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Створення...
              </>
            ) : (
              <>
                🧪 Додати тестовий донат
              </>
            )}
          </button>
          
          <button
            onClick={handleDeleteTestDonations}
            disabled={deleteLoading || testLoading || pauseLoading}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              deleteLoading || testLoading || pauseLoading
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {deleteLoading ? (
              <>
                <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Видалення...
              </>
            ) : (
              <>
                🗑️ Видалити тестові донати ({donations.filter(d => d.identifier.startsWith('test-')).length})
              </>
            )}
          </button>

          <button
            onClick={togglePause}
            disabled={pauseLoading || testLoading || deleteLoading}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              pauseLoading || testLoading || deleteLoading
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : donationsPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {pauseLoading ? (
              <>
                <svg className="inline w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Оновлення...
              </>
            ) : donationsPaused ? (
              <>
                ▶️ Відновити показ донатів
              </>
            ) : (
              <>
                ⏸️ Призупинити показ донатів
              </>
            )}
          </button>
        </div>

        {/* Пояснення для кнопки паузи */}
        {donationsPaused && (
          <div className="text-xs text-red-400 pl-1">
            ⏸️ Донати додаються в чергу, але не відтворюються
          </div>
        )}
        
        {/* Фільтри */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            📧 Всі донати ({donations.length})
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              filter === 'recent' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            🕐 Останні 24 години ({donations.filter(d => new Date(d.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length})
          </button>
          <button
            onClick={() => setFilter('large')}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              filter === 'large' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            ⚡ Великі донати 50₴+ ({donations.filter(d => d.amount >= 50).length})
          </button>
        </div>
      </div>

      {/* Таблиця донатів */}
      <div className="card overflow-hidden">
        {filteredDonations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Поки що немає донатів</h3>
            <p className="text-neutral-400 text-sm">
              {filter === 'all' ? 'Донати з\'являться тут після підключення банки та перших надходжень.' 
               : filter === 'recent' ? 'За останні 24 години донатів не було.'
               : 'Великих донатів 50₴+ поки немає.'}
            </p>
          </div>
        ) : (
          <>
            {/* Мобільний вигляд - картки */}
            <div className="block md:hidden space-y-3">
            {filteredDonations.map((donation) => (
              <div key={`${donation.identifier}-${donation.createdAt}`} className="bg-neutral-800/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                      {donation.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium">{donation.nickname}</div>
                      <div className="text-xs text-neutral-400">{formatDate(donation.createdAt)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{formatAmount(donation.amount)}</div>
                    <div className="flex items-center justify-end gap-1 text-xs text-neutral-400">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                      </svg>
                      mono
                    </div>
                  </div>
                </div>
                <div className="text-sm text-neutral-300 mb-2">{donation.message}</div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                    </svg>
                    Monobank
                  </span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:bg-white/10 rounded transition-colors" title="Переглянути">
                      <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded transition-colors" title="Видалити">
                      <svg className="w-4 h-4 text-neutral-400 hover:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Десктопний вигляд - таблиця */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-neutral-800/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-neutral-300 min-w-[140px]">Нік</th>
                  <th className="text-left p-3 text-sm font-medium text-neutral-300 min-w-[300px]">Повідомлення</th>
                  <th className="text-left p-3 text-sm font-medium text-neutral-300 min-w-[120px]">Дата</th>
                  <th className="text-left p-3 text-sm font-medium text-neutral-300 min-w-[80px]">Система</th>
                  <th className="text-right p-3 text-sm font-medium text-neutral-300 min-w-[100px]">Сума</th>
                  <th className="text-center p-3 text-sm font-medium text-neutral-300 min-w-[80px]">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {filteredDonations.map((donation) => (
                  <tr key={`${donation.identifier}-${donation.createdAt}`} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {donation.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{donation.nickname}</div>
                          <div className="text-xs text-neutral-400">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                              </svg>
                              Monobank
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-neutral-300 max-w-[300px] break-words" title={donation.message}>
                        {donation.message}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-white">{formatDate(donation.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm text-neutral-300">Monobank</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-lg font-bold text-green-400">{formatAmount(donation.amount)}</span>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Переглянути деталі"
                        >
                          <svg className="w-4 h-4 text-neutral-400 hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                        </button>
                        <button
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Видалити"
                        >
                          <svg className="w-4 h-4 text-neutral-400 hover:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {filteredDonations.length > 10 && (
        <div className="flex justify-center">
          <button className="btn-secondary">
            Завантажити ще
          </button>
        </div>
      )}
    </div>
  );
}
