import { Quote } from "lucide-react";

export default function Review() {
 return <section className="review-section"><div className="container review-layout"><div className="review-label"><span>03 / KUNDENS ORD</span><div className="review-circle"><Quote size={45} strokeWidth={1.2}/></div></div><div className="review-content"><p>“Snabb hjälp med punkteringen utanför Vaggeryd, och däcket kunde lagas på plats.”</p><div className="review-source"><span>MATTIAS</span><span>Sammanfattat från kundrecension på nuvarande webbplats</span></div></div></div></section>;
}
