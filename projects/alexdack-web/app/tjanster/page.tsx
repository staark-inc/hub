import type { Metadata } from "next";
import Services from "../components/Services";
import MobileService from "../components/MobileService";

export const metadata: Metadata = { title: "Tjänster" };
export default function Page(){return <><div className="subhero"><div className="container"><p className="kicker">VÅRA TJÄNSTER</p><h1>DÄCKHJÄLP<br /><em>UTAN KRÅNGEL.</em></h1><p>Däckbyte, balansering, omläggning och reparation. Hitta hjälpen som passar dig.</p></div></div><Services full /><MobileService /></>}
