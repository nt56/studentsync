/** Public support contact for the privacy and support pages (and app-store listings). */
export function supportEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+$/.test(value) ? value : null;
}
