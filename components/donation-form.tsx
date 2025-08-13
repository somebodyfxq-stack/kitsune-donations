"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useSession } from "next-auth/react";
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
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const filledRef = useRef(false);

  useEffect(() => {
    if (filledRef.current) return;
    if (session?.user?.name && !nickname) {
      setNickname(session.user.name);
      filledRef.current = true;
    }
  }, [session?.user?.name, nickname, setNickname]);

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
      const res = await fetch(`/api/donations/create?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Помилка");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Сталася помилка. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
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
          onInput={adjustTextareaHeight}
          placeholder="ваше повідомлення (макс. 500 символів)"
          className="input-base min-h-[120px] resize-none overflow-hidden"
          maxLength={500}
          aria-label="Повідомлення"
          required
        />
        <p className="text-xs text-neutral-500">Максимум символів – 500</p>
      </div>
      <div className="flex gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="default"
              className="w-full text-lg"
            >
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
      <button
        type="submit"
        className="btn-primary w-full text-lg"
        disabled={!isValid || submitting}
        aria-label="Надіслати донат"
      >
        {submitting ? "Готуємо посилання…" : "Надіслати"}
      </button>
      <div className="text-center text-xs text-neutral-400 break-words">
        Лінк відкриється в новій вкладці 😉<br/>
        Після оплати твій нік, сума та меседж залетять прямо на стрім! 🚀
      </div>
    </form>
  );
}

function adjustTextareaHeight(e: React.FormEvent<HTMLTextAreaElement>) {
  const target = e.currentTarget;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
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
