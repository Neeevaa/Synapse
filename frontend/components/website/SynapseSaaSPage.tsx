'use client';

import React from 'react';
import './fintech-saas-theme.css';
import { SynapseSaaSNavbar } from './SynapseSaaSNavbar';
import { SynapseNeuralHero } from '@/components/home/SynapseNeuralHero';
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

        {/* Hero with interactive 3D Synapse Brain nucleus & connected neural modules */}
        <SynapseNeuralHero />

        {/* Interactive Rotating Orbital Feature Explorer */}
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
