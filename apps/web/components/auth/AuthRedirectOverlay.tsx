'use client';

import Image from 'next/image';
import foleioLogo from '../../../../foleio-logo.png';
import { authCss } from './styles';

export function AuthRedirectOverlay({ message }: { message: string }) {
  return (
    <div className="foleio-auth-root fixed inset-0 z-[9999] flex flex-col items-center justify-center">
      <style dangerouslySetInnerHTML={{ __html: authCss }} />
      <div className="mb-6">
        <Image
          src={foleioLogo}
          alt="Foleio"
          priority
          className="h-12 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white" />
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-white/40">
        {message}
      </p>
    </div>
  );
}
