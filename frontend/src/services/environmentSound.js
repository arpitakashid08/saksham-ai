export const SOUND_CLASSIFIER_MODE = {
  id: "browser-signal-analysis",
  label: "Browser signal analysis",
};

export const SOUND_CATEGORIES = [
  {
    id: "siren",
    icon: "🚨",
    label: "Siren",
    level: "HIGH",
    alertText: "Emergency vehicle detected nearby.",
  },
  {
    id: "horn",
    icon: "📯",
    label: "Vehicle Horn",
    level: "MEDIUM",
    alertText: "Vehicle horn detected nearby.",
  },
  {
    id: "doorbell",
    icon: "🔔",
    label: "Doorbell",
    level: "LOW",
    alertText: "Doorbell detected nearby.",
  },
  {
    id: "alarm",
    icon: "⏰",
    label: "Alarm",
    level: "HIGH",
    alertText: "Alarm sound detected.",
  },
  {
    id: "announcement",
    icon: "📢",
    label: "Announcement",
    level: "MEDIUM",
    alertText: "Public announcement detected.",
  },
  {
    id: "train",
    icon: "🚆",
    label: "Train Arrival",
    level: "HIGH",
    alertText: "Train arrival or rail movement detected.",
  },
];

const CATEGORY_BY_ID = Object.fromEntries(SOUND_CATEGORIES.map((category) => [category.id, category]));
const DETECTION_EVENT = "saksham:environment-detection";
const STORAGE_KEY = "saksham.environmentDetections";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundConfidence(value) {
  return Number(clamp(value, 0, 0.99).toFixed(2));
}

function bandEnergy(freqData, sampleRate, minFrequency, maxFrequency) {
  const nyquist = sampleRate / 2;
  const startIndex = Math.max(1, Math.floor((minFrequency / nyquist) * freqData.length));
  const endIndex = Math.min(freqData.length - 1, Math.ceil((maxFrequency / nyquist) * freqData.length));
  let energy = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    energy += freqData[index];
  }

  return energy;
}

