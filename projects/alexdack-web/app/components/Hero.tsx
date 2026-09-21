import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, MapPin, MoveUpRight } from "lucide-react";

export default function Hero() {
  return <section className="hero">
    <Image className="hero-photo" src="/images/mobile-tyre-service-concept.webp" alt="Konceptbild av mobil däckservice vid en bil" fill priority sizes="100vw" />
    <div className="hero-overlay" />
    <div className="container hero-content">
      <div className="eyebrow"><span className="eyebrow-line" /> MOBIL DÄCKSERVICE I VAGGERYD</div>
      <h1>DÄCKSERVICE<br /><span>DÄR DU ÄR<span className="headline-period">.</span></span></h1>
      <p className="hero-lead">Däckbyte, balansering och reparation på dina villkor. Vi kommer till dig – så att du kan komma vidare.</p>
      <div className="hero-actions"><Link className="button button-green button-large" href="/boka">Boka din tid <ArrowUpRight size={21} /></Link><Link className="button button-outline button-large" href="/tjanster">Se våra tjänster <MoveUpRight size={18} /></Link></div>
      <div className="hero-bottom"><div className="hero-location"><MapPin size={17} /> VAGGERYD, SMÅLAND</div><div className="hero-caption">SERVICE SOM RULLAR MED DIG <ArrowDownRight size={21} /></div></div>
    </div>
    <div className="hero-side-label">01 / MOBIL SERVICE</div>
  </section>;
}
