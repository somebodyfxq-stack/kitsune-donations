"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { StatusClient, type StatusData } from "./status-client";
import { WidgetSettings } from "./widget-settings";
import { DonationsHistory } from "./donations-history";

// Lazy load MonobankClient для зменшення initial bundle
const MonobankClient = lazy(() => import("./monobank-client").then(m => ({ default: m.MonobankClient })));

interface PanelTabsProps {
  initial: StatusData;
  donations: any[];
}

type TabType = 'monobank' | 'widget' | 'donations';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'donations',
    label: 'Історія донатів',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
      </svg>
    )
  },
  {
    id: 'widget',
    label: 'Віджети',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
      </svg>
    )
  },
  {
    id: 'monobank',
    label: 'Monobank',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
      </svg>
    )
  }
];

export function PanelTabs({ initial, donations }: PanelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('donations');
  const [statusData, setStatusData] = useState<StatusData>(initial);
  const [donationsData, setDonationsData] = useState(donations);

  // Відновлюємо збережену вкладку з localStorage при завантаженні
  useEffect(() => {
    const savedTab = localStorage.getItem('panel-active-tab') as TabType;
    if (savedTab && ['donations', 'widget', 'monobank'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  // Зберігаємо активну вкладку в localStorage при зміні
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    localStorage.setItem('panel-active-tab', tabId);
  };

  // Функція для оновлення даних без перезавантаження сторінки
  const refreshData = async () => {
    try {
      const response = await fetch('/api/panel/status');
      if (response.ok) {
        const data = await response.json();
        setStatusData(data.status);
        setDonationsData(data.donations);
      }
    } catch (error) {
      console.error('Помилка при оновленні даних:', error);
      // У випадку помилки все ж таки перезавантажуємо сторінку
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Status always visible */}
      <div>
        <Suspense fallback={<div className="card p-6 md:p-8">Завантаження…</div>}>
          <StatusClient initial={statusData} />
        </Suspense>
      </div>

      {/* Tabs navigation */}
      <div className="card p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'donations' && (
          <DonationsHistory initial={donationsData} />
        )}
        
        {activeTab === 'widget' && (
          <WidgetSettings initial={statusData} />
        )}
        
        {activeTab === 'monobank' && (
          <Suspense fallback={<div className="card p-6 md:p-8">Завантаження Monobank налаштувань...</div>}>
            <MonobankClient initial={statusData} onDataChange={refreshData} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
