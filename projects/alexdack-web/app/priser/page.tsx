import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export const metadata: Metadata = { title: "Priser" };
const names=["Däckbyte", "Omläggning", "Balansering", "Punktering", "Ventilbyte", "Däckhjälp"];
export default function Page(){return <><div className="subhero"><div className="container"><p className="kicker">PRISER · KONCEPTVY</p><h1>TYDLIGT FRÅN<br /><em>FÖRSTA BÖRJAN.</em></h1><p>Här kan godkända priser visas när Alex Däckservice har bekräftat tjänster och upplägg.</p></div></div><section className="section light-section"><div className="container price-wrap"><div className="section-topline"><span>PRISÖVERSIKT</span><span>PRISER INVÄNTAR BEKRÄFTELSE</span></div>{names.map((name,i)=><div className="price-row" key={name}><span>{String(i+1).padStart(2,"0")}</span><strong>{name}</strong><span>Pris på förfrågan</span><Link href={`/boka?tjanst=${encodeURIComponent(name)}`} aria-label={`Fråga om ${name}`}><ArrowUpRight size={22}/></Link></div>)}<p className="price-note">Den här sidan är en designskiss. Inga priser har hämtats eller bestämts för verksamheten.</p></div></section></>}
