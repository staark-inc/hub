import type { Metadata } from "next";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import MobileActions from "./components/MobileActions";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Alex Däckservice | Konceptförslag", template: "%s | Alex Däckservice" },
  description: "Konceptförslag för mobil däckservice i Vaggeryd. En interaktiv demonstration framtagen av Staark Inc.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="sv"><body><SiteHeader /><main>{children}</main><SiteFooter /><MobileActions /></body></html>;
}
