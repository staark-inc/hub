import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="container footer-top">
      <div className="footer-brand">
        <span className="footer-label">DÄCKSERVICE PÅ DINA VILLKOR</span>
        <h2>Redo för<br /><em>nästa mil?</em></h2>
        <Link className="button button-green" href="/boka">Utforska bokning <ArrowUpRight size={18} /></Link>
      </div>
      <div className="footer-links"><span className="footer-label">UTFORSKA</span><Link href="/tjanster">Tjänster</Link><Link href="/priser">Priser</Link><Link href="/om-oss">Om oss</Link><Link href="/kontakt">Kontakt</Link></div>
      <div className="footer-address"><span className="footer-label">HÄR FINNS VI</span><p><MapPin size={17} /> Vaggeryd, Småland</p><p>Mobil däckservice hos dig.</p><a href="https://www.alexdack.se/kontakt" target="_blank" rel="noopener noreferrer">Nuvarande kontaktsida <ArrowUpRight size={16} /></a></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} Alex Däckservice · Konceptdemo</span><span>Designkoncept av Staark Inc.</span></div>
  </footer>;
}
