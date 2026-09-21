"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { href: "/tjanster", label: "Tjänster" },
  { href: "/priser", label: "Priser" },
  { href: "/om-oss", label: "Om oss" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="demo-strip"><span className="demo-dot" /> Konceptförslag för Alex Däckservice <span className="strip-credit">· av Staark Inc.</span></div>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Alex Däckservice startsida" onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span className="brand-type">ALEX<span>DÄCKSERVICE</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Huvudnavigation">
            {links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
          <Link className="button button-green header-book" href="/boka">Boka tid <ArrowUpRight size={18} strokeWidth={2.2} /></Link>
          <button className="menu-toggle" type="button" aria-label={open ? "Stäng menyn" : "Öppna menyn"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
        {open && <nav className="mobile-nav" aria-label="Mobilnavigation">
          {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
          <Link className="button button-green" href="/boka" onClick={() => setOpen(false)}>Boka tid <ArrowUpRight size={18} /></Link>
        </nav>}
      </header>
    </>
  );
}
