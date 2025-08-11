/**
 * Restrict a number within bounds.
 *
 * @param n - candidate value
 * @param min - lower bound
 * @param max - upper bound
 * @returns bounded value
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Generate an identifier formatted as `XXX-XXXXXX`.
 *
 * @returns random identifier
 */
export function generateIdentifier(): string {
  function block(length: number): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  }

  return `${block(3)}-${block(6)}`;
}

/**
 * Normalize user-provided messages.
 *
 * Trims whitespace, limits length to 500 characters and strips control characters.
 *
 * @param message - raw input
 * @returns sanitized message
 */
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .slice(0, 500)
    .replace(/[\u0000-\u001F\u007F]/g, "");
}

/**
 * Construct a Monobank donation URL.
 *
 * @param jarId - target jar identifier
 * @param amount - donation amount
 * @param message - message to encode
 * @returns Monobank donation URL
 */
export function buildMonoUrl(
  jarId: string,
  amount: number,
  message: string,
): string {
  const encoded = encodeURIComponent(message);
  return `https://send.monobank.ua/jar/${jarId}?a=${Math.round(amount)}&t=${encoded}`;
}
