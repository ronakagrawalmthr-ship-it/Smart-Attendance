import os
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = r"C:\Users\RONAK AGRAWAL\.gemini\antigravity-ide\brain\8b71f408-1134-4e19-901b-216e71f09aa7"
OUTPUT_DIR = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel"
FRAMES_DIR = os.path.join(OUTPUT_DIR, "processed_frames")
CLIPS_DIR = os.path.join(OUTPUT_DIR, "clips")
AUDIO_FILE = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\devotional_audio.wav"
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "krishna_janmashtami_reel_by_ronak.mp4")
FFMPEG_PATH = r"C:\Users\RONAK AGRAWAL\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

SCENES = [
    {
        "file": "scene1_kansa_palace_1788495251391.jpg",
        "chapter": "CHAPTER I • ANCIENT MATHURA",
        "title": "The Dark Tyranny of King Kansa",
        "quote": "Fear looms over the ancient city...",
        "zoom": "in"
    },
    {
        "file": "scene2_devaki_vasudev_1788495290291.jpg",
        "chapter": "CHAPTER II • THE STONE PRISON",
        "title": "Devaki & Vasudeva's Prayers",
        "quote": "Hope endures in the darkest midnight...",
        "zoom": "in"
    },
    {
        "file": "scene4_krishna_birth_1788495322310.jpg",
        "chapter": "CHAPTER III • DIVINE DESCENT",
        "title": "Shri Krishna Ka Divya Janm",
        "quote": "The darkness illuminates with celestial light...",
        "zoom": "in"
    },
    {
        "file": "scene6_yamuna_sheshnag_1788495367413.jpg",
        "chapter": "CHAPTER IV • CROSSING YAMUNA",
        "title": "Sheshnag's Divine Protection",
        "quote": "Vasudeva carries the Lord through the tempest...",
        "zoom": "in"
    },
    {
        "file": "scene8_yashoda_maiya_1788495423898.jpg",
        "chapter": "CHAPTER V • GOKUL DHAM",
        "title": "Yashoda Maiya's Boundless Love",
        "quote": "A golden dawn breaks in Gokul...",
        "zoom": "in"
    },
    {
        "file": "scene10_makhan_chor_1788495469106.jpg",
        "chapter": "CHAPTER VI • BAL LEELA",
        "title": "The Beloved Makhan Chor",
        "quote": "Joy, laughter and pure divine innocence...",
        "zoom": "in"
    },
    {
        "file": "scene12_kaliya_leela_1788495505877.jpg",
        "chapter": "CHAPTER VII • KALIYA DAMAN",
        "title": "Triumph of Divine Grace",
        "quote": "Subduing pride upon the sacred waters...",
        "zoom": "in"
    },
    {
        "file": "scene13_govardhan_leela_1788495675497.jpg",
        "chapter": "CHAPTER VIII • GOVARDHAN LEELA",
        "title": "Shelter of the Supreme",
        "quote": "Lifting the mountain on a single finger...",
        "zoom": "in"
    },
    {
        "file": "scene14_krishna_vrindavan_1788495768452.jpg",
        "chapter": "HAPPY KRISHNA JANMASHTAMI",
        "title": "Divine Melody of Vrindavan",
        "quote": "✦ Directed & Created by Ronak ✦",
        "zoom": "in"
    }
]

def load_fonts():
    try:
        font_chap = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 36)
        font_title = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 52)
        font_quote = ImageFont.truetype(r"C:\Windows\Fonts\georgiai.ttf", 34)
        font_badge = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 26)
    except:
        font_chap = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_quote = ImageFont.load_default()
        font_badge = ImageFont.load_default()
    return font_chap, font_title, font_quote, font_badge

