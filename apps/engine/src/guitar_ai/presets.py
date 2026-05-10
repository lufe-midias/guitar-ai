"""Built-in tone presets and pedal taxonomy.

Each preset is a serializable spec compiled into a Pedalboard at runtime.
Pedal types map directly to Pedalboard classes in audio.py PEDAL_BUILDERS.
"""
from __future__ import annotations
from typing import Any

# ============================================================
# Pedal taxonomy — surfaced in the UI as a "build your own" panel
# ============================================================

PEDAL_LIBRARY: list[dict] = [
    # --- DRIVE / DISTORTION ---
    {"type": "Distortion",  "category": "drive",   "label": "Drive",        "color": "coral",   "params": {"drive_db": 18}},
    {"type": "Clipping",    "category": "drive",   "label": "Hard Clip",    "color": "coral",   "params": {"threshold_db": -6.0}},
    {"type": "Bitcrush",    "category": "drive",   "label": "Bit Crusher",  "color": "coral",   "params": {"bit_depth": 8.0}},
    {"type": "MP3Compressor","category": "drive",  "label": "MP3 Lo-Fi",    "color": "amber",   "params": {"vbr_quality": 9.0}},
    {"type": "GSMFullRateCompressor","category":"drive", "label": "Phone Lo-Fi", "color":"amber", "params": {}},

    # --- DYNAMICS ---
    {"type": "Compressor",  "category": "dynamics","label": "Compressor",   "color": "cyan",    "params": {"threshold_db": -20, "ratio": 4.0, "attack_ms": 5, "release_ms": 100}},
    {"type": "NoiseGate",   "category": "dynamics","label": "Noise Gate",   "color": "amber",   "params": {"threshold_db": -38, "ratio": 8, "attack_ms": 1, "release_ms": 50}},
    {"type": "Limiter",     "category": "dynamics","label": "Limiter",      "color": "cyan",    "params": {"threshold_db": -2, "release_ms": 50}},
    {"type": "Gain",        "category": "dynamics","label": "Gain",         "color": "cyan",    "params": {"gain_db": 0}},

    # --- EQ / FILTER ---
    {"type": "HighpassFilter","category": "eq",    "label": "Highpass",     "color": "amber",   "params": {"cutoff_frequency_hz": 100}},
    {"type": "LowpassFilter", "category": "eq",    "label": "Lowpass",      "color": "amber",   "params": {"cutoff_frequency_hz": 8000}},
    {"type": "HighShelfFilter","category": "eq",   "label": "High Shelf",   "color": "amber",   "params": {"cutoff_frequency_hz": 5000, "gain_db": 3.0, "q": 0.7}},
    {"type": "LowShelfFilter", "category": "eq",   "label": "Low Shelf",    "color": "amber",   "params": {"cutoff_frequency_hz": 200,  "gain_db": 3.0, "q": 0.7}},
    {"type": "PeakFilter",     "category": "eq",   "label": "EQ Peak",      "color": "amber",   "params": {"cutoff_frequency_hz": 1000, "gain_db": 3.0, "q": 1.0}},
    {"type": "LadderFilter",   "category": "eq",   "label": "Moog Ladder",  "color": "purple",  "params": {"cutoff_hz": 2000, "resonance": 0.4, "drive": 1.0}},

    # --- MODULATION ---
    {"type": "Chorus",      "category": "mod",     "label": "Chorus",       "color": "purple",  "params": {"rate_hz": 1.0, "depth": 0.25, "mix": 0.3}},
    {"type": "Phaser",      "category": "mod",     "label": "Phaser",       "color": "purple",  "params": {"rate_hz": 1.5, "depth": 0.5,  "mix": 0.4}},

    # --- TIME / SPACE ---
    {"type": "Delay",       "category": "time",    "label": "Delay",        "color": "magenta", "params": {"delay_seconds": 0.4, "feedback": 0.35, "mix": 0.3}},
    {"type": "Reverb",      "category": "time",    "label": "Reverb",       "color": "cyan",    "params": {"room_size": 0.5, "damping": 0.5, "wet_level": 0.25, "dry_level": 0.85}},

    # --- PITCH ---
    {"type": "PitchShift",  "category": "pitch",   "label": "Pitch Shift",  "color": "magenta", "params": {"semitones": 12.0}},

    # --- UTILITIES ---
    {"type": "Invert",      "category": "util",    "label": "Invert Phase", "color": "amber",   "params": {}},
    {"type": "Convolution", "category": "util",    "label": "IR / Cab",     "color": "purple",  "params": {"impulse_response_filename": ""}},
]


