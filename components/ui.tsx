import { initials } from "@/lib/format";

export function Flash({ error, ok }: { error?: string | string[]; ok?: string | string[] }) {
  const e = Array.isArray(error) ? error[0] : error;
  const o = Array.isArray(ok) ? ok[0] : ok;
  return (
    <>
      {e && <div className="flash error" role="alert">{e}</div>}
      {o && <div className="flash ok" role="status">{o}</div>}
    </>
  );
}

export function Avatar({ name, board }: { name: string; board?: boolean }) {
  return <span className={`av${board ? " board" : ""}`} aria-hidden="true">{initials(name)}</span>;
}

export function Brand({ small = "Neighborhood Association" }: { small?: string }) {
  return (
    <span className="brand">
      <span className="mark">AW</span>
      <span>
        <b>Amherst Woods</b>
        <small>{small}</small>
      </span>
    </span>
  );
}

export type SP = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
