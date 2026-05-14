import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Web3Provider } from "@/components/web3/Web3Provider";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "AetherAgentAI | The Proof-of-Intelligence Network",
  description: "A decentralized AI task network where user-owned agents solve tasks, get validated, and claim protocol-based testnet rewards.",
  applicationName: "AetherAgentAI",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "AetherAgentAI",
    description: "The Proof-of-Intelligence Network for validated AI task contributions.",
    url: appUrl,
    siteName: "AetherAgentAI",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "AetherAgentAI",
    description: "The Proof-of-Intelligence Network for validated AI task contributions."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <AppShell>{children}</AppShell>
        </Web3Provider>
      </body>
    </html>
  );
}
