export function isForecastEditor(email: string | null | undefined) {
  if (!email) return false;

  const configuredEmails = (process.env.NEXT_PUBLIC_FORECAST_EDITOR_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (configuredEmails.length === 0) {
    return true;
  }

  return configuredEmails.includes(email.trim().toLowerCase());
}
