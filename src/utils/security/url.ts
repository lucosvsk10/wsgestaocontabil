export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function openExternalUrl(value: string | null | undefined): boolean {
  const url = safeExternalUrl(value);
  if (!url) return false;

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
