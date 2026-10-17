import os
from PIL import Image, ImageDraw, ImageFont

# Target output directory in frontend/public/images/scroll-fx
output_dir = r"c:\Projects\Synapse\frontend\public\images\scroll-fx"
os.makedirs(output_dir, exist_ok=True)

sections = [
    {
        "filename": "section-1-intelligence.jpg",
        "num": "01",
        "title": "The Future of Project Management",
        "headline": "Manage Smarter.",
        "left": "INTELLIGENCE",
        "right": "SYNAPSE",
        "concept": "Connected systems, flowing data & interconnected nodes",
        "accent": (37, 134, 99),      # Synapse Green #258663
        "secondary": (168, 214, 207)  # Sage Light #A8D6CF
    },
    {
        "filename": "section-2-visibility.jpg",
        "num": "02",
        "title": "From Reactive to Proactive",
        "headline": "See What's Next.",
        "left": "VISIBILITY",
        "right": "PREDICTION",
        "concept": "Interconnected tasks, dependency lines & emerging risk signals",
        "accent": (52, 125, 145),     # Ocean Info #347D91
        "secondary": (148, 208, 222)
    },
    {
        "filename": "section-3-clarity.jpg",
        "num": "03",
        "title": "Requirements That Make Sense",
        "headline": "Build With Context.",
        "left": "CLARITY",
        "right": "AI REVIEW",
        "concept": "Contextual evidence, requirement specs & highlighted findings",
        "accent": (37, 132, 90),      # Success Emerald
        "secondary": (181, 224, 201)
    },
    {
        "filename": "section-4-workflow.jpg",
        "num": "04",
        "title": "Connected Development Workflows",
        "headline": "Every Task Connects.",
        "left": "WORKFLOW",
        "right": "DEPENDENCIES",
        "concept": "Backlogs, sprint planning, task chains & delivery pipelines",
        "accent": (75, 145, 161),     # Chart Blue
        "secondary": (190, 225, 235)
    },
    {
        "filename": "section-5-collaboration.jpg",
        "num": "05",
        "title": "AI-Assisted Team Intelligence",
        "headline": "Decisions With Context.",
        "left": "COLLABORATION",
        "right": "INSIGHTS",
        "concept": "Meeting insights, sprint summaries & semantic knowledge graphs",
        "accent": (42, 110, 95),
        "secondary": (160, 215, 195)
    },
    {
        "filename": "section-6-get-started.jpg",
        "num": "06",
        "title": "Build Your Next Project With Synapse",
        "headline": "Think Ahead.",
        "left": "GET STARTED",
        "right": "SYNAPSE",
        "concept": "Unified project context, confident decisions & clear direction",
        "accent": (37, 134, 99),
        "secondary": (213, 238, 228)
    }
]

W, H = 1920, 1080

