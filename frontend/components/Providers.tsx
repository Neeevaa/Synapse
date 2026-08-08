"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const DEFAULT_CLIENT_ID =
  "739603254405-bh9v6k5kaccp7duuoasp4sfgnufsnkqe.apps.googleusercontent.com";

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