def process_images():
    font_chap, font_title, font_quote, font_badge = load_fonts()
    processed_paths = []

    for idx, sc in enumerate(SCENES):
        src_path = os.path.join(SRC_DIR, sc["file"])
        dst_copy = os.path.join(OUTPUT_DIR, f"scene_{idx+1}.jpg")
        shutil.copy2(src_path, dst_copy)
        
        # Open and resize to standard 1080x1920
        img = Image.open(src_path).convert("RGBA")
        img = img.resize((1080, 1920), Image.Resampling.LANCZOS)
        
        # Create dark gradient overlay for bottom typography (35% height)
        overlay = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
        draw_ov = ImageDraw.Draw(overlay)
        
        grad_start = 1920 - 520
        for y in range(grad_start, 1920):
            alpha = int(220 * ((y - grad_start) / 520.0)**1.2)
            draw_ov.line([(0, y), (1080, y)], fill=(8, 12, 22, alpha))
            
        # Top vignette
        for y in range(0, 200):
            alpha = int(140 * ((200 - y) / 200.0))
            draw_ov.line([(0, y), (1080, y)], fill=(5, 8, 15, alpha))

        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)
        
        # Top watermark credit: "Made by Ronak"
        watermark = "✨ MADE BY RONAK"
        draw.text((50, 60), watermark, font=font_badge, fill=(255, 225, 150, 230))
        
        # Top right audio icon indicator
        draw.text((880, 60), "JANMASHTAMI 2026", font=font_badge, fill=(230, 230, 240, 180))

        # Bottom typography card
        chap_text = sc["chapter"]
        title_text = sc["title"]
        quote_text = sc["quote"]

        # Center aligned text
        # Chapter text (Golden)
        bbox_c = draw.textbbox((0, 0), chap_text, font=font_chap)
        w_c = bbox_c[2] - bbox_c[0]
        draw.text(((1080 - w_c) // 2, 1920 - 360), chap_text, font=font_chap, fill=(255, 215, 110, 255))

        # Decorative line
        line_w = 260
        draw.line([(540 - line_w//2, 1920 - 305), (540 + line_w//2, 1920 - 305)], fill=(218, 165, 32, 200), width=2)
        # Small diamond in center
        draw.polygon([(540, 1920 - 310), (545, 1920 - 305), (540, 1920 - 300), (535, 1920 - 305)], fill=(255, 230, 140))

        # Title text (Crisp White / Cream)
        bbox_t = draw.textbbox((0, 0), title_text, font=font_title)
        w_t = bbox_t[2] - bbox_t[0]
        draw.text(((1080 - w_t) // 2, 1920 - 280), title_text, font=font_title, fill=(255, 255, 255, 255))

        # Quote / subtitle text (Soft Silver/Gold)
        bbox_q = draw.textbbox((0, 0), quote_text, font=font_quote)
        w_q = bbox_q[2] - bbox_q[0]
        draw.text(((1080 - w_q) // 2, 1920 - 190), quote_text, font=font_quote, fill=(235, 210, 165, 240))

        out_img_path = os.path.join(FRAMES_DIR, f"frame_{idx:02d}.png")
        img.convert("RGB").save(out_img_path, "PNG")
        processed_paths.append(out_img_path)
        print(f"Processed frame {idx+1}/{len(SCENES)}: {out_img_path}")

    return processed_paths

def render_clips():
    clip_files = []
    # Each scene clip is 4.5 seconds at 30 fps (135 frames) with slow cinematic zoom-in
    for idx, sc in enumerate(SCENES):
        frame_path = os.path.join(FRAMES_DIR, f"frame_{idx:02d}.png")
        clip_path = os.path.join(CLIPS_DIR, f"clip_{idx:02d}.mp4")
        
        # Ken Burns zoom-in filter: scale up slowly from 1.0 to 1.08 over 4.5 seconds
        vf = "zoompan=z='min(zoom+0.0006,1.08)':d=135:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30"
        
        cmd = [
            FFMPEG_PATH, "-y",
            "-loop", "1",
            "-i", frame_path,
            "-vf", vf,
            "-t", "4.5",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "veryfast",
            clip_path
        ]
        print(f"Rendering clip {idx+1}...")
        subprocess.run(cmd, check=True)
        clip_files.append(clip_path)

    return clip_files

def assemble_reel(clip_files):
    # Concat file
    concat_list = os.path.join(CLIPS_DIR, "concat.txt")
    with open(concat_list, "w") as f:
        for clip in clip_files:
            # Escape path for ffmpeg concat demuxer
            clean_path = clip.replace("\\", "/")
            f.write(f"file '{clean_path}'\n")

    temp_video = os.path.join(OUTPUT_DIR, "temp_video_no_audio.mp4")
    
    # 1. Concat all video clips
    concat_cmd = [
        FFMPEG_PATH, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        temp_video
    ]
    print("Concatenating video clips...")
    subprocess.run(concat_cmd, check=True)

    # 2. Merge with synthesized devotional audio
    final_cmd = [
        FFMPEG_PATH, "-y",
        "-i", temp_video,
        "-i", AUDIO_FILE,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_VIDEO
    ]
    print("Muxing video with devotional audio...")
    subprocess.run(final_cmd, check=True)
    print(f"\n✨ Instagram Reel Created Successfully! ✨\nPath: {FINAL_VIDEO}")

if __name__ == "__main__":
    print("Step 1: Processing images with cinematic typography...")
    process_images()
    print("Step 2: Rendering video clips with Ken Burns camera motion...")
    clips = render_clips()
    print("Step 3: Assembling final reel...")
    assemble_reel(clips)
