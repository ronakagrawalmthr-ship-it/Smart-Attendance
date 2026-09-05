import os
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = r"C:\Users\RONAK AGRAWAL\.gemini\antigravity-ide\brain\8b71f408-1134-4e19-901b-216e71f09aa7"
OUTPUT_DIR = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel"
FRAMES_DIR = os.path.join(OUTPUT_DIR, "processed_frames")
CLIPS_DIR = os.path.join(OUTPUT_DIR, "clips")
AUDIO_FILE = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\devotional_audio_v2.wav"
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "krishna_janmashtami_reel_by_ronak.mp4")
FFMPEG_PATH = r"C:\Users\RONAK AGRAWAL\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

def render_intro_clips():
    intro_clips = []
    
    # 1. Intro 1: Question (2.5 seconds)
    f1 = os.path.join(FRAMES_DIR, "intro_frame_01.png")
    c1 = os.path.join(CLIPS_DIR, "intro_clip_01.mp4")
    vf1 = "zoompan=z='min(zoom+0.0008,1.05)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30"
    cmd1 = [
        FFMPEG_PATH, "-y",
        "-loop", "1",
        "-i", f1,
        "-vf", vf1,
        "-t", "2.5",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        c1
    ]
    print("Rendering Intro Clip 1 (Question)...")
    subprocess.run(cmd1, check=True)
    intro_clips.append(c1)

    # 2. Intro 2: Answer + "The chapters are..." (3.0 seconds)
    f2 = os.path.join(FRAMES_DIR, "intro_frame_02.png")
    c2 = os.path.join(CLIPS_DIR, "intro_clip_02.mp4")
    vf2 = "zoompan=z='min(zoom+0.0009,1.06)':d=90:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30"
    cmd2 = [
        FFMPEG_PATH, "-y",
        "-loop", "1",
        "-i", f2,
        "-vf", vf2,
        "-t", "3.0",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        c2
    ]
    print("Rendering Intro Clip 2 (Answer & Chapters)...")
    subprocess.run(cmd2, check=True)
    intro_clips.append(c2)

    return intro_clips

def assemble_full_reel(intro_clips):
    # Collect all 11 clips: 2 intro clips + 9 chapter clips
    all_clips = []
    all_clips.extend(intro_clips)
    
    for idx in range(9):
        chap_clip = os.path.join(CLIPS_DIR, f"clip_{idx:02d}.mp4")
        if not os.path.exists(chap_clip):
            raise FileNotFoundError(f"Missing chapter clip: {chap_clip}")
        all_clips.append(chap_clip)

    print(f"Total clips to assemble: {len(all_clips)}")

    # Concat file
    concat_list = os.path.join(CLIPS_DIR, "concat_full.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for clip in all_clips:
            clean_path = clip.replace("\\", "/")
            f.write(f"file '{clean_path}'\n")

    temp_video = os.path.join(OUTPUT_DIR, "temp_full_video_no_audio.mp4")

    # 1. Concat all video clips
    concat_cmd = [
        FFMPEG_PATH, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        temp_video
    ]
    print("Concatenating all clips (Intro + 9 Chapters)...")
    subprocess.run(concat_cmd, check=True)

    # 2. Merge with synthesized devotional audio v2 (Pure SFX + Music, No Voice)
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
    print("Muxing video with SFX soundtrack...")
    subprocess.run(final_cmd, check=True)
    print(f"[SUCCESS] Instagram Reel Created Successfully at: {FINAL_VIDEO}")

if __name__ == "__main__":
    intros = render_intro_clips()
    assemble_full_reel(intros)
