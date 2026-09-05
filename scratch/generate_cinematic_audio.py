import numpy as np
from scipy.io import wavfile
import subprocess
import os

SAMPLE_RATE = 44100
OUTPUT_RAW_WAV = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\scratch\cinematic_raw.wav"
OUTPUT_PROCESSED_WAV = r"c:\Users\RONAK AGRAWAL\Projects\Smart Attendance(Antigravity)\devotional_audio_cinematic.wav"
FFMPEG_PATH = r"C:\Users\RONAK AGRAWAL\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"

def stereo_pan(mono_signal, pan=0.0):
    """Pan a mono signal: -1.0 is Left, +1.0 is Right, 0.0 is Center."""
    left_gain = np.cos((pan + 1.0) * np.pi / 4.0)
    right_gain = np.sin((pan + 1.0) * np.pi / 4.0)
    return np.column_stack((mono_signal * left_gain, mono_signal * right_gain))

def synth_trailer_braaam(duration_s=3.8, f0=55.0):
    """
    Synthesize an epic Hans Zimmer / Inception trailer BRAAAM sound:
    Distorted low brass, sub-bass pulse, aggressive saw wave with filter sweep.
    """
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Pitch drop (slight downwards pitch bend like a massive brass horn)
    pitch_env = f0 * (1.0 - 0.12 * (t / duration_s)**0.7)
    phase = 2 * np.pi * np.cumsum(pitch_env) / SAMPLE_RATE
    
    # Multi-oscillator saw + square wave for raw brass power
    osc1 = 2 * (phase / (2 * np.pi) - np.floor(phase / (2 * np.pi) + 0.5))
    osc2 = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.35 * np.sin(3 * phase)
    sub = np.sin(2 * np.pi * 32.7 * t) # Low C sub-bass
    
    raw = 0.5 * osc1 + 0.7 * osc2 + 0.6 * sub
    
    # Saturation / Distortion (soft clipping)
    saturated = np.tanh(raw * 2.8)
    
    # Amplitude envelope: explosive punchy attack, sustained roar, gradual release
    attack = np.minimum(1.0, t * 40.0)
    decay = np.exp(-1.1 * t)
    env = attack * decay
    
    # Stereo widening via slight detuned channel
    phase_r = 2 * np.pi * np.cumsum(pitch_env * 1.006) / SAMPLE_RATE
    osc_r = 0.5 * np.sin(phase_r) + 0.5 * np.tanh(osc1 * 2.5)
    
    left = saturated * env * 0.45
    right = (saturated * 0.5 + osc_r * 0.5) * env * 0.45
    return np.column_stack((left, right))

def synth_sub_impact(duration_s=3.0, f_start=130.0, f_end=35.0):
    """Deep chest-thumping cinematic trailer boom / sub drop."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Exponential pitch sweep
    pitch = f_start * np.exp(-7.0 * t) + f_end
    phase = 2 * np.pi * np.cumsum(pitch) / SAMPLE_RATE
    
    sub = np.sin(phase) * np.exp(-2.5 * t)
    
    # Punch click / transient
    click_len = int(0.04 * SAMPLE_RATE)
    click = np.zeros(length)
    click[:click_len] = np.sin(2 * np.pi * 280 * t[:click_len]) * np.exp(-90 * t[:click_len])
    
    impact = (sub * 0.7 + click * 0.3)
    return stereo_pan(impact, 0.0)

def synth_cinematic_riser(duration_s=2.2):
    """Intense cinematic trailer riser whoosh building tension."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Ascending exponential pitch sweep
    f_sweep = 60.0 + 850.0 * (t / duration_s)**2.5
    phase = 2 * np.pi * np.cumsum(f_sweep) / SAMPLE_RATE
    tone = np.sin(phase) * (t / duration_s)**2.0 * 0.25
    
    # Filtered air noise whoosh
    noise = np.random.randn(length) * (t / duration_s)**2.8 * 0.2
    
    # Stereo panning whoosh from Left to Center to Right
    pan = np.linspace(-0.8, 0.8, length)
    left = (tone + noise) * np.cos((pan + 1.0) * np.pi / 4.0)
    right = (tone + noise) * np.sin((pan + 1.0) * np.pi / 4.0)
    return np.column_stack((left, right))

