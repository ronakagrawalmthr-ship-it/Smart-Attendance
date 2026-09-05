import os
import numpy as np
from scipy.io import wavfile
import subprocess

SAMPLE_RATE = 44100
TOTAL_SECONDS = 46.0
TOTAL_SAMPLES = int(SAMPLE_RATE * TOTAL_SECONDS)

ASSETS_DIR = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel\audio_assets"
OUTPUT_WAV = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\devotional_audio_indian.wav"
FINAL_VIDEO = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel\krishna_janmashtami_reel_by_ronak.mp4"
TEMP_VIDEO = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\krishna_janmashtami_reel\temp_full_video_no_audio.mp4"
FFMPEG_PATH = r"C:\Users\RONAK AGRAWAL\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"

def load_audio(filename):
    path = os.path.join(ASSETS_DIR, filename)
    sr, data = wavfile.read(path)
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2147483648.0
    if len(data.shape) == 1:
        data = np.column_stack((data, data))
    return data

def make_tanpura(duration_s):
    """Warm meditative Indian Tanpura acoustic drone (Sa - Pa - Sa)."""
    t = np.linspace(0, duration_s, int(SAMPLE_RATE * duration_s))
    drone = np.zeros((len(t), 2))
    
    # Fundamental C3 (130.81 Hz), Pa G3 (196.0 Hz), High Sa C4 (261.63 Hz), Sub Sa C2 (65.4 Hz)
    partials = [
        (65.41, 0.28, 0.0),
        (130.81, 0.35, -0.15),
        (196.00, 0.26, 0.15),
        (261.63, 0.20, -0.10),
        (392.00, 0.12, 0.10),
        (523.25, 0.08, 0.0)
    ]
    for f, amp, pan in partials:
        mod = 1.0 + 0.05 * np.sin(2 * np.pi * 0.18 * t)
        tone = np.sin(2 * np.pi * f * t) * mod
        l_gain = np.cos((pan + 1.0) * np.pi / 4.0)
        r_gain = np.sin((pan + 1.0) * np.pi / 4.0)
        drone[:, 0] += tone * amp * l_gain
        drone[:, 1] += tone * amp * r_gain
        
    return drone * 0.18

def make_page_turn(duration_s=0.6):
    """Acoustic book page turn rustle."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    noise = np.random.randn(length)
    env = np.sin(np.pi * t / duration_s)**2.5
    kernel = np.ones(35) / 35
    filtered = np.convolve(noise, kernel, mode='same') * env * 0.08
    return np.column_stack((filtered, filtered))

def make_wind_chime_transition(duration_s=1.8):
    """Gentle breeze whoosh with soft temple chime for smooth chapter transitions."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    noise = np.random.randn(length)
    env = np.sin(np.pi * t / duration_s)**2.0
    kernel = np.ones(60) / 60
    wind = np.convolve(noise, kernel, mode='same') * env * 0.06
    # Subtle chime partials
    chime = 0.04 * np.sin(2 * np.pi * 1046.5 * t) * np.exp(-3.0 * t)
    sig = wind + chime
    return np.column_stack((sig, sig))

