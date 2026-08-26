import { Resend } from "resend";

/**
 * Lazily creates the Resend SDK client from RESEND_API_KEY. Same "don't
 * explode just because an env var isn't loaded yet" pattern as
 * db/client.ts's getDb()/getScopedDb(): importing this module never
 * throws, only calling getResendClient() does, and only once, the first
 * time an email actually needs to be sent — so build/import time (and any
 * code path that never sends an email) is unaffected by a missing key.
 */
let _resend: Resend | undefined;

export function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set. Copy .env.local.example to .env.local " +
          "and fill in a Resend API key to send transactional email.",
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}
