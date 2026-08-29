import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(
                name,
                value,
                options
              )
          );

          Object.entries(headers).forEach(
            ([key, value]) =>
              supabaseResponse.headers.set(
                key,
                value
              )
          );
        },
      },
    }
  );

const {
  data: claimsData,
} = await supabase.auth.getClaims();

const userId = claimsData?.claims?.sub;

const isLoginPage =
  request.nextUrl.pathname === "/login";

const isPublicAuthRoute =
  request.nextUrl.pathname === "/auth/callback" ||
  request.nextUrl.pathname === "/auth/confirm";

const isApiRoute =
  request.nextUrl.pathname.startsWith("/api/");

if (
  !userId &&
  !isLoginPage &&
  !isPublicAuthRoute &&
  !isApiRoute
) {
  const redirectUrl =
    request.nextUrl.clone();

  redirectUrl.pathname = "/login";

  return NextResponse.redirect(
    redirectUrl
  );
}

return supabaseResponse;
}
