import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

export default function MobileActions() {
 return <div className="sticky-actions" aria-label="Snabbval"><Link href="/kontakt"><Mail size={19} /> Kontakt</Link><Link href="/boka"><span>Boka tid</span><ArrowUpRight size={19} /></Link></div>;
}
