/**
 * FREEzzz Studio — deterministic music theory and composition primitives.
 * Dependency-free ESM; browser-safe and Node-testable.
 */
export const SCALES = Object.freeze({
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
});

export const STYLE_RULES = Object.freeze({
  detroit: { bpm: [128, 138], kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], swing: 8 },
  minimal: { bpm: [124, 134], kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 10, 14], swing: 5 },
  rave: { bpm: [136, 145], kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], swing: 0 },
  industrial: { bpm: [138, 150], kick: [0, 4, 6, 8, 12, 14], snare: [4, 12], hats: [2, 6, 10, 14], swing: 0 },
  schranz: { bpm: [150, 165], kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], hats: [1, 3, 5, 7, 9, 11, 13, 15], swing: 0 },
  hard: { bpm: [145, 160], kick: [0, 4, 8, 12], snare: [4, 12], hats: [1, 3, 5, 7, 9, 11, 13, 15], swing: 0 },
  acid: { bpm: [132, 148], kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], swing: 0 },
  dub: { bpm: [118, 132], kick: [0, 8], snare: [4, 12], hats: [6, 14], swing: 12 },
  melodic: { bpm: [120, 132], kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], swing: 0 },
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function seededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function chooseScale(name = 'minor') {
  return [...(SCALES[name] || SCALES.minor)];
}

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function quantizeMidi(midi, rootMidi = 48, scale = 'minor') {
  const notes = chooseScale(scale);
  const semitone = Math.round(midi - rootMidi);
  const octave = Math.floor(semitone / 12);
  const pitchClass = ((semitone % 12) + 12) % 12;
  const snapped = notes.reduce((best, n) =>
    Math.abs(n - pitchClass) < Math.abs(best - pitchClass) ? n : best, notes[0]);
  return rootMidi + octave * 12 + snapped;
}

/** Build a phrase with repetition, a controlled answer, and a cadence. */
export function composeMotif({ seed = 1, style = 'detroit', scale = 'minor', rootMidi = 48, density = 0.55, variation = 0.35, bars = 4 } = {}) {
  const random = seededRandom(seed);
  const rules = STYLE_RULES[style] || STYLE_RULES.detroit;
  const notes = chooseScale(scale);
  const length = clamp(Math.round(bars), 1, 16) * 16;
  const phrase = [];
  let degree = 0;
  const contour = [0, 2, 1, 3, 2, 0, -1, 1];
  for (let step = 0; step < length; step++) {
    const barStep = step % 16;
    const isAnchor = barStep === 0 || barStep === 8;
    const slot = barStep % 2 === 0;
    if (!slot || (!isAnchor && random() > clamp(density, 0, 1))) {
      phrase.push(null);
      continue;
    }
    const bar = Math.floor(step / 16);
    const motifIndex = (barStep / 2) % contour.length;
    const direction = contour[motifIndex];
    const move = random() < variation ? Math.round(random() * 4) - 2 : 0;
    degree = clamp(degree + Math.sign(direction || 1) + move, 0, notes.length - 1);
    // Repeat the first two bars, answer in bars 3–4, resolve on the final downbeat.
    if (bar >= 2 && bar % 2 === 0 && random() < 0.6) degree = clamp(degree - 1, 0, notes.length - 1);
    if (step === length - 16) degree = 0;
    const octave = style === 'schranz' || style === 'industrial' ? -12 : bar >= 2 && random() < 0.25 ? 12 : 0;
    phrase.push(midiToHz(rootMidi + notes[degree] + octave));
  }
  return phrase;
}

export function scorePattern({ style = 'detroit', kick = [], snare = [], hats = [], melody = [] } = {}) {
  const rules = STYLE_RULES[style] || STYLE_RULES.detroit;
  const hit = (arr, i) => Boolean(arr[i]);
  let anchorHits = 0;
  for (const step of rules.kick) if (hit(kick, step)) anchorHits++;
  let backbeatHits = 0;
  for (const step of rules.snare) if (hit(snare, step)) backbeatHits++;
  const expectedAnchors = rules.kick.length + rules.snare.length;
  const anchorScore = expectedAnchors ? (anchorHits + backbeatHits) / expectedAnchors : 0;
  const activeMelody = melody.filter((x) => x != null).length;
  const melodicDensity = activeMelody / Math.max(1, melody.length);
  const hatDensity = hats.filter(Boolean).length / Math.max(1, hats.length);
  const densityPenalty = Math.max(0, hatDensity + melodicDensity - 0.95);
  return {
    genreFit: Math.round(anchorScore * 100),
    melodicDensity: Number(melodicDensity.toFixed(3)),
    hatDensity: Number(hatDensity.toFixed(3)),
    densityPenalty: Number(densityPenalty.toFixed(3)),
    total: Math.round(clamp(anchorScore * 100 - densityPenalty * 35, 0, 100)),
  };
}

