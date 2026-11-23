import { Fragment, type ReactNode } from "react";

/**
 * Renders the simple formatting board members can type into info pages:
 * blank line = new paragraph, "## " = heading, "- " = bullet, **bold**, and bare https:// links.
 * Builds React elements (never raw HTML), so it's safe for anything typed in.
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+[^\s).,;])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<a key={i++} href={tok} target="_blank" rel="noreferrer">{tok.replace(/^https?:\/\/(www\.)?/, "")}</a>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="rich">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        // A block may start with a heading and continue with text or bullets.
        const parts: ReactNode[] = [];
        let bullets: string[] = [];
        let para: string[] = [];
        const flush = () => {
          if (para.length) parts.push(<p key={`p${parts.length}`}>{inline(para.join(" "))}</p>);
          if (bullets.length) parts.push(<ul key={`u${parts.length}`}>{bullets.map((b, k) => <li key={k}>{inline(b)}</li>)}</ul>);
          para = [];
          bullets = [];
        };
        for (const line of lines) {
          if (line.startsWith("## ")) {
            flush();
            parts.push(<h2 key={`h${parts.length}`}>{line.slice(3)}</h2>);
          } else if (/^[-*] /.test(line)) {
            if (para.length) flush();
            bullets.push(line.slice(2));
          } else {
            if (bullets.length) flush();
            para.push(line);
          }
        }
        flush();
        return <Fragment key={bi}>{parts}</Fragment>;
      })}
    </div>
  );
}
