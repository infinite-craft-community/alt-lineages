import { UriDecodeString } from "#lib/typed-strings";

import { fetchLineageList } from "./gitlab";

function makeResponse(
  status: 200 | 400 | 405,
  body?: string,
): { body?: string; info: ResponseInit } {
  const headers = new Headers();

  if (status === 200) {
    headers.set("Content-Type", "application/json");
  }

  return { body, info: { status, headers } };
}

export async function handleLineageGet(
  request: Request,
  url: URL,
  env: Env,
): Promise<{ body?: string; info: ResponseInit }> {
  if (request.method !== "GET") {
    return makeResponse(405);
  }

  const itemId = UriDecodeString(url.searchParams.get("id") || "");
  if (!itemId) {
    return makeResponse(400, "Bad Request. Missing item `id` param.");
  }

  const result = await fetchLineageList("all", itemId, env);
  result.sort((a, b) => a.steps - b.steps);

  return makeResponse(200, JSON.stringify(result));
}
