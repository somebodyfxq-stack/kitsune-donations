export interface RedirectContext {
  url: string;
  baseUrl: string;
}

export function createRedirect(
  getSession: () => Promise<any>,
): (ctx: RedirectContext) => Promise<string> {
  return async function redirect({ url, baseUrl }: RedirectContext) {
    const session = await getSession();
    if (session?.user?.role === "streamer") return `${baseUrl}/panel`;
    return url.startsWith(baseUrl) ? url : baseUrl;
  };
}
