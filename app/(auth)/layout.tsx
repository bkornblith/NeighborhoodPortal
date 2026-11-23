import { Brand } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="art">
        <Brand />
        <div className="stack">
          <h1>News, events and swaps for Amherst Woods</h1>
          <p>The members' site of the Amherst Woods Homeowners Association, 191 homes in South Amherst. New to the neighborhood? Ask to join and a board member will set you up.</p>
        </div>
        <svg className="streets" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M0 30 Q40 25 60 50 T100 60" />
          <path d="M30 0 Q35 40 20 100" />
          <path d="M60 50 L75 0" />
          <path d="M40 75 L100 85" />
          <circle cx="60" cy="50" r="6" fill="currentColor" />
        </svg>
      </div>
      <main className="form">{children}</main>
    </div>
  );
}
