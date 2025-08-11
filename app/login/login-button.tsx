'use client';
import { signIn } from 'next-auth/react';

export function LoginButton() {
  function handleLogin() {
    signIn('twitch');
  }
  return (
    <button
      type="button"
      onClick={handleLogin}
      className="btn-primary inline-flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M4.265 0L0 4.265v15.47h6.352V24l4.265-4.265h5.412L24 11.824V0H4.265zm17.647 11.824-3.706 3.706h-5.647l-3.529 3.53v-3.53H3.176V2.118h18.736v9.706z" />
        <path d="M13.765 5.882h2.118v5.647h-2.118zm-4.235 0h2.118v5.647H9.53z" />
      </svg>
      Sign in with Twitch
    </button>
  );
}
