import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Flash, one, type SP } from "@/components/ui";

export const metadata = { title: "Reset password" };

export default async function ForgotPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (sp.sent) {
    return (
      <div className="stack">
        <h2>Check your email</h2>
        <p>
          If <b>{one(sp.email)}</b> has an account, we've sent it a link to choose a new password. The link works once and
          expires in an hour.
        </p>
        <Link href="/login">Back to log in</Link>
      </div>
    );
  }
  return (
    <form action={requestPasswordReset} className="stack">
      <h2>Forgot your password?</h2>
      <p className="muted">Enter the email you log in with and we'll send you a link to choose a new one.</p>
      <Flash error={sp.error} />
      <div className="field">
        <label htmlFor="email">Your email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn primary" type="submit">Email me a reset link</button>
      <Link className="small" href="/login">Back to log in</Link>
    </form>
  );
}
