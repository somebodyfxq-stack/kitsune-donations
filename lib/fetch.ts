/**
 * Custom fetch wrapper that automatically adds ngrok bypass headers
 * to all requests. This prevents the ngrok browser warning page from appearing.
 */

type FetchOptions = RequestInit & {
  headers?: HeadersInit;
};

const createHeaders = (existingHeaders?: HeadersInit): Headers => {
  const headers = new Headers(existingHeaders);
  
  // Add tunnel bypass headers
  headers.set('ngrok-skip-browser-warning', 'true'); // For ngrok
  headers.set('bypass-tunnel-reminder', 'true'); // For localtunnel
  
  // Set a custom User-Agent if not already set
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'kitsune-donations-app');
  }
  
  return headers;
};

export const customFetch = (
  input: RequestInfo | URL,
  init?: FetchOptions
): Promise<Response> => {
  const options: RequestInit = {
    ...init,
    headers: createHeaders(init?.headers),
  };
  
  return fetch(input, options);
};

// Export as default for easy replacement of global fetch
export default customFetch;

// Simplified EventSource creation without URL manipulation issues
export const createEventSource = (url: string): EventSource => {
  console.log("🔌 Creating EventSource with URL:", url);
  
  // Simple approach - just add ngrok bypass parameter directly to URL string
  let finalUrl = url;
  
  // Add tunnel bypass only if needed and URL doesn't already have it
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if ((hostname.includes('ngrok') || hostname.includes('ngrok-free.app')) && !url.includes('ngrok-skip-browser-warning')) {
      finalUrl += url.includes('?') ? '&ngrok-skip-browser-warning=true' : '?ngrok-skip-browser-warning=true';
    }
  }
  
  console.log("📡 Final EventSource URL:", finalUrl);
  return new EventSource(finalUrl);
};