/** Genre canon data: abstract constraints, not claims of a single universal techno theory. */
export const TECHNO_THEORY = Object.freeze({
  meter: { numerator: 4, denominator: 4, subdivisionsPerBar: 16, kickRole: "pulse anchor", phraseBars: [4, 8, 16, 32] },
  production: { targetPeakDbfs: -1, defaultHeadroomDb: 6, monoLowBelowHz: 120, recommendedSampleRate: [44100, 48000] },
  genres: {
    detroit: { bpm: [128,138], swing: [0,12], kickDensity: [4,4], notes: "Machine pulse, syncopated secondary motifs, restrained layers." },
    minimal: { bpm: [124,134], swing: [0,12], kickDensity: [4,4], notes: "Sparse, repetition-led, small changes, strong negative space." },
    rave: { bpm: [136,145], swing: [0,8], kickDensity: [4,4], notes: "Driving four-on-floor, bright repeating synth motifs, controlled fills." },
    industrial: { bpm: [138,150], swing: [0,6], kickDensity: [4,6], notes: "Hard transient focus, metallic secondary rhythm, limited tonal clutter." },
    schranz: { bpm: [150,165], swing: [0,4], kickDensity: [8,8], notes: "Fast persistent kick, dense offbeat energy, sparse tonal lead." },
    hard: { bpm: [145,160], swing: [0,8], kickDensity: [4,6], notes: "Heavy pulse, short motifs, strong section contrast." },
    acid: { bpm: [132,148], swing: [0,10], kickDensity: [4,4], notes: "Repeating resonant-sequence contour, small cutoff/resonance movement." },
    dub: { bpm: [118,132], swing: [4,18], kickDensity: [2,2], notes: "Space, offbeat accents, long decays, restrained low-end." },
    melodic: { bpm: [120,132], swing: [0,8], kickDensity: [4,4], notes: "Motif and harmonic arc, controlled dissonance and resolution." },
  },
});

export function makeChordProgression({ style = "melodic", scale = "minor", rootMidi = 48, seed = 1, bars = 8 } = {}) {
  const random = seededRandom(seed);
  const notes = chooseScale(scale);
  const progressions = style === "melodic" || style === "rave"
    ? [[0,5,2,6],[0,3,5,4],[0,6,3,4]]
    : style === "dub" || style === "minimal"
      ? [[0,0,3,0],[0,5,0,4],[0,0,4,3]]
      : style === "acid"
        ? [[0,0,0,5],[0,3,0,6],[0,0,5,0]]
        : [[0,0,5,0],[0,3,0,4],[0,0,3,0]];
  const chosen = progressions[Math.floor(random() * progressions.length)];
  const count = clamp(Math.round(bars), 1, 32);
  return Array.from({length: count}, (_, bar) => {
    const degree = chosen[bar % chosen.length] % notes.length;
    const third = notes[(degree + 2) % notes.length];
    const fifth = notes[(degree + 4) % notes.length];
    return [rootMidi + notes[degree], rootMidi + third, rootMidi + fifth];
  });
}

export function validateArrangement({ bpm = 130, style = "detroit", steps = 80, swing = 0 } = {}) {
  const canon = TECHNO_THEORY.genres[style] || TECHNO_THEORY.genres.detroit;
  const issues = [];
  if (bpm < canon.bpm[0] || bpm > canon.bpm[1]) issues.push("tempo-outside-style-range");
  if (steps % 16 !== 0) issues.push("phrase-not-bar-aligned");
  if (swing < canon.swing[0] || swing > canon.swing[1]) issues.push("swing-outside-style-range");
  return { valid: issues.length === 0, issues, bars: steps / 16, meter: "4/4" };
}

/** Equal-power stereo panning coefficients. pan is normalized to [-1, 1]. */
export function equalPowerPan(pan = 0) {
  const p = clamp(pan, -1, 1);
  const angle = (p + 1) * Math.PI / 4;
  return { left: Math.cos(angle), right: Math.sin(angle) };
}
