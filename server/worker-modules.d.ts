// Minimal types for the Worker entry, so `tsc` works without pulling the full
// Workers type set into the shared Expo tsconfig.
declare module "cloudflare:node" {
  export function handleAsNodeRequest(
    port: number,
    request: Request,
  ): Promise<Response>;
}

declare module "*.html" {
  const content: string;
  export default content;
}
