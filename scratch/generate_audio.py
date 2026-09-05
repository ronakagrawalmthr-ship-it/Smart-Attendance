import numpy as np
from scipy.io import wavfile

SAMPLE_RATE = 44100

def create_temple_bell(t_start, duration_s=3.0, freq=880.0):
    """Synthesize a resonant brass temple bell / chime with rich metallic harmonics."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    # Bell harmonic ratios: fundamental, minor third, fifth, octave, octave + major third
    harmonics = [
        (1.0, 1.0, 4.0),
        (2.76, 0.6, 2.5),
        (5.4, 0.35, 1.8),
        (8.9, 0.2, 1.2),
        (13.3, 0.1, 0.8)
    ]
    signal = np.zeros(length)
    for h_freq_mult, amp, decay in harmonics:
        f = freq * h_freq_mult
        env = np.exp(-decay * t)
        signal += amp * np.sin(2 * np.pi * f * t) * env
    
    # Strike attack
    strike_attack = np.minimum(1.0, t * 500)
    return signal * strike_attack * 0.25

def create_tanpura_drone(total_seconds):
    """Synthesize warm ambient Indian Tanpura drone (Sa - Pa - Sa)."""
    t = np.linspace(0, total_seconds, int(SAMPLE_RATE * total_seconds))
    drone = np.zeros_like(t)
    
    # Frequencies (C3 = 130.81 Hz, G3 = 196.00 Hz, C4 = 261.63 Hz)
    notes = [
        (130.81, 0.35),
        (196.00, 0.25),
        (261.63, 0.20),
        (65.41, 0.40) # Sub-bass warmth
    ]
    for freq, amp in notes:
        # Subtle slow modulation for organic Indian acoustic feel
        mod = 1.0 + 0.08 * np.sin(2 * np.pi * 0.2 * t)
        drone += amp * np.sin(2 * np.pi * freq * t) * mod
        # 2nd harmonic
        drone += (amp * 0.4) * np.sin(2 * np.pi * freq * 2 * t)
        # 3rd harmonic
        drone += (amp * 0.15) * np.sin(2 * np.pi * freq * 3 * t)

    return drone * 0.2

def create_bansuri_note(freq, duration_s, vibrato_rate=4.5, vibrato_depth=0.015):
    """Synthesize a bamboo flute (Bansuri) tone with breathiness and vibrato."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    
    # Pitch envelope with gentle vibrato that develops gradually
    vibrato_env = np.clip((t - 0.2) / 0.5, 0, 1)
    pitch_mod = 1.0 + vibrato_depth * vibrato_env * np.sin(2 * np.pi * vibrato_rate * t)
    phase = 2 * np.pi * freq * np.cumsum(pitch_mod) / SAMPLE_RATE
    
    # Bamboo flute acoustic harmonics (predominantly odd harmonics with soft evens)
    flute = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase) + 0.05 * np.sin(4 * phase)
    
    # Soft breath noise
    noise = (np.random.rand(length) * 2 - 1) * 0.03
    flute += noise
    
    # Smooth attack and release envelope (Meend / gentle expression)
    attack_len = int(SAMPLE_RATE * min(0.25, duration_s * 0.3))
    release_len = int(SAMPLE_RATE * min(0.3, duration_s * 0.3))
    env = np.ones(length)
    env[:attack_len] = np.sin(np.linspace(0, np.pi/2, attack_len))
    env[-release_len:] = np.sin(np.linspace(np.pi/2, 0, release_len))
    
    return flute * env * 0.35

