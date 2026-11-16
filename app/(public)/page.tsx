import type { Metadata } from "next";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { RulesBand } from "@/components/landing/RulesBand";

export const metadata: Metadata = {
  title: "Milestone — planification des projets de groupe",
  description:
    "Milestone planifie les projets de groupe par étudiant, sur toute la promotion : calendrier de promo, planning personnel et conflits de deadline.",
};

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <Navbar />
      <main>
        <Hero />
        <RulesBand />
        <Features />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
