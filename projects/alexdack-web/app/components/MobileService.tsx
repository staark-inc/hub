import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, Truck } from "lucide-react";

export default function MobileService() {
 return <section className="section-mobile-service" id="mobil-service"><div className="container mobile-service-grid">
   <div className="mobile-visual"><div className="mobile-visual-ring"><span>AD</span></div><div className="visual-location"><span className="pulse" /> VI KOMMER TILL DIG</div><div className="visual-number">02<span>/</span>04</div></div>
   <div className="mobile-copy"><p className="kicker"><span className="small-green-line" /> SERVICE PÅ DIN ADRESS</p><h2>Vi kommer dit<br /><em>du är.</em></h2><p className="mobile-main-copy">Du ska inte behöva planera om hela dagen för dina däck. Med vår mobila service får du hjälp där det passar dig.</p><div className="mobile-perks"><div><Truck size={23} /><span>Servicebil med utrustningen vi behöver</span></div><div><MapPin size={23} /><span>Utgår från Vaggeryd</span></div><div><Clock3 size={23} /><span>Enklare att passa in i vardagen</span></div></div><Link className="button button-dark" href="/boka">Se hur bokning fungerar <ArrowUpRight size={18} /></Link></div>
 </div></section>;
}
