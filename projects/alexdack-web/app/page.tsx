import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Hero from "./components/Hero";
import Services from "./components/Services";
import MobileService from "./components/MobileService";
import HowItWorks from "./components/HowItWorks";
import Review from "./components/Review";

export default function Home() {
 return <><Hero /><div className="trust-bar"><div className="container trust-inner"><span><i /> MOBIL DÄCKSERVICE</span><span><i /> VAGGERYD MED OMNEJD*</span><span><i /> HJÄLP MED DINA DÄCK</span></div></div><Services /><MobileService /><HowItWorks /><Review /><section className="cta-band"><div className="container cta-inner"><div><p className="kicker">REDO NÄR DU ÄR DET</p><h2>Låt oss ta hand<br />om <em>däcken.</em></h2><p>*Serviceområde och tillgänglighet bekräftas av verksamheten.</p></div><Link href="/boka" className="cta-round" aria-label="Utforska bokning"><ArrowUpRight size={42} /></Link></div><div className="container cta-bottom"><span>VAGGERYD, SMÅLAND</span><Link href="/kontakt">HAR DU EN FRÅGA? <ChevronRight size={18} /></Link></div></section></>;
}
