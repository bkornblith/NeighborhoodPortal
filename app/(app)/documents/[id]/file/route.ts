import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Members open a document through a short-lived signed link; the files themselves are private. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("path, file_name").eq("id", id).single();
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.path, 300);
  if (!data?.signedUrl) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
