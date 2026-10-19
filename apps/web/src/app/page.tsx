import { EmberField } from "@/components/ember-field";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Showcase } from "@/components/landing/showcase";
import { Community } from "@/components/landing/community";
import { PricingNote } from "@/components/landing/pricing-note";
import { Cta } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <EmberField />
      <Nav />
      <main className="relative z-10 flex flex-1 flex-col">
        <Hero />
        <Features />
        <Showcase />
        <Community />
        <PricingNote />
        <Cta />
      </main>
    </>
  );
}
