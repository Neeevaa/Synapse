/**
 * Centralized configuration for the full-screen diagonal marquee background
 * used across the Synapse Login and Sign Up authentication pages.
 *
 * To supply your own photography, save image files matching the exact filenames
 * inside `public/images/auth-background/`.
 */

export interface AuthBackgroundImage {
  id: number;
  filename: string;
  src: string;
  title: string;
  intendedVisual: string;
  alt: string;
  /**
   * High-fidelity CSS gradient fallback displayed gracefully
   * whenever the local image file is not yet present on disk.
   */
  fallbackGradient: string;
  /**
   * Curated royalty-free Unsplash reference for easy download/selection.
   */
  suggestedUnsplashUrl?: string;
}

export const AUTH_BACKGROUND_IMAGES: AuthBackgroundImage[] = [
  {
    id: 1,
    filename: "AUTH_BG_PLACEHOLDER_01.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_01.jpg",
    title: "Minimal Modern Architecture",
    intendedVisual: "Minimal modern architecture with elegant geometric lines",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #1b3842 0%, #0d222b 50%, #08171d 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 2,
    filename: "AUTH_BG_PLACEHOLDER_02.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_02.jpg",
    title: "Misty Mountain Landscape",
    intendedVisual: "Misty mountain landscape in muted blue and green tones",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #163e46 0%, #1e4f57 50%, #0a262d 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 3,
    filename: "AUTH_BG_PLACEHOLDER_03.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_03.jpg",
    title: "Aerial Ocean Waves",
    intendedVisual: "Aerial ocean waves with sophisticated blue gradients",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #093740 0%, #0f5460 50%, #062329 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 4,
    filename: "AUTH_BG_PLACEHOLDER_04.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_04.jpg",
    title: "Contemporary Glass Office",
    intendedVisual: "Contemporary glass office building with natural light",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #1b3e48 0%, #2a5a68 50%, #112830 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 5,
    filename: "AUTH_BG_PLACEHOLDER_05.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_05.jpg",
    title: "Flowing Water Texture",
    intendedVisual: "Abstract close-up of flowing water or soft organic textures",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #10323a 0%, #1c525f 50%, #0a2228 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 6,
    filename: "AUTH_BG_PLACEHOLDER_06.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_06.jpg",
    title: "Atmospheric Forest Canopy",
    intendedVisual: "Minimal forest landscape with atmospheric depth",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #15383f 0%, #1a444a 50%, #0c2024 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 7,
    filename: "AUTH_BG_PLACEHOLDER_07.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_07.jpg",
    title: "Architectural Workspace",
    intendedVisual: "Modern workspace with architectural details and soft daylight",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #1e4550 0%, #2f6575 50%, #122c34 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 8,
    filename: "AUTH_BG_PLACEHOLDER_08.jpg",
    src: "/images/auth-background/AUTH_BG_PLACEHOLDER_08.jpg",
    title: "Abstract Blue-Grey Landscape",
    intendedVisual: "Abstract blue-grey landscape with subtle natural texture",
    alt: "",
    fallbackGradient: "linear-gradient(135deg, #14353d 0%, #224d57 50%, #0e242a 100%)",
    suggestedUnsplashUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
  },
];

/**
 * Helper to retrieve an image by 1-based placeholder ID.
 */
export function getAuthBackgroundImage(id: number): AuthBackgroundImage | undefined {
  return AUTH_BACKGROUND_IMAGES.find((img) => img.id === id);
}