def build_indian_cinematic_audio():
    master = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)

    print("1. Loading Real Indian Acoustic Assets...")
    rain_data = load_audio("rain_thunder_std.wav")
    conch_data = load_audio("conch_std.wav")
    singing_bowl_data = load_audio("singing_bowl_std.wav")
    flute_data = load_audio("flute2_std.wav")

    def add_clip(clip, start_time_s, gain=1.0, fade_in_s=0.0, fade_out_s=0.0):
        start_idx = int(start_time_s * SAMPLE_RATE)
        clip_len = len(clip)
        end_idx = min(TOTAL_SAMPLES, start_idx + clip_len)
        actual_len = end_idx - start_idx
        if actual_len <= 0:
            return

        c = clip[:actual_len].copy()
        
        # Apply fade in
        if fade_in_s > 0:
            fi_len = min(actual_len, int(fade_in_s * SAMPLE_RATE))
            fi_curve = np.linspace(0, 1, fi_len)[:, None]
            c[:fi_len] *= fi_curve
            
        # Apply fade out
        if fade_out_s > 0:
            fo_len = min(actual_len, int(fade_out_s * SAMPLE_RATE))
            fo_curve = np.linspace(1, 0, fo_len)[:, None]
            c[-fo_len:] *= fo_curve
            
        master[start_idx:end_idx] += c * gain

    print("2. Layering Tanpura Meditative Drone...")
    tanpura = make_tanpura(TOTAL_SECONDS)
    # Gentle fade in at start, fade out at end
    tanpura[:int(SAMPLE_RATE*2)] *= np.linspace(0, 1, int(SAMPLE_RATE*2))[:, None]
    tanpura[-int(SAMPLE_RATE*3):] *= np.linspace(1, 0, int(SAMPLE_RATE*3))[:, None]
    master += tanpura

    print("3. Layering Intro Hook Sound Effects (0.0s - 5.5s)...")
    # Natural book page turn
    page_sfx = make_page_turn(0.7)
    add_clip(page_sfx, 0.5, gain=0.9)

    # Sweet sacred temple bell chime on Question ("Which book do you want to read and why?")
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*4.5)], 0.9, gain=0.55, fade_out_s=1.2)

    # Opening divine flute phrase on Answer ("My favourite book — Lord Krishna")
    # Using the beautiful opening 4 seconds of the real bansuri
    add_clip(flute_data[:int(SAMPLE_RATE*3.2)], 2.7, gain=0.65, fade_in_s=0.3, fade_out_s=0.6)

    # Gentle wind chime transition into the chapters ("The chapters are... ↓")
    trans_sfx = make_wind_chime_transition(1.6)
    add_clip(trans_sfx, 4.0, gain=0.8)

    print("4. Layering Bhadrapada Storm & Rain (5.5s - 19.0s)...")
    # Real natural monsoon rain & distant thunder
    rain_section = rain_data[:int(SAMPLE_RATE * 15.0)]
    # Normalize rain volume so it sits naturally in background
    rain_max = np.max(np.abs(rain_section))
    if rain_max > 0:
        rain_norm = (rain_section / rain_max) * 0.28
    else:
        rain_norm = rain_section
    add_clip(rain_norm, 5.5, gain=1.0, fade_in_s=1.0, fade_out_s=3.0)

    # Atmospheric temple bell echoing in the midnight prison
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*4.0)], 10.0, gain=0.45, fade_out_s=1.5)

    print("5. Layering Divine Birth (14.5s: Shankhanaad & Sacred Bells)...")
    # Authentic Shankha (Conch Shell) blast at Lord Krishna's Divine Birth
    conch_max = np.max(np.abs(conch_data))
    conch_norm = (conch_data / conch_max) * 0.82
    add_clip(conch_norm, 14.2, gain=1.0, fade_in_s=0.2, fade_out_s=1.0)

    # Resonant celebratory temple bell with the Shankha
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*5.5)], 14.5, gain=0.65, fade_out_s=1.5)

    print("6. Layering Soul-Stirring Indian Bansuri Flute (18.5s - 46.0s)...")
    # From Gokul arrival, Yashoda Maiya, Makhan Chor to Vrindavan Finale
    # Real Bansuri Flute performance takes over the entire melodic heart of the reel
    flute_melody = flute_data[int(SAMPLE_RATE * 3.5):int(SAMPLE_RATE * (3.5 + 27.5))]
    fl_max = np.max(np.abs(flute_melody))
    flute_norm = (flute_melody / fl_max) * 0.88
    add_clip(flute_norm, 18.5, gain=1.0, fade_in_s=1.5, fade_out_s=3.0)

    # Sacred temple bells marking chapter transitions gently
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*4.0)], 23.5, gain=0.40, fade_out_s=1.5) # Gokul
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*4.0)], 32.5, gain=0.40, fade_out_s=1.5) # Kaliya Leela
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*5.0)], 37.0, gain=0.45, fade_out_s=1.8) # Govardhan Leela
    add_clip(singing_bowl_data[:int(SAMPLE_RATE*6.0)], 41.5, gain=0.55, fade_out_s=2.5) # Vrindavan Finale

    print("7. Mastering & Exporting Authentic Indian Soundtrack...")
    # Normalize master audio to peak at -0.5 dB
    peak = np.max(np.abs(master))
    if peak > 0:
        master = (master / peak) * 0.94
        
    int16_master = (master * 32767).astype(np.int16)
    wavfile.write(OUTPUT_WAV, SAMPLE_RATE, int16_master)
    print(f"Authentic Indian soundtrack generated at: {OUTPUT_WAV}")

    print("8. Muxing with Final Video via FFmpeg...")
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", TEMP_VIDEO,
        "-i", OUTPUT_WAV,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "256k",
        "-shortest",
        FINAL_VIDEO
    ]
    subprocess.run(cmd, check=True)
    print(f"[SUCCESS] Updated Instagram Reel generated at: {FINAL_VIDEO}")

if __name__ == "__main__":
    build_indian_cinematic_audio()