def synth_thunderclap(duration_s=4.0):
    """Photorealistic cinematic rolling thunder strike with lightning crack."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Initial lightning crack
    crack_len = int(0.12 * SAMPLE_RATE)
    crack = np.random.randn(crack_len) * np.exp(-35 * t[:crack_len]) * 0.5
    
    # Low frequency rolling rumble (20Hz - 100Hz)
    rumble = np.zeros(length)
    for f in [35.0, 48.0, 62.0, 85.0]:
        rumble += np.sin(2 * np.pi * f * t + np.random.rand()*6) * np.exp(-1.2 * t)
    
    noise_rumble = np.random.randn(length) * np.exp(-1.4 * t)
    # Lowpass filter
    kernel = np.ones(45) / 45
    noise_filtered = np.convolve(noise_rumble, kernel, mode='same')
    
    thunder = np.zeros(length)
    thunder[:crack_len] += crack
    thunder += rumble * 0.35 + noise_filtered * 0.4
    
    pan = 0.2
    return stereo_pan(thunder * 0.65, pan)

def synth_temple_gong(duration_s=4.5, freq=520.0):
    """Rich Tibetan/Vedic brass temple gong with long metallic decay."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    harmonics = [
        (1.0, 0.9, 1.8),
        (2.76, 0.6, 2.2),
        (4.07, 0.4, 2.8),
        (5.42, 0.3, 3.4),
        (8.91, 0.2, 4.2),
        (11.3, 0.1, 5.0)
    ]
    sig = np.zeros(length)
    for mult, amp, decay in harmonics:
        f = freq * mult
        sig += amp * np.sin(2 * np.pi * f * t) * np.exp(-decay * t)
    
    strike = np.minimum(1.0, t * 800)
    gong = sig * strike * 0.3
    # Stereo reflection
    left = gong
    right = np.roll(gong, int(0.015 * SAMPLE_RATE)) * 0.85
    return np.column_stack((left, right))

def synth_celestial_chime_chord(duration_s=3.0):
    """Ethereal celestial chime chord for Krishna revelation."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    freqs = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98] # C Maj9
    left = np.zeros(length)
    right = np.zeros(length)
    
    for i, f in enumerate(freqs):
        offset = int(i * 0.09 * SAMPLE_RATE)
        sub_len = length - offset
        if sub_len > 0:
            t_sub = t[:sub_len]
            note = np.sin(2 * np.pi * f * t_sub) * np.exp(-3.2 * t_sub) * 0.08
            p = (i / len(freqs)) * 1.6 - 0.8
            l_gain = np.cos((p + 1.0) * np.pi / 4.0)
            r_gain = np.sin((p + 1.0) * np.pi / 4.0)
            left[offset:] += note * l_gain
            right[offset:] += note * r_gain
            
    return np.column_stack((left, right))

def synth_conch_shell(duration_s=4.5):
    """Vedic Shankha (Sacred Conch) powerful resonant blast."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    f_base = 225.0 + 12.0 * np.sin(np.linspace(0, np.pi, length))
    phase = 2 * np.pi * np.cumsum(f_base) / SAMPLE_RATE
    
    shankha = (
        np.sin(phase) +
        0.65 * np.sin(2 * phase) +
        0.45 * np.sin(3 * phase) +
        0.30 * np.sin(4 * phase) +
        0.18 * np.sin(5 * phase)
    )
    # Natural breath modulation
    mod = 1.0 + 0.06 * np.sin(2 * np.pi * 5.5 * t)
    env = (np.sin(np.pi * t / duration_s)**2.2) * mod
    shankha_out = np.tanh(shankha * 1.6) * env * 0.4
    return stereo_pan(shankha_out, 0.0)

