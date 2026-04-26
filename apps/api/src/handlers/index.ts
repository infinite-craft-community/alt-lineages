import { handleLineageGet } from "./lineages/get-lineage";
import { handleLineageSubmit } from "./lineages/submit-lineage";

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/submit") {
    const data = await handleLineageSubmit(request, url, env);
    const body = JSON.stringify(data.data);
    const response = new Response(body, data.info);

    return response;
  }

  if (url.pathname === "/get") {
    const data = await handleLineageGet(request, url, env);
    const response = new Response(data.body, data.info);

    return response;
  }

  return new Response(null, { status: 404 });
}
