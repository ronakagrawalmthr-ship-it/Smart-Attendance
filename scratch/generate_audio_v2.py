import numpy as np
from scipy.io import wavfile

SAMPLE_RATE = 44100

def create_temple_bell(duration_s=3.0, freq=880.0, volume=0.25):
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    harmonics = [(1.0, 1.0, 3.5), (2.76, 0.6, 2.2), (5.4, 0.35, 1.5), (8.9, 0.2, 1.0)]
    signal = np.zeros(length)
    for h_freq_mult, amp, decay in harmonics:
        f = freq * h_freq_mult
        env = np.exp(-decay * t)
        signal += amp * np.sin(2 * np.pi * f * t) * env
    strike = np.minimum(1.0, t * 500)
    return signal * strike * volume

def create_crystal_chime(duration_s=2.5, freqs=[1046.5, 1318.5, 1567.98, 2093.0]):
    """Magical crystalline sparkle for the book revelation."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    signal = np.zeros(length)
    for i, f in enumerate(freqs):
        offset = int(i * 0.08 * SAMPLE_RATE)
        t_sub = t[:length - offset]
        env = np.exp(-3.5 * t_sub)
        chime = np.sin(2 * np.pi * f * t_sub) * env
        signal[offset:offset + len(chime)] += chime * 0.12
    return signal

def create_cinematic_riser_impact(riser_dur=2.0, impact_dur=3.0):
    """Cinematic riser whoosh followed by a powerful sub-bass impact drum."""
    # Riser (filtered white noise + ascending pitch)
    r_len = int(SAMPLE_RATE * riser_dur)
    t_r = np.linspace(0, riser_dur, r_len)
    f_sweep = 80 + 350 * (t_r / riser_dur)**2
    phase_r = 2 * np.pi * np.cumsum(f_sweep) / SAMPLE_RATE
    riser = np.sin(phase_r) * (t_r / riser_dur)**2 * 0.15
    noise = np.random.randn(r_len) * (t_r / riser_dur)**3 * 0.08
    riser_total = riser + noise
    
    # Impact (sub-bass boom + body drum)
    i_len = int(SAMPLE_RATE * impact_dur)
    t_i = np.linspace(0, impact_dur, i_len)
    f_boom = 95.0 * np.exp(-5.0 * t_i) + 40.0
    phase_i = 2 * np.pi * np.cumsum(f_boom) / SAMPLE_RATE
    sub_boom = np.sin(phase_i) * np.exp(-2.2 * t_i) * 0.6
    click = np.sin(2 * np.pi * 320 * t_i[:int(0.03*SAMPLE_RATE)]) * 0.3
    impact_total = np.zeros(i_len)
    impact_total += sub_boom
    impact_total[:len(click)] += click
    
    return riser_total, impact_total

def create_page_turn_sfx(duration_s=0.6):
    """Soft acoustic page rustle."""
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    noise = np.random.randn(length)
    env = np.sin(np.pi * t / duration_s)**2
    # simple smoothing filter
    kernel = np.ones(30) / 30
    smooth_noise = np.convolve(noise, kernel, mode='same')
    return smooth_noise * env * 0.09

def create_tanpura_drone(total_seconds):
    t = np.linspace(0, total_seconds, int(SAMPLE_RATE * total_seconds))
    drone = np.zeros_like(t)
    notes = [(130.81, 0.35), (196.00, 0.25), (261.63, 0.20), (65.41, 0.40)]
    for freq, amp in notes:
        mod = 1.0 + 0.08 * np.sin(2 * np.pi * 0.2 * t)
        drone += amp * np.sin(2 * np.pi * freq * t) * mod
        drone += (amp * 0.4) * np.sin(2 * np.pi * freq * 2 * t)
        drone += (amp * 0.15) * np.sin(2 * np.pi * freq * 3 * t)
    return drone * 0.18

def create_bansuri_note(freq, duration_s):
    length = int(SAMPLE_RATE * duration_s)
    t = np.linspace(0, duration_s, length)
    vibrato_env = np.clip((t - 0.15) / 0.4, 0, 1)
    pitch_mod = 1.0 + 0.015 * vibrato_env * np.sin(2 * np.pi * 4.5 * t)
    phase = 2 * np.pi * freq * np.cumsum(pitch_mod) / SAMPLE_RATE
    flute = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase) + 0.05 * np.sin(4 * phase)
    flute += (np.random.rand(length) * 2 - 1) * 0.03
    attack_len = int(SAMPLE_RATE * min(0.25, duration_s * 0.3))
    release_len = int(SAMPLE_RATE * min(0.3, duration_s * 0.3))
    env = np.ones(length)
    env[:attack_len] = np.sin(np.linspace(0, np.pi/2, attack_len))
    env[-release_len:] = np.sin(np.linspace(np.pi/2, 0, release_len))
    return flute * env * 0.35

def generate_full_reel_audio(total_seconds=46.0, output_file="devotional_audio_v2.wav"):
    total_samples = int(SAMPLE_RATE * total_seconds)
    audio = np.zeros(total_samples)

    print("Synthesizing Intro Sound Effects...")
    # 1. INTRO (0s - 5.5s):
    # - 0.4s: Page turn / book open sound effect
    page_sfx = create_page_turn_sfx(0.7)
    idx_p = int(0.4 * SAMPLE_RATE)
    audio[idx_p:idx_p + len(page_sfx)] += page_sfx

    # - 0.8s: Question appearance bell chime
    q_chime = create_temple_bell(duration_s=2.5, freq=1046.5, volume=0.2)
    idx_q = int(0.8 * SAMPLE_RATE)
    audio[idx_q:idx_q + len(q_chime)] += q_chime

    # - 2.6s: Reply appearance crystal magic shimmer ("My favourite book - Lord Krishna")
    ans_chime = create_crystal_chime(duration_s=2.8)
    idx_a = int(2.6 * SAMPLE_RATE)
    audio[idx_a:idx_a + len(ans_chime)] += ans_chime

    # - 3.8s to 5.5s: Cinematic Riser Whoosh ("The chapters are...")
    riser, impact = create_cinematic_riser_impact(riser_dur=1.7, impact_dur=3.5)
    idx_r = int(3.8 * SAMPLE_RATE)
    audio[idx_r:idx_r + len(riser)] += riser

    # 2. CHAPTER 1 DROP (at 5.5s):
    # - Cinematic Impact Drum Boom at 5.5s
    idx_i = int(5.5 * SAMPLE_RATE)
    audio[idx_i:idx_i + len(impact)] += impact

    # - Tanpura drone begins from 5.5s to end
    tanpura_dur = total_seconds - 5.5
    tanpura = create_tanpura_drone(tanpura_dur)
    t_fade = np.minimum(1.0, np.linspace(0, 1, int(SAMPLE_RATE * 2.0)))
    tanpura[:len(t_fade)] *= t_fade
    audio[idx_i:idx_i + len(tanpura)] += tanpura

    # - Rain & thunder ambience (from 5.5s to 23s - Mathura, Prison, Sheshnag)
    rain_start = 5.5
    rain_dur = 18.0
    rain_len = int(SAMPLE_RATE * rain_dur)
    t_rain = np.linspace(0, rain_dur, rain_len)
    rain_noise = np.random.randn(rain_len)
    rain_fade = np.clip(1.0 - (t_rain - 14.0) / 4.0, 0, 1)
    rain = np.convolve(rain_noise, np.ones(25)/25, mode='same') * 0.08 * rain_fade
    r_idx = int(rain_start * SAMPLE_RATE)
    audio[r_idx:r_idx + rain_len] += rain

    # - Conch Shell (Shankha) blast at Krishna Janm (at ~14.5s)
    conch_start = 14.5
    conch_dur = 4.5
    conch_len = int(SAMPLE_RATE * conch_dur)
    t_c = np.linspace(0, conch_dur, conch_len)
    conch_f = 220.0 + 15.0 * np.sin(np.linspace(0, np.pi, conch_len))
    conch_phase = 2 * np.pi * conch_f * np.cumsum(np.ones_like(t_c)) / SAMPLE_RATE
    conch_tone = (np.sin(conch_phase) + 0.5 * np.sin(2 * conch_phase) + 0.3 * np.sin(3 * conch_phase) + 0.2 * np.sin(4 * conch_phase))
    conch_env = np.sin(np.pi * t_c / conch_dur) ** 2
    c_idx = int(conch_start * SAMPLE_RATE)
    audio[c_idx:c_idx + conch_len] += conch_tone * conch_env * 0.26

    # - Temple Bells at key chapter markers
    chapter_bell_times = [5.5, 10.0, 14.5, 19.0, 23.5, 28.0, 32.5, 37.0, 41.5]
    for bt in chapter_bell_times:
        bell_sound = create_temple_bell(duration_s=3.5, freq=520.0, volume=0.22)
        b_idx = int(bt * SAMPLE_RATE)
        end_idx = min(total_samples, b_idx + len(bell_sound))
        audio[b_idx:end_idx] += bell_sound[:end_idx - b_idx]

    # - Soulful Bansuri Flute Melodies in Raag Bhupali
    C4, D4, E4, G4, A4, C5 = 261.63, 293.66, 329.63, 392.00, 440.00, 523.25
    flute_phrases = [
        # Chapter 4-5 transition (Krishna birth to Gokul sunrise)
        (19.0, [(G4, 1.2), (A4, 1.0), (C5, 2.0)]),
        # Chapter 5 (Yashoda Maiya)
        (23.5, [(C5, 1.2), (A4, 0.8), (G4, 1.2), (E4, 1.0)]),
        # Chapter 6 (Makhan Chor)
        (28.0, [(E4, 0.6), (G4, 0.6), (A4, 0.8), (G4, 0.8), (E4, 0.8), (D4, 0.8)]),
        # Chapter 7 (Kaliya Daman)
        (32.5, [(D4, 0.6), (E4, 0.8), (G4, 1.0), (A4, 1.0), (C5, 1.4)]),
        # Chapter 8 (Govardhan Leela)
        (37.0, [(C5, 1.2), (D4*2, 1.0), (C5, 1.0), (A4, 1.2)]),
        # Chapter 9 (Vrindavan Finale)
        (41.0, [(G4, 0.8), (A4, 0.8), (C5, 1.2), (D4*2, 1.2), (C5, 1.5), (A4, 1.0), (G4, 1.5), (E4, 1.0), (D4, 1.0), (C4, 2.0)])
    ]

    print("Synthesizing Bansuri Flute melody...")
    for start_t, notes in flute_phrases:
        curr_t = start_t
        for pitch, note_dur in notes:
            note_wav = create_bansuri_note(pitch, note_dur)
            n_idx = int(curr_t * SAMPLE_RATE)
            end_idx = min(total_samples, n_idx + len(note_wav))
            if n_idx < total_samples:
                audio[n_idx:end_idx] += note_wav[:end_idx - n_idx]
            curr_t += note_dur * 0.85

    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val) * 0.94

    int16_audio = (audio * 32767).astype(np.int16)
    wavfile.write(output_file, SAMPLE_RATE, int16_audio)
    print("Full reel SFX + devotional audio generated:", output_file)

if __name__ == "__main__":
    generate_full_reel_audio()
