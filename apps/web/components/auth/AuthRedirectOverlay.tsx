'use client';

import Image from 'next/image';
import foleioLogo from '../../../../foleio-logo.png';

export function AuthRedirectOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f6f5f1] font-[family-name:var(--font-body),Inter,system-ui,sans-serif] text-[#1c1b19]">
      <div className="mb-6">
        <Image
          src={foleioLogo}
          alt="Foleio"
          priority
          className="h-14 w-14 rounded-full object-cover"
        />
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e7e5e4] border-t-[#1c1b19]" />
      <p className="mt-4 text-[15px] text-[#55544f]">
        {message}
      </p>
    </div>
  );
}
