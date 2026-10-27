import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("learnlink");
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  const meta = (await store.get("_meta", { type: "json" })) || {};

  if (req.method === "GET") {
    const since = Number(new URL(req.url).searchParams.get("since") || 0);
    const gone = [], items = [];
    for (const [id, t] of Object.entries(meta)) {
      if (t < 0) gone.push(id);
      else if (t > since) {
        const it = await store.get("item:" + id, { type: "json" });
        if (it) items.push(it);
      }
    }
    return json({ gone, items, now: Date.now() });
  }

  let b;
  try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  const pw = Netlify.env.get("ADMIN_PASSWORD");
  if (!pw || b.pw !== pw) return json({ ok: false }, 401);

  if (b.action === "check") return json({ ok: true });

  if (b.action === "save" && b.item && /^[\w-]{3,40}$/.test(b.item.id || "")) {
    const t = Date.now();
    b.item.updated = t;
    await store.setJSON("item:" + b.item.id, b.item);
    meta[b.item.id] = t;
    await store.setJSON("_meta", meta);
    return json({ ok: true, updated: t });
  }

  if (b.action === "delete" && /^[\w-]{3,40}$/.test(b.id || "")) {
    await store.delete("item:" + b.id);
    meta[b.id] = -Date.now();
    await store.setJSON("_meta", meta);
    return json({ ok: true });
  }
  return json({ ok: false }, 400);
};

export const config = { path: "/api/library" };
