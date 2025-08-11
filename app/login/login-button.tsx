'use client';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  function handleLogin() {
    signIn('twitch');
  }
  return <Button onClick={handleLogin}>Sign in with Twitch</Button>;
}
