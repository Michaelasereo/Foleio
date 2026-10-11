import { Instrument_Serif, Inter } from 'next/font/google';

export const landingSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-landing-sans',
});

export const landingSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
  variable: '--font-landing-serif',
});
