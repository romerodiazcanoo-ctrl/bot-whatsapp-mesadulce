import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEVICE_COOKIE_NAME } from "@/lib/device";

const PUBLIC_PATHS = ["/login", "/acceso-denegado"];

export default auth((req) => {
  const { nextUrl } = req;
  const isPublicPath = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isLoggedIn = !!req.auth;
  const isAuthorized = !!req.auth?.user?.isAuthorized;

  let response: NextResponse;

  if (!isLoggedIn && !isPublicPath) {
    response = NextResponse.redirect(new URL("/login", nextUrl));
  } else if (isLoggedIn && !isAuthorized && nextUrl.pathname !== "/acceso-denegado") {
    response = NextResponse.redirect(new URL("/acceso-denegado?motivo=sin-permiso", nextUrl));
  } else if (isLoggedIn && isAuthorized && (nextUrl.pathname === "/login" || nextUrl.pathname === "/acceso-denegado")) {
    response = NextResponse.redirect(new URL("/", nextUrl));
  } else {
    response = NextResponse.next();
  }

  if (!req.cookies.get(DEVICE_COOKIE_NAME)) {
    response.cookies.set(DEVICE_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
