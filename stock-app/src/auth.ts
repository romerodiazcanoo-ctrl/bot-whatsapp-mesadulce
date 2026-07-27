import NextAuth, { type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEVICE_COOKIE_NAME } from "@/lib/device";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [Google],
  callbacks: {
    async signIn({ user }: { user: User }) {
      const email = user.email;
      if (!email) return false;

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser) {
        return `/acceso-denegado?motivo=no-registrado`;
      }
      if (!dbUser.isAuthorized) {
        return `/acceso-denegado?motivo=sin-permiso`;
      }

      const cookieStore = await cookies();
      const deviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
      if (!deviceId) {
        return `/acceso-denegado?motivo=dispositivo-invalido`;
      }

      const headerList = await headers();
      const deviceLabel = (headerList.get("user-agent") ?? "Dispositivo desconocido").slice(0, 255);

      if (!dbUser.deviceId) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            deviceId,
            deviceLabel,
            deviceBoundAt: new Date(),
            pendingDeviceId: null,
            pendingDeviceLabel: null,
            pendingDeviceRequestedAt: null,
          },
        });
        return true;
      }

      if (dbUser.deviceId === deviceId) {
        return true;
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          pendingDeviceId: deviceId,
          pendingDeviceLabel: deviceLabel,
          pendingDeviceRequestedAt: new Date(),
        },
      });
      return `/acceso-denegado?motivo=dispositivo-no-autorizado`;
    },

    async jwt({ token }: { token: JWT }) {
      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.isAuthorized = dbUser.isAuthorized;
      } else {
        token.isAuthorized = false;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.id ?? "";
      session.user.role = token.role ?? "LECTOR";
      session.user.isAuthorized = token.isAuthorized ?? false;
      return session;
    },
  },
});
