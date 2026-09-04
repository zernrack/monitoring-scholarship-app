import { auth } from "@monitoring-scholarship-app/auth";
import type { Request } from "express";

function toWebHeaders(request: Request): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(name, value.join(", "));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}

export async function createOrpcContext(request: Request) {
  return {
    session: await auth.api.getSession({ headers: toWebHeaders(request) }),
  };
}

export type OrpcContext = Awaited<ReturnType<typeof createOrpcContext>>;
