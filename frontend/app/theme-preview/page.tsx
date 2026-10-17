import type { Metadata } from 'next';
import { ThemePreviewCanvas } from '@/components/theme-preview/ThemePreviewCanvas';

export const metadata: Metadata = {
  title: 'Synapse Theme Exploration — Visual Preview Only',
  description:
    'Exploratory preview of the Burgundy (#790D16), Warm Sand (#E5D3AF), Soft Ivory (#F5EFE1), and Dusty Blue (#AEC4D4) color palette for Synapse in Light and Dark modes.',
};

export default function ThemePreviewPage() {
  return <ThemePreviewCanvas />;
}
