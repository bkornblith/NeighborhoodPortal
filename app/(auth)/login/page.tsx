import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Flash, one, type SP } from "@/components/ui";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return (
    <form action={login} className="stack">
      <h2>Welcome back</h2>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={one(sp.email)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div className="row between">
        <span className="small muted">You'll stay logged in on this device.</span>
        <Link className="small" href="/forgot-password">Forgot password?</Link>
      </div>
      <button className="btn primary" type="submit">Log in</button>
      <p className="small muted">
        New to the neighborhood? <Link href="/join">Ask to join</Link>.
      </p>
    </form>
  );
}
