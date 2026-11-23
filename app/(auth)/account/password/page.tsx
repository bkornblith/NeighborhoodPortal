import { setNewPassword } from "@/app/actions/auth";
import { Flash, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";

export const metadata = { title: "Choose a password" };

export default async function NewPasswordPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await getMe();
  const welcome = !!sp.welcome;
  return (
    <form action={setNewPassword} className="stack">
      <h2>{welcome ? `Welcome, ${me.full_name.split(" ")[0]}!` : "Choose a new password"}</h2>
      <p className="muted">
        {welcome ? "Pick a password to finish setting up your account. " : ""}You'll log in with <b>{me.email}</b>.
      </p>
      <Flash error={sp.error} />
      <div className="field">
        <label htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="hint">At least 8 characters. That's the only rule.</span>
      </div>
      <div className="field">
        <label htmlFor="password2">Type it again</label>
        <input className="input" id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <button className="btn primary" type="submit">Save and continue</button>
    </form>
  );
}
