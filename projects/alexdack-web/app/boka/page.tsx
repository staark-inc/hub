import type { Metadata } from "next";
import BookingFlow from "./BookingFlow";
export const metadata: Metadata = { title: "Boka tid — interaktivt koncept" };
export default async function Page({searchParams}:{searchParams:Promise<{tjanst?:string}>}) { const params = await searchParams; return <BookingFlow initialService={params.tjanst} />; }