def synth_cinematic_bansuri(freq, duration_s, pan=0.0):
    """Soulful Indian bamboo flute with rich breath and vibrato."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Subtle organic pitch glide & vibrato
    vib_env = np.clip((t - 0.12) / 0.35, 0, 1)
    pitch_mod = 1.0 + 0.018 * vib_env * np.sin(2 * np.pi * 4.8 * t)
    phase = 2 * np.pi * freq * np.cumsum(pitch_mod) / SAMPLE_RATE
    
    tone = (
        np.sin(phase) +
        0.38 * np.sin(2 * phase) +
        0.18 * np.sin(3 * phase) +
        0.08 * np.sin(4 * phase)
    )
    # Airy breath texture
    breath = np.random.randn(length) * 0.035
    tone += breath
    
    # Smooth expressive envelope
    att_len = int(SAMPLE_RATE * min(0.2, duration_s * 0.25))
    rel_len = int(SAMPLE_RATE * min(0.3, duration_s * 0.3))
    env = np.ones(length)
    env[:att_len] = np.sin(np.linspace(0, np.pi/2, att_len))
    env[-rel_len:] = np.sin(np.linspace(np.pi/2, 0, rel_len))
    
    flute = tone * env * 0.38
    return stereo_pan(flute, pan)

def synth_cinematic_taiko_pulse(duration_s=1.5):
    """Epic trailer taiko / war drum hit."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    f_pitch = 110.0 * np.exp(-8.0 * t) + 48.0
    phase = 2 * np.pi * np.cumsum(f_pitch) / SAMPLE_RATE
    drum = np.sin(phase) * np.exp(-4.2 * t)
    # Impact transient
    click = np.random.randn(int(0.02 * SAMPLE_RATE)) * 0.4
    out = np.zeros(length)
    out[:len(click)] += click
    out += drum * 0.65
    return stereo_pan(out, 0.0)

