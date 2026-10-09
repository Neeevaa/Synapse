import { PublicHeader } from "@/components/website/PublicHeader";
import { HeroSection } from "@/components/website/HeroSection";
import { StatsSection } from "@/components/website/StatsSection";
import { CategoryShowcaseSection } from "@/components/website/CategoryShowcaseSection";
import { CoreFeaturesSection } from "@/components/website/CoreFeaturesSection";
import { AsymmetricalProductSection } from "@/components/website/AsymmetricalProductSection";
import { AIIntelligenceSection } from "@/components/website/AIIntelligenceSection";
import { WorkflowSection } from "@/components/website/WorkflowSection";
import { SemanticSearchSection } from "@/components/website/SemanticSearchSection";
import { ProjectRolesSection } from "@/components/website/ProjectRolesSection";
import { WhySynapseSection } from "@/components/website/WhySynapseSection";
import { ProductCollageSection } from "@/components/website/ProductCollageSection";
import { PricingPreviewSection } from "@/components/website/PricingPreviewSection";
import { ResourcesSection } from "@/components/website/ResourcesSection";
import { FAQSection } from "@/components/website/FAQSection";
import { FinalCTASection } from "@/components/website/FinalCTASection";
import { PublicFooter } from "@/components/website/PublicFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-primary-foreground font-sans antialiased transition-colors duration-200">
      {/* 1. STICKY HEADER */}
      <PublicHeader />

      <main className="flex flex-col">
        {/* 2. CINEMATIC HERO & OVERLAPPING PRODUCT MOCKUPS (DARK) */}
        <HeroSection />

        {/* 3. STATS & TRUST SECTION (DARK) */}
        <StatsSection />

        {/* 4. PRODUCT CAPABILITY CATEGORY NAV & LARGE SHOWCASE (LIGHT) */}
        <CategoryShowcaseSection />

        {/* 5. "EVERYTHING YOU NEED" & FOUR CORE FEATURE CARDS (LIGHT) */}
        <CoreFeaturesSection />

        {/* 6. ASYMMETRICAL PRODUCT SECTION (DARK) */}
        <AsymmetricalProductSection />

        {/* 7. AI INTELLIGENCE SECTION (DARK) */}
        <AIIntelligenceSection />

        {/* 8. WORKFLOW & CONNECTED LIFECYCLE (LIGHT) */}
        <WorkflowSection />

        {/* 9. SEMANTIC SEARCH EXPERIENCE (DARK) */}
        <SemanticSearchSection />

        {/* 10. PROJECT ROLES & PRINCIPLES (LIGHT) */}
        <ProjectRolesSection />

        {/* 11. "WHY SYNAPSE" EDITORIAL STATEMENTS (LIGHT) */}
        <WhySynapseSection />

        {/* 12. PRODUCT SCREENSHOT COLLAGE (DARK) */}
        <ProductCollageSection />

        {/* 13. PRICING PREVIEW (LIGHT - FROM LIB/PLANS) */}
        <PricingPreviewSection />

        {/* 14. RESOURCES & EXPLORATION (LIGHT) */}
        <ResourcesSection />

        {/* 15. FAQ ACCORDION (LIGHT) */}
        <FAQSection />

        {/* 16. FINAL DARK CTA WITH CONSTELLATION VISUAL (DARK) */}
        <FinalCTASection />
      </main>

      {/* 17. MULTI-COLUMN FOOTER (DARK) */}
      <PublicFooter />
    </div>
  );
}