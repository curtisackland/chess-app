// import { auth } from "@chess-app/auth";
// import { toNextJsHandler } from "better-auth/next-js";

// export const { GET, POST } = toNextJsHandler(auth.handler);
export const GET = () => new Response("Auth disabled");
export const POST = () => new Response("Auth disabled");
