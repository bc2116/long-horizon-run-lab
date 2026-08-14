import { ensureData, getData, ownerKey } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const owner = ownerKey(request);
    await ensureData(owner);
    return Response.json(await getData(owner));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load data." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return Response.json(
    { error: "The public portfolio demo is read-only." },
    { status: 405, headers: { Allow: "GET" } },
  );
}