def get_font(size, bold=False):
    # Try system fonts on Windows
    font_paths = [
        r"C:\Windows\Fonts\segoeui.ttf" if not bold else r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arial.ttf" if not bold else r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\consola.ttf" if not bold else r"C:\Windows\Fonts\consolab.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def get_mono_font(size):
    mono_paths = [
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\cour.ttf",
    ]
    for path in mono_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

font_title_sm = get_font(20, bold=True)
font_badge = get_font(16, bold=True)
font_huge = get_font(42, bold=True)
font_sub = get_font(24, bold=False)
font_mono = get_mono_font(30)
font_mono_sm = get_mono_font(20)

for s in sections:
    img = Image.new("RGB", (W, H), color=(7, 23, 22))
    draw = ImageDraw.Draw(img)
    
    # 1. Background gradient simulation
    bg_top = (10, 32, 30)
    bg_mid = (7, 22, 21)
    bg_bot = (5, 16, 15)
    for y in range(H):
        t = y / H
        if t < 0.5:
            f = t / 0.5
            r = int(bg_top[0] * (1-f) + bg_mid[0] * f)
            g = int(bg_top[1] * (1-f) + bg_mid[1] * f)
            b = int(bg_top[2] * (1-f) + bg_mid[2] * f)
        else:
            f = (t - 0.5) / 0.5
            r = int(bg_mid[0] * (1-f) + bg_bot[0] * f)
            g = int(bg_mid[1] * (1-f) + bg_bot[1] * f)
            b = int(bg_mid[2] * (1-f) + bg_bot[2] * f)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    
    # 2. Draw subtle grid
    grid_color = (25, 55, 50)
    step = 64
    for x in range(0, W, step):
        draw.line([(x, 0), (x, H)], fill=grid_color, width=1)
    for y in range(0, H, step):
        draw.line([(0, y), (W, y)], fill=grid_color, width=1)
        
    # 3. Draw ambient glow circles (concentric with lowering opacity)
    cx, cy = W // 2, H // 2 - 20
    accent = s["accent"]
    for rad in range(350, 40, -30):
        alpha = int(25 * (1 - rad / 350))
        glow_col = (
            int(bg_mid[0] + (accent[0] - bg_mid[0]) * (rad / 350) * 0.4),
            int(bg_mid[1] + (accent[1] - bg_mid[1]) * (rad / 350) * 0.4),
            int(bg_mid[2] + (accent[2] - bg_mid[2]) * (rad / 350) * 0.4),
        )
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=glow_col, width=2)
        
    # 4. Corner markings / precision brackets
    bracket_len = 50
    bracket_col = (50, 110, 95)
    margin = 48
    # Top-Left
    draw.line([(margin, margin), (margin + bracket_len, margin)], fill=bracket_col, width=2)
    draw.line([(margin, margin), (margin, margin + bracket_len)], fill=bracket_col, width=2)
    # Top-Right
    draw.line([(W - margin, margin), (W - margin - bracket_len, margin)], fill=bracket_col, width=2)
    draw.line([(W - margin, margin), (W - margin, margin + bracket_len)], fill=bracket_col, width=2)
    # Bottom-Left
    draw.line([(margin, H - margin), (margin + bracket_len, H - margin)], fill=bracket_col, width=2)
    draw.line([(margin, H - margin), (margin, H - margin - bracket_len)], fill=bracket_col, width=2)
    # Bottom-Right
    draw.line([(W - margin, H - margin), (W - margin - bracket_len, H - margin)], fill=bracket_col, width=2)
    draw.line([(W - margin, H - margin), (W - margin, H - margin - bracket_len)], fill=bracket_col, width=2)

    # Header Top Bar Info
    header_text = f"SYNAPSE // SCROLL FX BACKGROUND PLACEHOLDER — SECTION {s['num']}"
    draw.text((margin + bracket_len + 20, margin - 10), header_text, font=font_badge, fill=s["secondary"])
    
    # Left & Right Labels
    draw.text((margin + 10, H // 2 - 10), f"LEFT: {s['left']}", font=font_badge, fill=(120, 170, 160))
    right_text = f"RIGHT: {s['right']}"
    right_bbox = draw.textbbox((0, 0), right_text, font=font_badge)
    draw.text((W - margin - (right_bbox[2] - right_bbox[0]) - 10, H // 2 - 10), right_text, font=font_badge, fill=(120, 170, 160))

    # 5. Center Card Frame
    card_w, card_h = 1100, 460
    card_x1, card_y1 = (W - card_w) // 2, (H - card_h) // 2
    card_x2, card_y2 = card_x1 + card_w, card_y1 + card_h
    
    # Card background
    draw.rectangle([card_x1, card_y1, card_x2, card_y2], fill=(12, 38, 35), outline=s["accent"], width=2)
    
    # Card top strip
    draw.rectangle([card_x1, card_y1, card_x2, card_y1 + 45], fill=(18, 55, 50))
    strip_title = f"IMAGE REPLACEMENT TARGET:  SECTION {s['num']}  —  \"{s['headline']}\""
    draw.text((card_x1 + 24, card_y1 + 12), strip_title, font=font_badge, fill=(210, 240, 230))

    # Filename Box inside card
    fn_box_y = card_y1 + 80
    fn_box_h = 90
    draw.rectangle([card_x1 + 40, fn_box_y, card_x2 - 40, fn_box_y + fn_box_h], fill=(6, 20, 18), outline=(37, 134, 99), width=2)
    
    label_save = "SAVE YOUR IMAGE WITH THIS EXACT FILENAME:"
    draw.text((card_x1 + 60, fn_box_y + 12), label_save, font=font_badge, fill=(160, 210, 195))
    
    filepath_display = f"public/images/scroll-fx/{s['filename']}"
    draw.text((card_x1 + 60, fn_box_y + 40), filepath_display, font=font_mono, fill=(100, 255, 200))

    # Section Details & Recommended Visual
    content_y = fn_box_y + fn_box_h + 30
    draw.text((card_x1 + 50, content_y), f"Section {s['num']}: {s['title']}", font=font_sub, fill=(230, 245, 240))
    draw.text((card_x1 + 50, content_y + 40), f"Center Headline: \"{s['headline']}\"", font=font_sub, fill=s["secondary"])
    draw.text((card_x1 + 50, content_y + 80), f"Recommended Visual: {s['concept']}", font=font_badge, fill=(150, 190, 180))
    
    # Instructions Footer in Card
    instr_text = "✨ When you save your image in public/images/scroll-fx/, this placeholder is automatically replaced!"
    draw.text((card_x1 + 50, card_y2 - 50), instr_text, font=font_badge, fill=(130, 230, 185))
    
    specs_text = "Recommended: 1920x1080 or 2560x1440 | JPG / PNG / WebP | Max 800KB recommended"
    draw.text((card_x1 + 50, card_y2 - 26), specs_text, font=font_mono_sm, fill=(110, 150, 140))

    # Bottom notice
    bottom_notice = "Synapse AI-Powered Project Management Platform • MCA Capstone Implementation"
    draw.text((W // 2 - 300, H - margin - 5), bottom_notice, font=font_badge, fill=(90, 130, 120))

    target_path = os.path.join(output_dir, s["filename"])
    img.save(target_path, "JPEG", quality=95)
    print(f"Generated: {target_path}")

print("All 6 placeholder images generated successfully!")