function extractFeatures(analyser, freqData, timeData, sampleRate) {
  analyser.getByteFrequencyData(freqData);
  analyser.getByteTimeDomainData(timeData);

  let sumSquares = 0;
  let zeroCrossings = 0;
  let previous = 0;

  for (let index = 0; index < timeData.length; index += 1) {
    const current = (timeData[index] - 128) / 128;
    sumSquares += current * current;
    if (index > 0 && Math.sign(current) !== Math.sign(previous)) {
      zeroCrossings += 1;
    }
    previous = current;
  }

  let totalEnergy = 0;
  let weightedFrequency = 0;
  let peakValue = 0;
  let peakIndex = 0;
  const nyquist = sampleRate / 2;

  for (let index = 1; index < freqData.length; index += 1) {
    const frequency = (index / freqData.length) * nyquist;
    const value = freqData[index];
    totalEnergy += value;
    weightedFrequency += value * frequency;

    if (frequency >= 80 && frequency <= 5000 && value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  }

  const rms = Math.sqrt(sumSquares / timeData.length);
  const averageEnergy = totalEnergy / Math.max(freqData.length - 1, 1);
  const dominantFrequency = (peakIndex / freqData.length) * nyquist;
  const centroid = totalEnergy > 0 ? weightedFrequency / totalEnergy : 0;

  const low = bandEnergy(freqData, sampleRate, 20, 250);
  const horn = bandEnergy(freqData, sampleRate, 250, 800);
  const siren = bandEnergy(freqData, sampleRate, 600, 1800);
  const voice = bandEnergy(freqData, sampleRate, 300, 3400);
  const high = bandEnergy(freqData, sampleRate, 1800, 4200);

  return {
    rms,
    zeroCrossingRate: zeroCrossings / timeData.length,
    dominantFrequency,
    centroid,
    totalEnergy,
    tonalRatio: averageEnergy > 0 ? peakValue / averageEnergy : 0,
    lowRatio: totalEnergy > 0 ? low / totalEnergy : 0,
    hornRatio: totalEnergy > 0 ? horn / totalEnergy : 0,
    sirenRatio: totalEnergy > 0 ? siren / totalEnergy : 0,
    voiceRatio: totalEnergy > 0 ? voice / totalEnergy : 0,
    highRatio: totalEnergy > 0 ? high / totalEnergy : 0,
    capturedAt: Date.now(),
  };
}

function historyStats(history) {
  const audibleHistory = history.filter((item) => item.rms > 0.018);
  if (!audibleHistory.length) {
    return {
      frequencyRange: 0,
      rmsRange: 0,
      sustainedFrames: 0,
    };
  }

  const frequencies = audibleHistory.map((item) => item.dominantFrequency).filter(Boolean);
  const rmsValues = audibleHistory.map((item) => item.rms);

  return {
    frequencyRange: frequencies.length ? Math.max(...frequencies) - Math.min(...frequencies) : 0,
    rmsRange: rmsValues.length ? Math.max(...rmsValues) - Math.min(...rmsValues) : 0,
    sustainedFrames: audibleHistory.length,
  };
}

function classifySound(features, stats, environmentMode) {
  if (features.rms < 0.026 || features.totalEnergy < 900) {
    return null;
  }

  const candidates = [];
  const railwayMode = environmentMode === "Railway Station";

  if (
    features.rms > 0.038 &&
    features.tonalRatio > 5.2 &&
    features.dominantFrequency >= 550 &&
    features.dominantFrequency <= 1900 &&
    stats.frequencyRange > 220 &&
    features.sirenRatio > 0.22
  ) {
    candidates.push({
      type: "siren",
      confidence: 0.58 + features.sirenRatio * 0.35 + clamp(stats.frequencyRange / 1800, 0, 0.12),
    });
  }

  if (
    features.rms > 0.042 &&
    features.tonalRatio > 5.5 &&
    features.dominantFrequency >= 220 &&
    features.dominantFrequency <= 850 &&
    stats.frequencyRange < 240 &&
    features.hornRatio > 0.2
  ) {
    candidates.push({
      type: "horn",
      confidence: 0.54 + features.hornRatio * 0.42 + clamp(features.rms * 1.5, 0, 0.12),
    });
  }

  if (
    features.rms > 0.03 &&
    features.tonalRatio > 5.8 &&
    features.dominantFrequency >= 700 &&
    features.dominantFrequency <= 3200 &&
    features.highRatio > 0.14 &&
    stats.sustainedFrames <= 6
  ) {
    candidates.push({
      type: "doorbell",
      confidence: 0.5 + features.highRatio * 0.5 + clamp(features.tonalRatio / 70, 0, 0.12),
    });
  }

  if (
    features.rms > 0.036 &&
    features.tonalRatio > 4.8 &&
    features.dominantFrequency >= 800 &&
    features.dominantFrequency <= 3600 &&
    stats.rmsRange > 0.025 &&
    features.highRatio > 0.1
  ) {
    candidates.push({
      type: "alarm",
      confidence: 0.55 + features.highRatio * 0.35 + clamp(stats.rmsRange * 4, 0, 0.12),
    });
  }

  if (
    features.rms > 0.03 &&
    features.voiceRatio > 0.38 &&
    features.tonalRatio < 8.5 &&
    features.centroid >= 450 &&
    features.centroid <= 2800 &&
    stats.sustainedFrames >= 3
  ) {
    candidates.push({
      type: "announcement",
      confidence: 0.5 + features.voiceRatio * 0.42 + clamp(stats.sustainedFrames / 60, 0, 0.1),
    });
  }

  if (
    features.rms > 0.04 &&
    features.lowRatio > 0.22 &&
    stats.sustainedFrames >= 4 &&
    (railwayMode || features.centroid < 1400)
  ) {
    candidates.push({
      type: "train",
      confidence: 0.48 + features.lowRatio * 0.58 + (railwayMode ? 0.08 : 0),
    });
  }

  const winner = candidates
    .map((candidate) => ({
      ...candidate,
      confidence: roundConfidence(candidate.confidence),
    }))
    .filter((candidate) => candidate.confidence >= 0.58)
    .sort((a, b) => b.confidence - a.confidence)[0];

  return winner || null;
}

export function getSoundCategory(type) {
  return CATEGORY_BY_ID[type] || {
    id: type,
    icon: "🔉",
    label: type,
    level: "LOW",
    alertText: "Environmental sound detected.",
  };
}

export function buildDetection(candidate, features, environmentMode) {
  const category = getSoundCategory(candidate.type);
  return {
    id: `${Date.now()}-${candidate.type}`,
    type: candidate.type,
    icon: category.icon,
    title: category.label,
    label: category.label,
    level: category.level,
    text: category.alertText,
    detectedText: category.alertText,
    confidence: candidate.confidence,
    confidencePercent: Math.round(candidate.confidence * 100),
    direction: "Nearby",
    environmentMode,
    classifier: SOUND_CLASSIFIER_MODE.id,
    features: {
      rms: Number(features.rms.toFixed(4)),
      dominantFrequency: Math.round(features.dominantFrequency),
      centroid: Math.round(features.centroid),
    },
    timestamp: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    capturedAt: new Date().toISOString(),
  };
}

export class EnvironmentSoundMonitor {
  constructor({ enabledTypes, environmentMode, onDetection, onStatus, onError } = {}) {
    this.enabledTypes = enabledTypes || {};
    this.environmentMode = environmentMode || "General Area";
    this.onDetection = onDetection;
    this.onStatus = onStatus;
    this.onError = onError;
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.intervalId = null;
    this.freqData = null;
    this.timeData = null;
    this.featureHistory = [];
    this.lastDetectionAt = {};
  }

  async start() {
    if (this.intervalId) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported in this browser.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      await this.audioContext.resume();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.65;

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
      this.onStatus?.("listening");
      this.intervalId = window.setInterval(() => this.processFrame(), 700);
    } catch (error) {
      this.stop();
      this.onError?.(error);
      throw error;
    }
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.featureHistory = [];
    this.onStatus?.("stopped");
  }

  setEnabledTypes(enabledTypes) {
    this.enabledTypes = enabledTypes || {};
  }

  setEnvironmentMode(environmentMode) {
    this.environmentMode = environmentMode || "General Area";
  }

  processFrame() {
    if (!this.analyser || !this.audioContext) {
      return;
    }

    const features = extractFeatures(
      this.analyser,
      this.freqData,
      this.timeData,
      this.audioContext.sampleRate,
    );

    this.featureHistory.push(features);
    const cutoff = Date.now() - 5000;
    this.featureHistory = this.featureHistory.filter((item) => item.capturedAt >= cutoff);

    const stats = historyStats(this.featureHistory);
    const candidate = classifySound(features, stats, this.environmentMode);
    if (!candidate || this.enabledTypes[candidate.type] === false) {
      return;
    }

    const now = Date.now();
    const typeCooldown = candidate.type === "announcement" ? 9000 : 7000;
    if (now - (this.lastDetectionAt[candidate.type] || 0) < typeCooldown) {
      return;
    }

    this.lastDetectionAt[candidate.type] = now;
    this.onDetection?.(buildDetection(candidate, features, this.environmentMode));
  }
}

export function publishEnvironmentalDetection(detection) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(DETECTION_EVENT, { detail: detection }));
  const stored = loadStoredDetections();
  const nextStored = [detection, ...stored.filter((item) => item.id !== detection.id)].slice(0, 80);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
}

export function subscribeEnvironmentalDetections(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(DETECTION_EVENT, handler);
  return () => window.removeEventListener(DETECTION_EVENT, handler);
}

export function loadStoredDetections() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
