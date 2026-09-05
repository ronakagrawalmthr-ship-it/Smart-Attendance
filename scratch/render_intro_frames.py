import os
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = r"C:\Users\RONAK AGRAWAL\.gemini\antigravity-ide\brain\8b71f408-1134-4e19-901b-216e71f09aa7"
OUTPUT_DIR = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel"
FRAMES_DIR = os.path.join(OUTPUT_DIR, "processed_frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

book_img_path = os.path.join(SRC_DIR, "intro_sacred_book_1788496689499.jpg")

# Load fonts
font_card_sub = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 26)
font_q = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 46)
font_ans_head = ImageFont.truetype(r"C:\Windows\Fonts\georgiai.ttf", 34)
font_ans = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 52)
font_chap_intro = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 38)
font_badge = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 26)

def render_intro_frames():
    base = Image.open(book_img_path).convert("RGBA").resize((1080, 1920), Image.Resampling.LANCZOS)
    
    # -------------------------------------------------------------
    # FRAME INTRO 1: QUESTION
    # -------------------------------------------------------------
    img1 = base.copy()
    overlay1 = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(overlay1)
    
    # Dark subtle vignette
    for y in range(1920):
        # darker in upper half where question card sits
        dist = abs(y - 580)
        alpha = int(140 * max(0, 1 - dist/800.0))
        d1.line([(0, y), (1080, y)], fill=(5, 8, 14, alpha))
        
    # Top watermarks
    d1.text((50, 60), "✨ MADE BY RONAK", font=font_badge, fill=(255, 225, 150, 230))
    d1.text((820, 60), "JANMASHTAMI 2026", font=font_badge, fill=(230, 230, 240, 180))

    # Frosted Question Card (rounded rectangle)
    card_x0, card_y0, card_x1, card_y1 = 90, 480, 990, 720
    d1.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=32, fill=(16, 22, 34, 215), outline=(218, 165, 32, 190), width=2)
    
    # Small top tag inside card
    tag_text = "READER'S QUERY"
    bbox_tag = d1.textbbox((0, 0), tag_text, font=font_card_sub)
    w_tag = bbox_tag[2] - bbox_tag[0]
    d1.text(((1080 - w_tag)//2, card_y0 + 35), tag_text, font=font_card_sub, fill=(218, 165, 32, 240))
    
    # Question text
    q_line1 = "Which book do you want"
    q_line2 = "to read and why?"
    bbox_q1 = d1.textbbox((0, 0), q_line1, font=font_q)
    bbox_q2 = d1.textbbox((0, 0), q_line2, font=font_q)
    w_q1 = bbox_q1[2] - bbox_q1[0]
    w_q2 = bbox_q2[2] - bbox_q2[0]
    d1.text(((1080 - w_q1)//2, card_y0 + 85), q_line1, font=font_q, fill=(255, 255, 255, 255))
    d1.text(((1080 - w_q2)//2, card_y0 + 145), q_line2, font=font_q, fill=(255, 255, 255, 255))

    frame_intro_1 = Image.alpha_composite(img1, overlay1)
    frame_intro_1.convert("RGB").save(os.path.join(FRAMES_DIR, "intro_frame_01.png"), "PNG")
    print("Intro frame 1 generated.")

    # -------------------------------------------------------------
    # FRAME INTRO 2: QUESTION + ANSWER + "THE CHAPTERS ARE..."
    # -------------------------------------------------------------
    img2 = base.copy()
    overlay2 = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(overlay2)
    
    # Darker background vignette
    for y in range(1920):
        dist = abs(y - 650)
        alpha = int(180 * max(0, 1 - dist/850.0))
        d2.line([(0, y), (1080, y)], fill=(4, 6, 12, alpha))

    # Top watermarks
    d2.text((50, 60), "✨ MADE BY RONAK", font=font_badge, fill=(255, 225, 150, 230))
    d2.text((820, 60), "JANMASHTAMI 2026", font=font_badge, fill=(230, 230, 240, 180))

    # 1. Compact Question Card (at top)
    card_x0, card_y0, card_x1, card_y1 = 110, 360, 970, 510
    d2.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=24, fill=(14, 18, 28, 200), outline=(180, 150, 60, 150), width=1)
    q_compact = '"Which book do you want to read and why?"'
    bbox_qc = d2.textbbox((0, 0), q_compact, font=font_card_sub)
    w_qc = bbox_qc[2] - bbox_qc[0]
    d2.text(((1080 - w_qc)//2, card_y0 + 55), q_compact, font=font_card_sub, fill=(210, 215, 230, 240))

    # 2. Glowing Answer Card
    ans_x0, ans_y0, ans_x1, ans_y1 = 80, 560, 1000, 840
    # Outer glow
    d2.rounded_rectangle([ans_x0-4, ans_y0-4, ans_x1+4, ans_y1+4], radius=36, fill=(218, 165, 32, 45))
    d2.rounded_rectangle([ans_x0, ans_y0, ans_x1, ans_y1], radius=32, fill=(12, 16, 28, 235), outline=(255, 215, 110, 255), width=3)

    ans_sub = "My Favourite Book:"
    bbox_as = d2.textbbox((0, 0), ans_sub, font=font_ans_head)
    w_as = bbox_as[2] - bbox_as[0]
    d2.text(((1080 - w_as)//2, ans_y0 + 40), ans_sub, font=font_ans_head, fill=(255, 215, 110, 255))

    ans_main = "LORD KRISHNA"
    bbox_am = d2.textbbox((0, 0), ans_main, font=font_ans)
    w_am = bbox_am[2] - bbox_am[0]
    d2.text(((1080 - w_am)//2, ans_y0 + 95), ans_main, font=font_ans, fill=(255, 255, 255, 255))

    # Decorative divider
    d2.line([(540 - 150, ans_y0 + 170), (540 + 150, ans_y0 + 170)], fill=(218, 165, 32, 220), width=2)

    # Transition line: "The chapters are... ↓"
    chap_line = "The chapters are... ↓"
    bbox_cl = d2.textbbox((0, 0), chap_line, font=font_chap_intro)
    w_cl = bbox_cl[2] - bbox_cl[0]
    d2.text(((1080 - w_cl)//2, ans_y0 + 195), chap_line, font=font_chap_intro, fill=(255, 230, 140, 255))

    frame_intro_2 = Image.alpha_composite(img2, overlay2)
    frame_intro_2.convert("RGB").save(os.path.join(FRAMES_DIR, "intro_frame_02.png"), "PNG")
    print("Intro frame 2 generated.")

if __name__ == "__main__":
    render_intro_frames()
