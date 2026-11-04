import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { Preview } from "@/components/landing/Preview";
import { Testimonials } from "@/components/landing/Testimonials";

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
        <Preview />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
