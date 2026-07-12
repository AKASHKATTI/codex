import type { Metadata } from "next";
import { WalletProvider } from "../hooks/useWallet";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairStake | Decentralized On-Chain Fantasy Sports Escrow",
  description: "Transparent, legal, and decentralized fantasy sports contests powered by Cardano smart contracts and auditable oracle data feeds.",
  keywords: ["Cardano", "dApp", "Aiken", "Fantasy Sports", "Smart Contract", "On-Chain Escrow", "Preprod", "Web3"],
  openGraph: {
    title: "FairStake | Cardano Hackathon Winner",
    description: "Legal, skill-based fantasy sports with decentralized escrow on Cardano.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <Script id="bypass-extension-errors" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined') {
              window.addEventListener('error', (event) => {
                if (event.filename && (event.filename.includes('chrome-extension') || event.filename.includes('extension'))) {
                  event.stopImmediatePropagation();
                }
              }, true);
              window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && (
                  (event.reason.stack && event.reason.stack.includes('chrome-extension')) ||
                  (event.reason.message && event.reason.message.includes('Eternl')) ||
                  (event.reason.info && event.reason.info.includes('Eternl'))
                )) {
                  event.stopImmediatePropagation();
                  event.preventDefault();
                }
              }, true);
            }
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
