'use client';

import React from 'react';
import './fintech-saas-theme.css';
import { SynapseSaaSNavbar } from './SynapseSaaSNavbar';
import { SynapseHeroCircuit } from './SynapseHeroCircuit';
import { SynapseProductPreview } from './SynapseProductPreview';
import { RadialOrbitalTimeline } from '@/components/ui/radial-orbital-timeline';
import { SynapseWorkflowSection } from './SynapseWorkflowSection';
import { SynapseWhySection } from './SynapseWhySection';
import { SynapsePricingSection } from './SynapsePricingSection';
import { SynapseFinalCTA } from './SynapseFinalCTA';
import { SynapseFooter } from './SynapseFooter';

export function SynapseSaaSPage() {
  return (
    <div className="syn-frame">
      <div className="syn-canvas">
        {/* Floating pill navigation */}
        <SynapseSaaSNavbar />

        {/* Hero with circuit traces, 3D squircle node & telemetry cards */}
        <SynapseHeroCircuit />

        {/* Section C: Product Preview - Interactive Workspace */}
        <SynapseProductPreview />

        {/* Section D: Interactive Rotating Orbital Feature Explorer */}
        <RadialOrbitalTimeline />

        {/* Section E: How Synapse Works - 5-Step Connected Workflow */}
        <SynapseWorkflowSection />

        {/* Section F: Why Synapse - Context-Aware vs Passive Trackers */}
        <SynapseWhySection />

        {/* Section G: Pricing - Transparent 4-tier plans */}
        <SynapsePricingSection />

        {/* Section H: Final Call to Action */}
        <SynapseFinalCTA />

        {/* Section I: Footer */}
        <SynapseFooter />
      </div>
    </div>
  );
}
