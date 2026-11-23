import { CATEGORIES, type Post, type PostType } from "@/lib/types";
import { isoToLocalInput, photoUrl } from "@/lib/format";

type Props = {
  type: PostType;
  action: (f: FormData) => Promise<void>;
  post?: Post & { photos?: { id: number; path: string }[] };
  submitLabel: string;
};

export function PostForm({ type, action, post, submitLabel }: Props) {
  const titleHint =
    type === "listing" ? "What are you selling or giving away?" : type === "event" ? "What's happening?" : type === "sighting" ? "What did you see? (e.g. Black bear on Larkspur)" : "What do you want to ask?";
  return (
    <form action={action} className="panel" style={{ maxWidth: 680 }}>
      <input type="hidden" name="type" value={type} />
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input className="input" id="title" name="title" required maxLength={140} placeholder={titleHint} defaultValue={post?.title} />
      </div>

      {type === "listing" && (
        <div className="grid2">
          <div className="field">
            <label htmlFor="price">Price</label>
            <input className="input" id="price" name="price" inputMode="decimal" placeholder="$40" defaultValue={post?.price_cents != null ? String(post.price_cents / 100) : ""} />
            <label className="check" style={{ fontWeight: 400 }}>
              <input type="checkbox" name="is_free" id="is_free" defaultChecked={post?.is_free} /> It's free
            </label>
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select className="input" id="category" name="category" defaultValue={post?.category ?? "Other"}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {type === "event" && (
        <>
          <div className="grid2">
            <div className="field">
              <label htmlFor="starts_at">Starts</label>
              <input className="input" type="datetime-local" id="starts_at" name="starts_at" required defaultValue={isoToLocalInput(post?.starts_at ?? null)} />
            </div>
            <div className="field">
              <label htmlFor="ends_at">Ends (optional)</label>
              <input className="input" type="datetime-local" id="ends_at" name="ends_at" defaultValue={isoToLocalInput(post?.ends_at ?? null)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="location">Where</label>
            <input className="input" id="location" name="location" placeholder="Clubhouse, or a street address" defaultValue={post?.location ?? ""} />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="body">Details</label>
        <textarea className="input" id="body" name="body" defaultValue={post?.body} placeholder={type === "listing" ? "Condition, size, where to pick it up…" : type === "sighting" ? "Where and when, and anything neighbors should know" : ""} />
      </div>

      {type !== "question" && (
        <div className="field">
          <label htmlFor="photos">Photos (up to 6)</label>
          {post?.photos?.length ? (
            <div className="photo-row">
              {post.photos.map((ph) => (
                <label key={ph.id} className="stack tight tiny" style={{ alignItems: "center" }}>
                  <img src={photoUrl(ph.path)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                  <span className="check"><input type="checkbox" name="remove_photo" value={ph.id} /> Remove</span>
                </label>
              ))}
            </div>
          ) : null}
          <input className="input" type="file" id="photos" name="photos" accept="image/*" multiple />
        </div>
      )}

      {type === "listing" && !post && (
        <p className="small muted">
          Your listing stays up for 30 days, then moves to your archived listings, where you can renew it. Neighbors can ask public
          questions or message you privately.
        </p>
      )}
      <div className="row end">
        <button className="btn primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