def generate_cinematic_soundtrack(total_seconds=46.0):
    total_samples = int(SAMPLE_RATE * total_seconds)
    audio = np.zeros((total_samples, 2))
    
    def add_sfx(sfx_stereo, start_time_s):
        idx = int(start_time_s * SAMPLE_RATE)
        end_idx = min(total_samples, idx + len(sfx_stereo))
        if idx < total_samples:
            audio[idx:end_idx] += sfx_stereo[:end_idx - idx]

    print("1. Layering Cinematic Intro Sound Design...")
    # 0.0s - 2.5s: Dark mysterious drone
    t_drone = np.linspace(0, total_seconds, total_samples)
    dark_drone = 0.12 * np.sin(2 * np.pi * 55.0 * t_drone) + 0.08 * np.sin(2 * np.pi * 82.4 * t_drone)
    audio[:, 0] += dark_drone
    audio[:, 1] += dark_drone

    # 0.4s: Book page rustle
    page = synth_sub_impact(duration_s=0.5, f_start=80, f_end=30) * 0.3
    add_sfx(page, 0.4)

    # 0.8s: Question appearance bell chime (Deep cinematic bell)
    bell1 = synth_temple_gong(duration_s=3.5, freq=660.0)
    add_sfx(bell1, 0.8)

    # 2.6s: Answer revelation celestial chime chord ("My favourite book — Lord Krishna")
    chimes = synth_celestial_chime_chord(duration_s=3.0)
    add_sfx(chimes, 2.6)

    # 3.4s - 5.5s: Intense Trailer Riser Whoosh ("The chapters are...")
    riser = synth_cinematic_riser(duration_s=2.1)
    add_sfx(riser, 3.4)

    # =========================================================
    # 5.5s: THE EPIC DROP (Chapter 1: Mathura & King Kansa)
    # =========================================================
    print("2. Layering The Epic Drop (Braaam + Sub Impact + Thunder)...")
    braaam = synth_trailer_braaam(duration_s=4.0, f0=55.0)
    add_sfx(braaam, 5.5)

    sub_boom = synth_sub_impact(duration_s=3.5, f_start=140.0, f_end=35.0)
    add_sfx(sub_boom, 5.5)

    thunder1 = synth_thunderclap(duration_s=4.2)
    add_sfx(thunder1, 5.5)

    # Dark storm rain ambience (5.5s to 21.0s)
    rain_dur = 16.0
    rain_len = int(SAMPLE_RATE * rain_dur)
    t_r = np.linspace(0, rain_dur, rain_len)
    rain_n = np.random.randn(rain_len)
    k = np.ones(35) / 35
    rain_f = np.convolve(rain_n, k, mode='same') * 0.07 * np.clip(1.0 - (t_r - 12.0)/4.0, 0, 1)
    r_idx = int(5.5 * SAMPLE_RATE)
    audio[r_idx:r_idx + rain_len, 0] += rain_f
    audio[r_idx:r_idx + rain_len, 1] += rain_f

    # Chapter 2: The Stone Prison (10.0s)
    drum2 = synth_cinematic_taiko_pulse(duration_s=2.0)
    add_sfx(drum2, 10.0)
    bell2 = synth_temple_gong(duration_s=4.0, freq=440.0)
    add_sfx(bell2, 10.0)

    # Chapter 3: Divine Descent & Shri Krishna Janm (14.5s)
    print("3. Layering Divine Birth (Shankha Blast + Celestial Chimes)...")
    shankha = synth_conch_shell(duration_s=4.5)
    add_sfx(shankha, 14.5)
    boom3 = synth_sub_impact(duration_s=3.0, f_start=120, f_end=40) * 0.7
    add_sfx(boom3, 14.5)
    chimes_divine = synth_celestial_chime_chord(duration_s=3.5)
    add_sfx(chimes_divine, 15.0)

    # Chapter 4: Crossing Yamuna & Sheshnag (19.0s)
    thunder2 = synth_thunderclap(duration_s=4.0)
    add_sfx(thunder2, 19.0)
    drum4 = synth_cinematic_taiko_pulse(duration_s=2.0)
    add_sfx(drum4, 19.0)

    # Chapter 5: Gokul & Yashoda Maiya (23.5s)
    print("4. Layering Gokul & Vrindavan Melodies...")
    bell5 = synth_temple_gong(duration_s=4.0, freq=523.25)
    add_sfx(bell5, 23.5)

    # Classical Bansuri Melodies (Raag Bhupali)
    C4, D4, E4, G4, A4, C5, D5 = 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33
    flute_phrases = [
        # Chapter 5 (Yashoda Maiya)
        (24.0, [(G4, 1.2), (A4, 1.0), (C5, 1.8), (A4, 0.8), (G4, 1.2)]),
        # Chapter 6 (Makhan Chor - 28.0s)
        (28.2, [(E4, 0.6), (G4, 0.6), (A4, 0.8), (G4, 0.8), (E4, 0.8), (D4, 0.8), (C4, 1.2)]),
        # Chapter 7 (Kaliya Daman - 32.5s)
        (32.7, [(D4, 0.7), (E4, 0.8), (G4, 1.0), (A4, 1.0), (C5, 1.5)]),
        # Chapter 8 (Govardhan Leela - 37.0s)
        (37.2, [(C5, 1.2), (D5, 1.0), (C5, 1.0), (A4, 1.2), (G4, 1.5)]),
        # Chapter 9 (Vrindavan Sunset Finale - 41.5s)
        (41.5, [(G4, 0.8), (A4, 0.8), (C5, 1.2), (D5, 1.4), (C5, 1.8), (A4, 1.0), (G4, 1.5), (E4, 1.2), (C4, 2.5)])
    ]

    for start_t, notes in flute_phrases:
        curr_t = start_t
        for pitch, note_dur in notes:
            note_wav = synth_cinematic_bansuri(pitch, note_dur, pan=0.1)
            add_sfx(note_wav, curr_t)
            curr_t += note_dur * 0.85

    # Cinematic Trailer Taiko drums on chapters 6, 7, 8
    add_sfx(synth_cinematic_taiko_pulse(2.0), 28.0) # Makhan Chor
    add_sfx(synth_trailer_braaam(3.0, 65.0) * 0.6, 32.5) # Kaliya Daman brass hit
    add_sfx(synth_sub_impact(3.0, 150, 35) * 0.8, 37.0) # Govardhan lift boom
    add_sfx(synth_temple_gong(5.0, 392.0), 41.5) # Finale temple gong

    # Normalize raw audio
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val) * 0.95
        
    int16_audio = (audio * 32767).astype(np.int16)
    wavfile.write(OUTPUT_RAW_WAV, SAMPLE_RATE, int16_audio)
    print("Raw cinematic audio written to:", OUTPUT_RAW_WAV)

    # 5. FFmpeg Professional Trailer Audio Mastering:
    # - Sub-bass enhancement (+7dB at 50Hz)
    # - Wide stereo spatialization
    # - Cathedral reverb (aecho)
    # - Hollywood multi-band limiter / compression
    print("Mastering audio via FFmpeg trailer chain...")
    af_chain = (
        "bass=g=6:f=50:w=0.6,"
        "treble=g=2.5:f=7500:w=0.8,"
        "aecho=0.8:0.88:35|70:0.25|0.15,"
        "stereotools=mlev=0.85:slev=1.35,"
        "compand=attacks=0.01:decays=0.1:points=-90/-90|-40/-28|-20/-9|-6/-1|0/-0.2:gain=2.5"
    )
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", OUTPUT_RAW_WAV,
        "-af", af_chain,
        OUTPUT_PROCESSED_WAV
    ]
    subprocess.run(cmd, check=True)
    print("Mastered Cinematic Audio generated at:", OUTPUT_PROCESSED_WAV)

if __name__ == "__main__":
    generate_cinematic_soundtrack()
