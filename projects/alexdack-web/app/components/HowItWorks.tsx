import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const steps = [
  { n:"01", title:"Välj tjänst", text:"Berätta vad du behöver hjälp med och ange ditt registreringsnummer." },
  { n:"02", title:"Ange dina uppgifter", text:"Välj önskat datum och tala om var du vill ha hjälp." },
  { n:"03", title:"Vi tar det vidare", text:"När bokningssystemet kopplas in får du bekräftelse enligt verksamhetens rutiner." },
];

export default function HowItWorks() {
 return <section className="section section-process"><div className="container"><div className="section-topline"><span>02 / ENKELT FRÅN START</span><span>DIN TID ÄR VIKTIG</span></div><div className="process-heading"><div><p className="kicker">SÅ ÄR BOKNINGEN TÄNKT ATT FUNGERA</p><h2>Tre steg.<br /><em>Sen rullar vi.</em></h2></div><Link href="/boka" className="text-link">Testa bokningsflödet <ArrowUpRight size={20} /></Link></div><div className="steps-grid">{steps.map(s=><div className="step" key={s.n}><div className="step-number">{s.n}<span>↗</span></div><h3>{s.title}</h3><p>{s.text}</p></div>)}</div></div></section>;
}
