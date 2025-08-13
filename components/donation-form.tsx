"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { AmountPresets } from "./amount-presets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function DonationForm(_: DonationFormProps) {
  const [nickname, setNickname] = useQueryState(
    "nickname",
    parseAsString.withDefault(""),
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
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtube, setYoutube] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const isAmountValid = amount >= 10 && amount <= 29999;
  const isValid = useMemo(() => {
    const trimmed = nickname.trim();
    if (!trimmed || !message.trim()) return false;
    if (trimmed.length > 30) return false;
    if (!Number.isFinite(amount)) return false;
    if (!isAmountValid) return false;
    return true;
  }, [nickname, amount, message, isAmountValid]);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 3000);
  }

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
      const res = await fetch(`/api/donations/create?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Помилка");
      window.open(data.url, "_blank", "noopener,noreferrer");
      showToast("Відкрито банку в новій вкладці");
    } catch {
      setError("Сталася помилка. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest() {
    if (testing) return;
    setTesting(true);
    try {
      const body = {
        nickname: nickname.trim() || "kitsune_fan",
        amount: Math.round(amount) || 50,
        message: message.trim() || "Тест повідомлення",
      };
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast("Надіслано тест сповіщення в OBS");
    } catch {
      showToast("Не вдалося надіслати тест");
    } finally {
      setTesting(false);
    }
  }

  const videoId = extractYoutubeId(youtubeInput);
  const embed = videoId ? `https://www.youtube.com/embed/${videoId}` : "";

  function handleAttach() {
    if (embed) setYoutube(embed);
    setDialogOpen(false);
  }

  function handleClear() {
    setYoutube("");
    setYoutubeInput("");
    setDialogOpen(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card grid gap-4 p-6 md:p-8"
      aria-label="Форма донату"
    >
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Сума</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={29999}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input-base appearance-none text-lg [-moz-appearance:textfield] [-webkit-appearance:textfield]"
            aria-describedby="amount-hint"
            aria-label="Сума донату"
            required
          />
          <span className="pill flex min-w-[80px] flex-col items-center justify-center text-sm">
            <span>₴</span>
            <span className="text-neutral-300">UAH</span>
          </span>
        </div>
        <p id="amount-hint" className="mt-1 text-xs text-neutral-400">
          Сума від 10 до 29999 ₴
        </p>
        {!isAmountValid && (
          <p className="mt-1 text-xs text-rose-400">
            Сума має бути від 10 до 29999 ₴
          </p>
        )}
        <div className="mt-2">
          <AmountPresets value={amount} onChange={setAmount} />
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-neutral-300">Ім&apos;я</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="ваш нікнейм"
          className="input-base"
          aria-label="Нікнейм"
          maxLength={30}
          required
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-neutral-300">Повідомлення</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ваше повідомлення (макс. 500 символів)"
          className="input-base min-h-[120px] resize-y"
          maxLength={500}
          aria-label="Повідомлення"
          required
        />
        <p className="text-xs text-neutral-500">Максимум символів – 500</p>
      </div>
      <div className="flex gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              YouTube
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Посилання на YouTube</DialogTitle>
            </DialogHeader>
            <input
              className="input-base mt-3 w-full"
              placeholder="https://youtu.be/..."
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
            />
            {embed && (
              <div className="mt-3 aspect-video">
                <iframe
                  src={embed}
                  className="h-full w-full rounded-md"
                  loading="lazy"
                  title="Попередній перегляд YouTube відео"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <DialogFooter className="mt-3 gap-1">
              <Button type="button" onClick={handleAttach} disabled={!embed}>
                Прикріпити
              </Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Очистити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {youtube && (
        <div className="aspect-video">
          <iframe
            src={youtube}
            className="h-full w-full rounded-md"
            loading="lazy"
            title="Прикріплене YouTube відео"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          className="btn-primary w-full text-lg"
          disabled={!isValid || submitting}
          aria-label="Надіслати донат"
        >
          {submitting ? "Готуємо посилання…" : "Надіслати"}
        </button>
        <button
          type="button"
          className="btn-ghost w-full text-lg"
          onClick={handleTest}
          aria-label="Надіслати тест до OBS"
          disabled={testing}
        >
          {testing ? "Тест…" : "Тест сповіщення"}
        </button>
      </div>
      <div className="text-center text-xs text-neutral-400 break-words">
        Лінк відкриється в новій вкладці 😉<br/>
        Після оплати твій нік, сума та меседж залетять прямо на стрім! 🚀
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm shadow-lg ring-1 ring-white/20">
            {toast}
          </div>
        </div>
      )}
    </form>
  );
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
    }
    return null;
  } catch {
    return null;
  }
}

interface DonationFormProps {}
