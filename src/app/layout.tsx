import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Disasters – Emergency & Public Safety Platform",
    template: "%s | Disasters",
  },
  description: "Report, detect, respond and resolve emergencies and civic issues across Indian cities.",
  applicationName: "Disasters",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Disasters – Emergency & Public Safety Platform",
    description: "Report, detect, respond and resolve incidents with real-time authority coordination.",
    images: ["/icons/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#073b67",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