def generate_devotional_audio(total_seconds=40.5, output_file="devotional_audio.wav"):
    total_samples = int(SAMPLE_RATE * total_seconds)
    audio = np.zeros(total_samples)
    
    # 1. Add Tanpura drone throughout
    print("Generating Tanpura drone...")
    tanpura = create_tanpura_drone(total_seconds)
    audio += tanpura
    
    # 2. Rain & thunder ambience for the first half (Mathura, Prison, Sheshnag ~ 0 to 18 sec)
    print("Generating atmospheric ambience...")
    rain_duration = 18.0
    rain_samples = int(SAMPLE_RATE * rain_duration)
    t_rain = np.linspace(0, rain_duration, rain_samples)
    # Low-pass pink/brown noise for rain
    rain_noise = np.random.randn(rain_samples)
    # Smooth rain fade out into Gokul sunrise
    rain_fade = np.clip(1.0 - (t_rain - 14.0) / 4.0, 0, 1)
    rain = np.convolve(rain_noise, np.ones(25)/25, mode='same') * 0.08 * rain_fade
    audio[:rain_samples] += rain
    
    # 3. Conch Shell (Shankha) blast at Lord Krishna's divine birth (~11.0s to 15.0s)
    conch_start = 9.0
    conch_dur = 4.5
    conch_len = int(SAMPLE_RATE * conch_dur)
    t_c = np.linspace(0, conch_dur, conch_len)
    conch_f = 220.0 + 15.0 * np.sin(np.linspace(0, np.pi, conch_len))
    conch_phase = 2 * np.pi * conch_f * np.cumsum(np.ones_like(t_c)) / SAMPLE_RATE
    conch_tone = (np.sin(conch_phase) + 0.5 * np.sin(2 * conch_phase) + 0.3 * np.sin(3 * conch_phase) + 0.2 * np.sin(4 * conch_phase))
    conch_env = np.sin(np.pi * t_c / conch_dur) ** 2
    c_start_idx = int(conch_start * SAMPLE_RATE)
    audio[c_start_idx:c_start_idx + conch_len] += conch_tone * conch_env * 0.25
    
    # 4. Sacred Temple Bells at key moments
    bell_times = [0.5, 4.5, 9.0, 13.5, 18.0, 22.5, 27.0, 31.5, 36.0]
    for bt in bell_times:
        bell_sound = create_temple_bell(bt, duration_s=4.0, freq=520.0)
        idx = int(bt * SAMPLE_RATE)
        end_idx = min(total_samples, idx + len(bell_sound))
        audio[idx:end_idx] += bell_sound[:end_idx - idx]
        
    # 5. Soulful Bansuri Flute Melodies in Raag Bhupali (Sa, Re, Ga, Pa, Dha, Sa')
    # Sa=261.63(C4), Re=293.66(D4), Ga=329.63(E4), Pa=392.00(G4), Dha=440.00(A4), High Sa=523.25(C5)
    C4, D4, E4, G4, A4, C5 = 261.63, 293.66, 329.63, 392.00, 440.00, 523.25
    
    flute_phrases = [
        # Scene 4-5 transition (Divine birth to Gokul): Gentle awakening
        (13.5, [(G4, 1.2), (A4, 1.0), (C5, 2.0)]),
        # Scene 5 (Gokul & Yashoda): Tender maternal love
        (18.0, [(C5, 1.2), (A4, 0.8), (G4, 1.2), (E4, 1.0)]),
        # Scene 6 (Makhan Chor): Playful lilting
        (22.5, [(E4, 0.6), (G4, 0.6), (A4, 0.8), (G4, 0.8), (E4, 0.8), (D4, 0.8)]),
        # Scene 7 (Kaliya Leela): Heroic and majestic
        (27.0, [(D4, 0.6), (E4, 0.8), (G4, 1.0), (A4, 1.0), (C5, 1.4)]),
        # Scene 8 (Govardhan Leela): Powerful and divine
        (31.5, [(C5, 1.2), (D4*2, 1.0), (C5, 1.0), (A4, 1.2)]),
        # Scene 9 (Vrindavan Sunset Finale): Sublime sweet flute melody
        (35.5, [(G4, 0.8), (A4, 0.8), (C5, 1.2), (D4*2, 1.2), (C5, 1.5), (A4, 1.0), (G4, 1.5), (E4, 1.0), (D4, 1.0), (C4, 2.0)])
    ]
    
    print("Generating Bansuri flute melody...")
    for start_t, notes in flute_phrases:
        curr_t = start_t
        for pitch, note_dur in notes:
            note_wav = create_bansuri_note(pitch, note_dur)
            idx = int(curr_t * SAMPLE_RATE)
            end_idx = min(total_samples, idx + len(note_wav))
            if idx < total_samples:
                audio[idx:end_idx] += note_wav[:end_idx - idx]
            curr_t += note_dur * 0.85 # Slight overlap for legato / meend

    # Normalize audio to avoid clipping and give rich volume
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val) * 0.92
        
    int16_audio = (audio * 32767).astype(np.int16)
    wavfile.write(output_file, SAMPLE_RATE, int16_audio)
    print(f"Devotional audio generated successfully: {output_file}")

if __name__ == "__main__":
    generate_devotional_audio()
