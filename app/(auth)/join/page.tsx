import Link from "next/link";
import { requestToJoin } from "@/app/actions/auth";
import { Flash, type SP } from "@/components/ui";

export const metadata = { title: "Ask to join" };

export default async function JoinPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (sp.sent) {
    return (
      <div className="stack">
        <h2>Thanks, we got it</h2>
        <p>A board member will check your address and send you an invite email to set your password, usually within a few days.</p>
        <Link href="/login">Back to log in</Link>
      </div>
    );
  }
  return (
    <form action={requestToJoin} className="stack">
      <h2>Ask to join</h2>
      <p className="muted">The portal is for Amherst Woods residents. A board member approves each request.</p>
      <Flash error={sp.error} />
      <div className="field">
        <label htmlFor="full_name">Your name</label>
        <input className="input" id="full_name" name="full_name" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        <span className="hint">This will be your login.</span>
      </div>
      <div className="field">
        <label htmlFor="address">Street address in Amherst Woods</label>
        <input className="input" id="address" name="address" autoComplete="street-address" placeholder="12 Laurel Ct" required />
      </div>
      <div className="field">
        <label htmlFor="note">Anything the board should know? (optional)</label>
        <textarea className="input" id="note" name="note" style={{ minHeight: 70 }} />
      </div>
      <button className="btn primary" type="submit">Send request</button>
      <Link className="small" href="/login">I already have an account</Link>
    </form>
  );
}
