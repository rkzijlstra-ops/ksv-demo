import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase-middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Match alles BEHALVE: static assets, /api/* (handelt eigen auth-check), favicon
  matcher: [
    "/((?!api/|_next/static|_next/image|_next/dev|favicon\\.ico|.*\\..*).*)",
  ],
};
