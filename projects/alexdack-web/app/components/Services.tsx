import Link from "next/link";
import { ArrowUpRight, CircleGauge, Disc3, LifeBuoy, RotateCcw, Settings2, Wrench } from "lucide-react";

const services = [
  { n:"01", title:"Däckbyte", description:"Dags att växla mellan sommar- och vinterdäck? Vi hjälper dig enkelt och smidigt.", Icon:RotateCcw },
  { n:"02", title:"Omläggning", description:"När nya däck ska på fälgen ser vi till att arbetet blir ordentligt gjort.", Icon:Disc3 },
  { n:"03", title:"Balansering", description:"En jämnare körkänsla och mindre slitage med balanserade hjul.", Icon:CircleGauge },
  { n:"04", title:"Punktering", description:"Få hjälp att bedöma skadan och reparera däcket när det är möjligt.", Icon:LifeBuoy },
  { n:"05", title:"Ventilbyte", description:"Vi hjälper dig med ventiler och ser över detaljerna som håller hjulen i form.", Icon:Settings2 },
  { n:"06", title:"Däckhjälp", description:"Behöver du nya däck? Vi hjälper dig att hitta ett alternativ för din bil.", Icon:Wrench },
];

export default function Services({ full = false }: { full?: boolean }) {
  return <section className="section section-services" id="tjanster">
    <div className="container">
      <div className="section-topline"><span>01 / VÅRA TJÄNSTER</span><span>ALLT FÖR DINA HJUL</span></div>
      <div className="section-intro"><div><p className="kicker">RÄTT HJÄLP, NÄR DU BEHÖVER DEN</p><h2>Vi håller dig<br /><em>rullande.</em></h2></div><p>Från säsongens däckbyte till en oväntad punktering. Vi tar hand om däcken så att du kan fokusera på vägen framåt.</p></div>
      <div className="service-grid">{services.map(({ n, title, description, Icon }) => <article className="service-card" key={n}>
        <div className="service-card-top"><span>{n} / 06</span><Icon size={30} strokeWidth={1.5} /></div>
        <div><h3>{title}</h3><p>{description}</p></div>
        <Link href={`/boka?tjanst=${encodeURIComponent(title)}`} aria-label={`Boka ${title}`} className="service-arrow"><ArrowUpRight size={22} /></Link>
      </article>)}</div>
      {!full && <div className="section-end"><span>ENKLARE VÄG TILL BRA DÄCKSERVICE</span><Link href="/tjanster">Läs om våra tjänster <ArrowUpRight size={17} /></Link></div>}
    </div>
  </section>;
}
