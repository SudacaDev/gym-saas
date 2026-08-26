/**
 * The one error-message renderer every RHF+Zod form in the app should use
 * instead of a bare `{errors.field && <p>...}` — that pattern shows the
 * message to sighted users but never tells assistive tech it appeared
 * (impeccable audit, 2026-08-21: identical gap in all 6 forms). Pair with
 * `aria-describedby={errors.field ? "<id>" : undefined}` on the input.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
