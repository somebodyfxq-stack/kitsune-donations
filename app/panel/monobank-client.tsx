"use client";

import { useState } from "react";

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

export function MonobankClient() {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [jars, setJars] = useState<Jar[]>([]);
  const [selectedJar, setSelectedJar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const jarsRes = await fetch("/api/monobank/jars", {
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
      await fetch("/api/monobank/save-token", {
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
      const res = await fetch("/api/monobank/connect-jar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jarId: selectedJar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Не вдалося підключити банку.");
      } else {
        setMessage(
          data?.donationUrl
            ? `Підключено! Посилання для донатів: ${data.donationUrl}`
            : "Банка підключена."
        );
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 bg-neutral-900 rounded-lg p-6 text-neutral-100">
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
        {/* Future toggle for enabling/disabling Monobank integration.  At the
            moment it is not interactive but visually matches the design. */}
        <div className="relative inline-flex h-6 w-11 cursor-pointer rounded-full bg-neutral-700 transition-colors">
          <span className="absolute left-1 top-1 inline-block h-4 w-4 transform rounded-full bg-brand-500 transition-transform"></span>
        </div>
      </div>
      {/* Expandable area */}
      {!expanded && (
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            onClick={() => setExpanded(true)}
          >
            Підключити банку
          </button>
        </div>
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
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Введіть особистий API токен"
              />
              <button
                type="button"
                onClick={handleGetData}
                className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
            <div className="space-y-2">
              {jars.map((jar) => (
                <label
                  key={jar.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-neutral-700 bg-neutral-800 p-4 hover:border-brand-500"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {jar.title || "Невідома банка"}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Ціль: {jar.goal.toLocaleString()}&nbsp;₴
                    </p>
                    <p className="text-xs text-neutral-400">
                      Баланс: {jar.balance.toLocaleString()}&nbsp;₴
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="jar"
                    value={jar.id}
                    checked={selectedJar === jar.id}
                    onChange={() => setSelectedJar(jar.id)}
                    className="h-4 w-4 text-brand-500 focus:ring-brand-500 border-neutral-600"
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
                className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                disabled={loading}
              >
                Підключити
              </button>
            </div>
          )}
          {message && (
            <div className="mt-4 rounded-md bg-neutral-800 p-3 text-sm text-yellow-400">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}