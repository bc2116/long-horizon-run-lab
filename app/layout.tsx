import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const description =
  "A privacy-safe running, recovery, and shoe-mileage dashboard built with synthetic data.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/long-horizon-run-lab-og.png`;
  return {
    title: "Long Horizon Run Lab",
    description,
    openGraph: {
      title: "Long Horizon Run Lab",
      description: "Synthetic miles. Recovery. Rotation.",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Long Horizon Run Lab",
      description: "Synthetic miles. Recovery. Rotation.",
      images: [image],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101314",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
