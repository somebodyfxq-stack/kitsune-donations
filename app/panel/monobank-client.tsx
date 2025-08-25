"use client";

import { useState } from "react";
import { customFetch } from "@/lib/fetch";
import { StatusData } from "./status-client";

// UI component for connecting a Monobank jar to the streamer account.
// It manages three phases:
//  1) initial collapsed view with a button to reveal the token input
//  2) input of the personal API token and retrieval of jars
//  3) selection of a jar and final connection step

interface Jar {
  id: string;
  title: string;
  goal: number;
  balance: number;
}

interface MonobankClientProps {
  initial: StatusData;
  onDataChange?: () => Promise<void>;
}

export function MonobankClient({ initial, onDataChange }: MonobankClientProps) {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [jars, setJars] = useState<Jar[]>([]);
  const [selectedJar, setSelectedJar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(initial.isConnected || false);
  const [connectedJarTitle, setConnectedJarTitle] = useState<string | null>(initial.jarTitle || null);
  const [connectedJarGoal, setConnectedJarGoal] = useState<number | null>(initial.jarGoal || null);

  async function handleGetData() {
    setMessage(null);
    if (!token) {
      setMessage("Будь ласка, введіть токен.");
      return;
    }
    setLoading(true);
    try {
      // Request the list of jars from the server.  The server will talk
      // directly to the Monobank API.
      const jarsRes = await customFetch("/api/monobank/jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const jarsData = await jarsRes.json();
      if (!jarsRes.ok) {
        setMessage(jarsData?.error || "Помилка при отриманні банок.");
        setJars([]);
        return;
      }
      const list: Jar[] = jarsData?.jars ?? [];
      setJars(list);
      setSelectedJar(list.length > 0 ? list[0].id : null);
      // Persist the token so that subsequent operations (e.g. webhook
      // configuration) can use it.  Errors here are non‑fatal: we can
      // still proceed to select a jar even if the token isn’t stored.
      await customFetch("/api/monobank/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setMessage(null);
    if (!selectedJar) {
      setMessage("Потрібно вибрати банку.");
      return;
    }
    setLoading(true);
    try {
      // Знаходимо дані обраної банки
      const selectedJarData = jars.find(jar => jar.id === selectedJar);
      
      const res = await customFetch("/api/monobank/connect-jar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jarId: selectedJar, 
          jarTitle: selectedJarData?.title || "Банка",
          jarGoal: selectedJarData?.goal || 0
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Не вдалося підключити банку.");
      } else {
        // Знаходимо дані підключеної банки
        const connectedJar = jars.find(jar => jar.id === selectedJar);
        const jarTitle = connectedJar?.title || "Банка";
        const jarGoal = connectedJar?.goal || 0;
        
        setIsConnected(true);
        setConnectedJarTitle(jarTitle);
        setConnectedJarGoal(jarGoal);
        setMessage(`✅ ${jarTitle} успішно підключена! Оновлення даних...`);
        setExpanded(false); // Згорнути форму після успішного підключення
        
        // Оновлюємо дані без перезавантаження сторінки
        if (onDataChange) {
          setTimeout(async () => {
            await onDataChange();
            setMessage(`✅ ${jarTitle} успішно підключена! Тепер ви можете приймати донати.`);
          }, 500);
        } else {
          // Fallback до перезавантаження, якщо onDataChange не передано
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Налаштування Monobank</h2>
          <p className="text-sm text-neutral-400">
            Visa | Mastercard
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Комісія системи 0%. Донат від 10 до 29 999&nbsp;грн.
          </p>
        </div>
        {/* Toggle для стану Monobank інтеграції */}
        <div className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors ${
          isConnected ? 'bg-green-500' : 'bg-neutral-700'
        }`}>
          <span className={`absolute top-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isConnected ? 'translate-x-6' : 'translate-x-1'
          }`}></span>
        </div>
      </div>
      {/* Connected jar info or connect button */}
      {isConnected ? (
        <div className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">
                Підключено банку «{connectedJarTitle || "Банка"}»
              </p>
              {connectedJarGoal && (
                <p className="text-neutral-300 text-sm mt-0.5">
                  Цільова сума: {connectedJarGoal.toLocaleString()} ₴
                </p>
              )}
              <p className="text-green-400 text-sm mt-1">Готово до прийому донатів</p>
            </div>
            <button
              type="button"
              className="btn-secondary text-sm ml-auto"
              onClick={() => setExpanded(true)}
            >
              Змінити
            </button>
          </div>

          {/* Webhook status */}
          {initial.webhookStatus && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-300">Webhook статус:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    initial.webhookStatus.isConfigured && !initial.webhookStatus.lastError 
                      ? 'bg-green-400' 
                      : 'bg-red-400'
                  }`}></div>
                  <span className="text-sm font-mono">
                    {initial.webhookStatus.isConfigured && !initial.webhookStatus.lastError
                      ? '200 OK'
                      : initial.webhookStatus.lastError || 'Not configured'
                    }
                  </span>
                </div>
              </div>
              {initial.webhookStatus.url && (
                <div className="mt-2 text-xs text-neutral-400 font-mono break-all">
                  {initial.webhookStatus.url}
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        !expanded && (
          <div className="mt-6">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setExpanded(true)}
            >
              Підключити банку
            </button>
          </div>
        )
      )}
      {expanded && (
        <div className="mt-6 space-y-4">
          {/* Token input */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="mono-token">
              Токен Mono
            </label>
            <div className="flex items-center gap-2">
              <input
                id="mono-token"
                type="text"
                className="input-base flex-1 h-[42px]"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Введіть особистий API токен"
              />
              <button
                type="button"
                onClick={handleGetData}
                className="btn-primary px-4 h-[42px]"
                disabled={loading}
              >
                Отримати дані
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Токен можна отримати на сайті <a href="https://api.monobank.ua" target="_blank" rel="noopener noreferrer" className="underline">api.monobank.ua</a>.
              Токен використовується тільки у браузері, щоб отримати список банок і створити безпечний вебхук на наш сервіс. Ми не зберігаємо токен у відкритому вигляді.
            </p>
          </div>
          {/* Jar list */}
          {jars.length > 0 && (
            <div className="grid gap-3 grid-cols-2">
              {jars.map((jar) => (
                <label
                  key={jar.id}
                  className={`flex cursor-pointer items-start p-4 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition ${
                    selectedJar === jar.id 
                      ? 'ring-2 ring-purple-400 bg-white/10' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Jar icon */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-center bg-no-repeat"
                      style={{
                        backgroundImage: 'url(/icons/jar_bg.png)',
                        backgroundSize: '100%'
                      }}
                    >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                        src="/icons/jar.png"
                        alt="Jar icon"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    
                    {/* Jar info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-tight mb-1">
                        {jar.title || "Невідома банка"}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Ціль: {jar.goal.toLocaleString()}&nbsp;₴
                      </p>
                      <p className="text-xs text-neutral-400">
                        Баланс: {jar.balance.toLocaleString()}&nbsp;₴
                      </p>
                    </div>
                    
                    {/* Custom checkbox */}
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedJar === jar.id
                          ? 'border-purple-400 bg-purple-400'
                          : 'border-neutral-400 bg-transparent'
                      }`}>
                        {selectedJar === jar.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <input
                    type="radio"
                    name="jar"
                    value={jar.id}
                    checked={selectedJar === jar.id}
                    onChange={() => setSelectedJar(jar.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          )}
          {/* Connect button */}
          {jars.length > 0 && (
            <div>
              <button
                type="button"
                onClick={handleConnect}
                className="btn-primary w-full"
                disabled={loading}
              >
                Підключити
              </button>
            </div>
          )}
          {message && (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-sm text-neutral-300">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}