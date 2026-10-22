# Synapse Authentication Background Imagery

This directory stores the photographs displayed in the full-screen diagonal marquee background on the Synapse **Login** and **Sign Up** pages.

## How to Add or Replace Images

Save your chosen photographs directly into this folder using the exact filenames listed below. The carousel will automatically detect and render them without requiring any code changes.

### Recommended Image Specs:
- **Aspect Ratio:** `3:2` or `16:10` (Landscape)
- **Resolution:** `800x533` up to `1200x800` pixels (optimized for web performance)
- **Format:** `.jpg`, `.webp`, or `.avif` (compressed to ~80–150 KB each)
- **Aesthetic Tone:** Calming architectural lines, cool blue-grey tones, misty nature, minimalist workspaces, and subtle natural textures to complement Synapse's deep navy and cyan design system.

---

## Centralized Placeholder Catalog

| ID | Required Filename | Intended Visual Mood & Subject | Suggested Unsplash Search / Reference |
|---|---|---|---|
| **01** | `AUTH_BG_PLACEHOLDER_01.jpg` | Minimal modern architecture with elegant geometric lines | Minimalist concrete & glass architecture, clean shadows |
| **02** | `AUTH_BG_PLACEHOLDER_02.jpg` | Misty mountain landscape in muted blue and green tones | Foggy pine mountains, Scandinavian morning atmosphere |
| **03** | `AUTH_BG_PLACEHOLDER_03.jpg` | Aerial ocean waves with sophisticated blue gradients | Deep cyan/navy sea foam, gentle coastal aerial shot |
| **04** | `AUTH_BG_PLACEHOLDER_04.jpg` | Contemporary glass office building with natural light | Modern tech campus facade, structural reflections |
| **05** | `AUTH_BG_PLACEHOLDER_05.jpg` | Abstract close-up of flowing water or soft organic textures | Rippling clean water surface, organic mineral lines |
| **06** | `AUTH_BG_PLACEHOLDER_06.jpg` | Minimal forest landscape with atmospheric depth | Quiet mist among conifers, atmospheric spruce forest |
| **07** | `AUTH_BG_PLACEHOLDER_07.jpg` | Modern workspace with architectural details and soft daylight | Scandinavian designer studio desk, ambient morning sun |
| **08** | `AUTH_BG_PLACEHOLDER_08.jpg` | Abstract blue-grey landscape with subtle natural texture | Muted basalt rocks, Icelandic overcast coast, subtle textures |

---

## Fallback Behavior

If any or all image files are missing from this directory, the carousel renders **graceful, curated CSS gradients** with subtle geometric accents tailored to each image's intended color palette. No broken image icons or missing asset warnings will ever be shown to visitors.
