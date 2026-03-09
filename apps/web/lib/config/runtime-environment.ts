export function isNetlifyProductionContext(): boolean {
  return process.env.CONTEXT === 'production';
}

export function shouldShowStagingBanner(): boolean {
  // Hard guard: never show staging banner in production context.
  if (isNetlifyProductionContext()) {
    return false;
  }

  return process.env.NEXT_PUBLIC_ENV === 'staging';
}
