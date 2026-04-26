import { handleRequest } from "./handlers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const response = await handleRequest(request, env);
      return response;
    } catch (error) {
      const message = `Error: ${(error as Error).message}`;

      return new Response(message, { status: 500 });
    }
  },
};
