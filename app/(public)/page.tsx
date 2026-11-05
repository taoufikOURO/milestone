import type { Metadata } from "next";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "Milestone — planification des projets de groupe",
  description: "Calendrier de promo, groupes, tâches et réunions au même endroit.",
};

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