# ============================================================
# PRESETS — organized by category
# ============================================================

BUILTIN_PRESETS: dict[str, dict[str, Any]] = {
    # ========== CLEAN ==========
    "Clean Glass": {
        "category": "clean",
        "description": "Limpo cristalino. Reverb hall, leve compressão.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -18, "ratio": 3.0, "attack_ms": 5, "release_ms": 120}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 3500, "gain_db": 2.0, "q": 0.7}},
            {"type": "Reverb", "params": {"room_size": 0.55, "damping": 0.5, "wet_level": 0.25, "dry_level": 0.85}},
        ],
    },
    "Sparkle Clean": {
        "category": "clean",
        "description": "Brilho aberto, ar nos agudos, chorus suave. Tipo Andy Summers.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -16, "ratio": 2.5, "attack_ms": 8, "release_ms": 140}},
            {"type": "HighShelfFilter", "params": {"cutoff_frequency_hz": 5000, "gain_db": 4.0, "q": 0.6}},
            {"type": "Chorus", "params": {"rate_hz": 0.6, "depth": 0.2, "mix": 0.18}},
            {"type": "Reverb", "params": {"room_size": 0.7, "damping": 0.4, "wet_level": 0.3, "dry_level": 0.8}},
        ],
    },
    "Jazz Clean": {
        "category": "clean",
        "description": "Tom encorpado de archtop. Lowpass cortando agudos.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -20, "ratio": 3.0, "attack_ms": 6, "release_ms": 130}},
            {"type": "LowShelfFilter", "params": {"cutoff_frequency_hz": 250, "gain_db": 2.5, "q": 0.6}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 4500}},
            {"type": "Reverb", "params": {"room_size": 0.45, "damping": 0.55, "wet_level": 0.18, "dry_level": 0.9}},
        ],
    },
    "Country Twang": {
        "category": "clean",
        "description": "Tele picking — agudos cortantes, slapback delay.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 4.0, "attack_ms": 2, "release_ms": 80}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 4000, "gain_db": 4.0, "q": 1.2}},
            {"type": "Delay", "params": {"delay_seconds": 0.12, "feedback": 0.18, "mix": 0.22}},
            {"type": "Reverb", "params": {"room_size": 0.35, "damping": 0.55, "wet_level": 0.18, "dry_level": 0.92}},
        ],
    },
    "Acoustic Sim": {
        "category": "clean",
        "description": "Eq tipo violão eletro-acústico. Sem drive, body boost.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -18, "ratio": 2.5, "attack_ms": 8, "release_ms": 120}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 200, "gain_db": 3, "q": 0.5}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 5000, "gain_db": 4, "q": 0.7}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 350, "gain_db": -3, "q": 0.9}},
            {"type": "Reverb", "params": {"room_size": 0.5, "damping": 0.5, "wet_level": 0.18, "dry_level": 0.92}},
        ],
    },

    # ========== CRUNCH ==========
    "Crunch Vintage": {
        "category": "crunch",
        "description": "Crunch cremoso tipo Marshall Plexi. Drive moderado.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 4.0, "attack_ms": 3, "release_ms": 90}},
            {"type": "Distortion", "params": {"drive_db": 18}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 800, "gain_db": -2, "q": 0.8}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 2500, "gain_db": 3, "q": 1.0}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 90}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 6500}},
        ],
    },
    "Vintage Tweed": {
        "category": "crunch",
        "description": "Fender Tweed Deluxe — crunch peludo, low-mid encorpado.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -20, "ratio": 3.5, "attack_ms": 4, "release_ms": 100}},
            {"type": "Distortion", "params": {"drive_db": 14}},
            {"type": "LowShelfFilter", "params": {"cutoff_frequency_hz": 250, "gain_db": 2, "q": 0.7}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 800, "gain_db": 1.5, "q": 0.9}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 5500}},
            {"type": "Reverb", "params": {"room_size": 0.35, "damping": 0.6, "wet_level": 0.15, "dry_level": 0.92}},
        ],
    },
    "AC/DC Rock": {
        "category": "crunch",
        "description": "Marshall + humbucker. Mid bump na pegada.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 4.0, "attack_ms": 3, "release_ms": 80}},
            {"type": "Distortion", "params": {"drive_db": 22}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 100}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 1200, "gain_db": 4, "q": 1.1}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 7000}},
        ],
    },
    "Blues Driven": {
        "category": "crunch",
        "description": "Blues quente. Compressão suave, drive low-gain, reverb spring.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -20, "ratio": 3.5, "attack_ms": 4, "release_ms": 110}},
            {"type": "Distortion", "params": {"drive_db": 12}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 700, "gain_db": 2, "q": 0.7}},
            {"type": "Reverb", "params": {"room_size": 0.45, "damping": 0.6, "wet_level": 0.22, "dry_level": 0.88}},
        ],
    },

    # ========== LEAD ==========
    "Lead Solo": {
        "category": "lead",
        "description": "Lead sustain pra solos. Drive alto, delay médio, reverb leve.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -26, "ratio": 6.0, "attack_ms": 2, "release_ms": 80}},
            {"type": "Distortion", "params": {"drive_db": 28}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 1200, "gain_db": 4, "q": 1.2}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 110}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 7500}},
            {"type": "Delay", "params": {"delay_seconds": 0.42, "feedback": 0.32, "mix": 0.22}},
            {"type": "Reverb", "params": {"room_size": 0.4, "wet_level": 0.18, "dry_level": 0.9}},
        ],
    },
    "EVH Brown": {
        "category": "lead",
        "description": "Brown sound — tape echo + presença pra solos.",
        "chain": [
            {"type": "NoiseGate", "params": {"threshold_db": -42, "ratio": 6, "attack_ms": 1, "release_ms": 60}},
            {"type": "Compressor", "params": {"threshold_db": -24, "ratio": 5.0, "attack_ms": 2, "release_ms": 80}},
            {"type": "Distortion", "params": {"drive_db": 30}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 750, "gain_db": -2, "q": 0.9}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 2200, "gain_db": 5, "q": 1.4}},
            {"type": "Delay", "params": {"delay_seconds": 0.36, "feedback": 0.28, "mix": 0.18}},
            {"type": "Reverb", "params": {"room_size": 0.42, "wet_level": 0.16, "dry_level": 0.9}},
        ],
    },
    "SRV Strato": {
        "category": "lead",
        "description": "SRV — Stratocaster, cube tube, dirty pra solos blues-rock.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 4.0, "attack_ms": 3, "release_ms": 90}},
            {"type": "Distortion", "params": {"drive_db": 24}},
            {"type": "LowShelfFilter", "params": {"cutoff_frequency_hz": 200, "gain_db": 2, "q": 0.7}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 900, "gain_db": 2, "q": 0.9}},
            {"type": "Reverb", "params": {"room_size": 0.55, "damping": 0.45, "wet_level": 0.2, "dry_level": 0.9}},
        ],
    },
    "Modern Lead": {
        "category": "lead",
        "description": "Lead moderno polido — gate apertado, delay digital, reverb plate.",
        "chain": [
            {"type": "NoiseGate", "params": {"threshold_db": -40, "ratio": 8, "attack_ms": 1, "release_ms": 50}},
            {"type": "Compressor", "params": {"threshold_db": -26, "ratio": 6.0, "attack_ms": 1, "release_ms": 60}},
            {"type": "Distortion", "params": {"drive_db": 32}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 120}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 8000}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 2800, "gain_db": 4, "q": 1.5}},
            {"type": "Delay", "params": {"delay_seconds": 0.5, "feedback": 0.4, "mix": 0.25}},
            {"type": "Reverb", "params": {"room_size": 0.35, "wet_level": 0.15, "dry_level": 0.92}},
        ],
    },

    # ========== HIGH GAIN ==========
    "Metal Modern": {
        "category": "metal",
        "description": "Metal moderno scooped mids. Drive pesado, gate, sem reverb.",
        "chain": [
            {"type": "NoiseGate", "params": {"threshold_db": -38, "ratio": 8, "attack_ms": 1, "release_ms": 50}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 80}},
            {"type": "Distortion", "params": {"drive_db": 36}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 500, "gain_db": -6, "q": 0.9}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 3500, "gain_db": 5, "q": 1.4}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 8500}},
        ],
    },
    "Djent Tight": {
        "category": "metal",
        "description": "Djent — gate cirúrgico, tight low-end, drive saturado.",
        "chain": [
            {"type": "NoiseGate", "params": {"threshold_db": -36, "ratio": 10, "attack_ms": 1, "release_ms": 30}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 110}},
            {"type": "Distortion", "params": {"drive_db": 38}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 250, "gain_db": -4, "q": 0.7}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 700, "gain_db": -5, "q": 1.0}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 4000, "gain_db": 6, "q": 1.6}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 9000}},
        ],
    },
    "Thrash Drive": {
        "category": "metal",
        "description": "Thrash 80s — Mesa Rectifier vibe, mids agressivos.",
        "chain": [
            {"type": "NoiseGate", "params": {"threshold_db": -38, "ratio": 8, "attack_ms": 1, "release_ms": 40}},
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 100}},
            {"type": "Distortion", "params": {"drive_db": 34}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 800, "gain_db": 4, "q": 1.0}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 3500, "gain_db": 4, "q": 1.3}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 8500}},
        ],
    },
    "Doom Sludge": {
        "category": "metal",
        "description": "Doom — fuzz pesado, low-end massivo, reverb cavernoso.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 4.0, "attack_ms": 4, "release_ms": 120}},
            {"type": "Distortion", "params": {"drive_db": 40}},
            {"type": "LowShelfFilter", "params": {"cutoff_frequency_hz": 200, "gain_db": 5, "q": 0.6}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 600, "gain_db": -3, "q": 0.8}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 6000}},
            {"type": "Reverb", "params": {"room_size": 0.85, "damping": 0.4, "wet_level": 0.4, "dry_level": 0.7}},
        ],
    },
    "Stoner Fuzz": {
        "category": "metal",
        "description": "Fuzz Big Muff — wall of fuzz com Moog ladder filter.",
        "chain": [
            {"type": "Distortion", "params": {"drive_db": 42}},
            {"type": "LadderFilter", "params": {"cutoff_hz": 1500, "resonance": 0.5, "drive": 1.4}},
            {"type": "LowShelfFilter", "params": {"cutoff_frequency_hz": 180, "gain_db": 4, "q": 0.6}},
            {"type": "Reverb", "params": {"room_size": 0.7, "damping": 0.4, "wet_level": 0.3, "dry_level": 0.8}},
        ],
    },

    # ========== MODULATION / ATMOSPHERIC ==========
    "Funk Compress": {
        "category": "modulation",
        "description": "Funk percussivo. Compressão alta, sem drive, eq aberto.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -28, "ratio": 8.0, "attack_ms": 1, "release_ms": 60}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 1200, "gain_db": 1.5, "q": 0.6}},
            {"type": "Chorus", "params": {"rate_hz": 0.8, "depth": 0.18, "mix": 0.22}},
        ],
    },
    "Phaser Funk": {
        "category": "modulation",
        "description": "Phaser tipo Eddie Hazel / Prince. Cresce e some.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -24, "ratio": 5.0, "attack_ms": 2, "release_ms": 80}},
            {"type": "Phaser", "params": {"rate_hz": 0.8, "depth": 0.7, "mix": 0.5}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 1500, "gain_db": 2, "q": 0.8}},
        ],
    },
    "Ambient Pad": {
        "category": "modulation",
        "description": "Pad ambiente com delay/reverb extremos pra texturas.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 3.0, "attack_ms": 6, "release_ms": 200}},
            {"type": "Chorus", "params": {"rate_hz": 0.4, "depth": 0.4, "mix": 0.45}},
            {"type": "Delay", "params": {"delay_seconds": 0.65, "feedback": 0.45, "mix": 0.4}},
            {"type": "Reverb", "params": {"room_size": 0.92, "damping": 0.3, "wet_level": 0.55, "dry_level": 0.6}},
        ],
    },
    "Shoegaze Wall": {
        "category": "modulation",
        "description": "Shoegaze — fuzz + reverb cathedral + chorus quase modulating.",
        "chain": [
            {"type": "Distortion", "params": {"drive_db": 30}},
            {"type": "Chorus", "params": {"rate_hz": 0.5, "depth": 0.35, "mix": 0.4}},
            {"type": "Reverb", "params": {"room_size": 0.95, "damping": 0.25, "wet_level": 0.55, "dry_level": 0.6}},
        ],
    },
    "Octave Up": {
        "category": "modulation",
        "description": "Pitch shift +12 mixado — POG-style fake 12-string.",
        "chain": [
            {"type": "Compressor", "params": {"threshold_db": -22, "ratio": 3.0, "attack_ms": 4, "release_ms": 100}},
            {"type": "PitchShift", "params": {"semitones": 12.0}},
            {"type": "Reverb", "params": {"room_size": 0.5, "damping": 0.5, "wet_level": 0.2, "dry_level": 0.85}},
        ],
    },

    # ========== LO-FI / EXPERIMENTAL ==========
    "Lo-Fi Tape": {
        "category": "experimental",
        "description": "Lo-fi com bit crusher e MP3 compressão pra vibe degradada.",
        "chain": [
            {"type": "Bitcrush", "params": {"bit_depth": 10.0}},
            {"type": "MP3Compressor", "params": {"vbr_quality": 7.0}},
            {"type": "PeakFilter", "params": {"cutoff_frequency_hz": 2000, "gain_db": -4, "q": 0.8}},
            {"type": "Reverb", "params": {"room_size": 0.5, "damping": 0.7, "wet_level": 0.25, "dry_level": 0.85}},
        ],
    },
    "Phone Filter": {
        "category": "experimental",
        "description": "Tom telefônico — bandwidth limitado tipo intercom.",
        "chain": [
            {"type": "HighpassFilter", "params": {"cutoff_frequency_hz": 400}},
            {"type": "LowpassFilter", "params": {"cutoff_frequency_hz": 3500}},
            {"type": "GSMFullRateCompressor", "params": {}},
            {"type": "Distortion", "params": {"drive_db": 8}},
        ],
    },

    # ========== UTILITY ==========
    "Bypass": {
        "category": "utility",
        "description": "Sem efeitos. Sinal limpo direto.",
        "chain": [],
    },
}


# Categories shown in the UI in this order
CATEGORIES_ORDER = [
    ("clean", "Clean"),
    ("crunch", "Crunch"),
    ("lead", "Lead"),
    ("metal", "High Gain"),
    ("modulation", "Modulação"),
    ("experimental", "Lo-Fi · Experimental"),
    ("utility", "Utilitário"),
]


def list_presets() -> list[dict]:
    return [
        {
            "name": name,
            "category": data.get("category", "other"),
            "description": data["description"],
            "chain": data["chain"],
        }
        for name, data in BUILTIN_PRESETS.items()
    ]


def list_pedals() -> list[dict]:
    return PEDAL_LIBRARY


def list_categories() -> list[dict]:
    return [{"id": cid, "label": label} for cid, label in CATEGORIES_ORDER]


def get_preset(name: str) -> dict:
    return {"name": name, **BUILTIN_PRESETS[name]}
