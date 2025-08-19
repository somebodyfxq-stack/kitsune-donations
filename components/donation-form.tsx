"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { AmountPresets } from "./amount-presets";
import { YouTubeDialog } from "./youtube-dialog";


/**
 * Donation form component used on streamer pages.  It collects a
 * nickname, amount and message from the donor, validates the input
 * client‑side and then calls the `/api/donations/create` endpoint to
 * obtain a payment URL.  If the API returns an error the message is
 * displayed to the user instead of a generic failure.
 */
export function DonationForm({ initialName = "" }: DonationFormProps) {
  const [nickname, setNickname] = useQueryState(
    "nickname",
    parseAsString.withDefault(initialName),
  );
  const [amount, setAmount] = useQueryState(
    "amount",
    parseAsInteger.withDefault(50),
  );
  const [message, setMessage] = useQueryState(
    "message",
    parseAsString.withDefault(""),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [youtube, setYoutube] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Функція для отримання YouTube відео ID з URL
  const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(youtube);

  const isAmountValid = amount >= 10 && amount <= 29999;
  const isValid = useMemo(() => {
    const trimmed = nickname.trim();
    if (!trimmed || !message.trim()) return false;
    if (trimmed.length > 30) return false;
    if (!Number.isFinite(amount)) return false;
    if (!isAmountValid) return false;
    return true;
  }, [nickname, amount, message, isAmountValid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const params = new URLSearchParams({
        nickname: nickname.trim(),
        amount: String(Math.round(amount)),
        message: message.trim().slice(0, 500),
      });
      if (youtube) params.set("youtube", youtube);
      // Pass the current slug explicitly to the API.  While the API
      // normally infers the streamer from the referer header, some
      // browsers omit referrer information on same‑origin fetches.  The
      // backend will use this `streamer` parameter if present.
      if (typeof window !== "undefined") {
        const parts = window.location.pathname.split("/").filter(Boolean);
        const slug = parts[0] || "";
        if (slug) params.set("streamer", slug);
      }
      const res = await fetch(`/api/donations/create?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error || "Сталася помилка. Спробуйте ще раз.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Сталася помилка. Спробуйте ще раз.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nickname Field */}
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium mb-2">
            Ваше ім'я <span className="text-red-400">*</span>
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input-base"
            placeholder="Введіть ваше ім'я"
            maxLength={30}
            required
          />
          {nickname.trim().length > 30 && (
            <p className="text-red-400 text-xs mt-1">
              Ім'я не може бути довшим за 30 символів
            </p>
          )}
        </div>

        {/* Amount Field */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Сума (₴) <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className={`input-base ${!isAmountValid ? 'ring-red-400 focus:ring-red-400' : ''}`}
              placeholder="Введіть суму від 10 до 29999 грн"
              min={10}
              max={29999}
              required
            />
            
            {/* Amount status text */}
            <div className="text-xs">
              {!isAmountValid ? (
                <p className="text-red-400">
                  Будь ласка, введіть суму від 10 до 29999 грн
                </p>
              ) : (
                <p className="text-neutral-400">
                  Сума від 10 до 29999 грн
                </p>
              )}
            </div>

            {/* Amount presets below */}
            <AmountPresets
              value={amount}
              onChange={setAmount}
            />
          </div>
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Повідомлення <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-base resize-none"
            placeholder="Напишіть своє повідомлення..."
            rows={3}
            maxLength={500}
            required
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-neutral-400">
              {message.length}/500 символів
            </span>
            {message.trim().length === 0 && (
              <span className="text-red-400 text-xs">
                Повідомлення обов'язкове
              </span>
            )}
          </div>
        </div>

        {/* YouTube Field */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <img
              src="/icons/youtube.svg"
              alt="YouTube"
              className="w-4 h-4"
            />
            YouTube відео
            <span className="text-lg leading-none">+</span>
          </button>
        </div>

        {/* YouTube Dialog */}
        <YouTubeDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAdd={(url) => setYoutube(url)}
          currentUrl={youtube}
        />

        {/* Область попереднього перегляду відео поза діалогом */}
        {youtube && videoId && (
          <div className="w-full aspect-video bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-700 relative overflow-hidden group">
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
            {/* Кнопка видалення відео */}
            <button
              type="button"
              onClick={() => setYoutube("")}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
              title="Видалити відео"
            >
              ✕
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="btn-primary w-full text-base py-4"
        >
          {submitting ? "Готуємо посилання…" : "Надіслати донат 💖"}
      </button>

        {/* Error Display */}
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
    </form>
    </div>
  );
}

interface DonationFormProps {
  initialName?: string;
}