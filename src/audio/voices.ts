// 各種聲音的節點接法（合成配方）：只用 Web Audio 合成，沒有音檔。可調的數字都在 VOICE_SETTINGS。
// 每個函式在 context 上接好節點、連到 output（sfx 匯流排）並排好時間；這個檔不保留狀態。
import { createRng } from '../core/rng';

export const VOICE_SETTINGS = {
  /**
   * 碰撞悶響：雜訊短脈衝過低通（車殼悶悶的那一聲）與帶通（碰到的那一下「喀」），加兩個下滑的正弦（低頻的「咚」）。
   * 各層的音量是量出來的（OfflineAudioContext 算出整段聲音，看 A 加權與 500 Hz 以上的音量）：
   * 手機喇叭放不出 300 Hz 以下，所以聽得到的是前兩層；正弦只在有低音的喇叭與耳機上加分，太大會先撞到限幅器。
   */
  thud: {
    durationS: 0.12,
    noiseLowpassHz: 900,
    noiseGain: 2.2,
    /** 很短的中頻「喀」（同一段雜訊過帶通）：讓悶響有個清楚的起點。 */
    crackHz: 1100,
    crackQ: 0.8,
    crackGain: 2,
    crackDurationS: 0.04,
    /** 下滑的正弦（Hz，從…到…）。 */
    subHz: [70, 40],
    subGain: 0.45,
    /** 高一個八度多的敲擊聲。 */
    knockHz: [185, 110],
    knockGain: 0.35,
    knockDurationS: 0.07,
    /** 音量依撞擊車速：幾乎沒有速度時是 minGain，fullSpeedMph 以上是 1。 */
    minGain: 0.4,
    fullSpeedMph: 6,
  },
  /** 車輛警報（喇叭型）：兩個方波過低通，跟著燈號一響一停。 */
  horn: { tonesHz: [420, 525], lowpassHz: 1800, gain: 0.14 },
  /** 車輛警報（警報器型）：鋸齒波一直快速上掃。 */
  yelp: { lowHz: 650, highHz: 1500, sweepsPerSecond: 4, lowpassHz: 2600, gain: 0.16 },
  /** 救護車警笛的短鳴：鋸齒波過帶通，來回掃頻。 */
  siren: { lowHz: 650, highHz: 1550, sweepsPerSecond: 3.3, bandpassHz: 1100, bandpassQ: 0.8, gain: 0.2 },
  /** 倒車嗶聲：正弦加一個弱的二倍頻；每 periodS 秒（模擬時間）一聲。 */
  beep: { hz: 1000, overtoneGain: 0.25, durationS: 0.22, periodS: 0.8, edgeS: 0.008, gain: 0.18 },
  /** 持續的聲音開始、開關時的斜坡（秒），避免爆音。 */
  edgeS: 0.012,
  /** 悶響用的雜訊：固定種子，每次都是同一段。 */
  noise: { seed: 0x5eedb1, durationS: 0.2 },
} as const;

/** 指數衰減的終點（不能是 0）。 */
const SILENT = 0.001;

/** 一個持續的聲音（警報、警笛）。 */
export interface SustainedVoice {
  /** 開關（喇叭型警報跟著燈號一響一停；其他型一直響，soundDirector 不會對它們下這個指令）。 */
  gate(on: boolean): void;
  /** 在 fadeS 秒內淡出並停掉。 */
  stop(fadeS: number): void;
}

/** 悶響用的白雜訊（單聲道）。建一次，之後每次悶響共用。 */
export function createNoiseBuffer(context: BaseAudioContext): AudioBuffer {
  const { seed, durationS } = VOICE_SETTINGS.noise;
  const length = Math.round(context.sampleRate * durationS);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  const random = createRng(seed);
  for (let index = 0; index < length; index += 1) {
    samples[index] = random() * 2 - 1;
  }
  return buffer;
}

/** 從 level 指數衰減到無聲的增益節點（已接到 output）。 */
function decay(
  context: BaseAudioContext,
  output: AudioNode,
  level: number,
  startS: number,
  durationS: number,
): GainNode {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(level, startS);
  envelope.gain.exponentialRampToValueAtTime(SILENT, startS + durationS);
  envelope.connect(output);
  return envelope;
}

/** 一個頻率下滑、音量衰減的正弦。 */
function slidingSine(
  context: BaseAudioContext,
  output: AudioNode,
  [fromHz, toHz]: readonly [number, number],
  level: number,
  startS: number,
  durationS: number,
): void {
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(fromHz, startS);
  oscillator.frequency.exponentialRampToValueAtTime(toHz, startS + durationS);
  oscillator.connect(decay(context, output, level, startS, durationS));
  oscillator.start(startS);
  oscillator.stop(startS + durationS);
}

/** 碰撞悶響。gain 依撞擊車速（soundDirector 算）。 */
export function playThud(
  context: BaseAudioContext,
  output: AudioNode,
  noise: AudioBuffer,
  gain: number,
): void {
  const thud = VOICE_SETTINGS.thud;
  const now = context.currentTime;
  const out = context.createGain();
  out.gain.value = gain;
  out.connect(output);

  const burst = context.createBufferSource();
  burst.buffer = noise;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = thud.noiseLowpassHz;
  burst.connect(lowpass);
  lowpass.connect(decay(context, out, thud.noiseGain, now, thud.durationS));
  const bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = thud.crackHz;
  bandpass.Q.value = thud.crackQ;
  burst.connect(bandpass);
  bandpass.connect(decay(context, out, thud.crackGain, now, thud.crackDurationS));
  burst.start(now);
  burst.stop(now + thud.durationS);

  slidingSine(context, out, thud.subHz, thud.subGain, now, thud.durationS);
  slidingSine(context, out, thud.knockHz, thud.knockGain, now, thud.knockDurationS);
}

/** 倒車嗶聲（一聲）。節奏由 soundDirector 用模擬時間決定。 */
export function playBeep(context: BaseAudioContext, output: AudioNode): void {
  const beep = VOICE_SETTINGS.beep;
  const now = context.currentTime;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(beep.gain, now + beep.edgeS);
  envelope.gain.setValueAtTime(beep.gain, now + beep.durationS - beep.edgeS);
  envelope.gain.linearRampToValueAtTime(0, now + beep.durationS);
  envelope.connect(output);
  for (const [hz, level] of [
    [beep.hz, 1],
    [beep.hz * 2, beep.overtoneGain],
  ] as const) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = hz;
    const partial = context.createGain();
    partial.gain.value = level;
    oscillator.connect(partial);
    partial.connect(envelope);
    oscillator.start(now);
    oscillator.stop(now + beep.durationS);
  }
}

/**
 * 持續聲音共用的外殼：一個出口增益（淡入、開關、淡出都在這裡），build 接好音源並回傳要啟動的振盪器。
 * 開關與淡出用 setTargetAtTime，從當下的音量接過去，不會跳。
 */
function sustain(
  context: BaseAudioContext,
  output: AudioNode,
  level: number,
  build: (out: GainNode) => readonly OscillatorNode[],
): SustainedVoice {
  const edgeS = VOICE_SETTINGS.edgeS;
  const now = context.currentTime;
  const out = context.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(level, now + edgeS);
  out.connect(output);
  const oscillators = build(out);
  for (const oscillator of oscillators) {
    oscillator.start(now);
  }
  return {
    gate: (on) => {
      out.gain.setTargetAtTime(on ? level : 0, context.currentTime, edgeS / 3);
    },
    stop: (fadeS) => {
      const at = context.currentTime;
      out.gain.cancelScheduledValues(at);
      out.gain.setTargetAtTime(0, at, fadeS / 5);
      for (const oscillator of oscillators) {
        oscillator.stop(at + fadeS);
      }
    },
  };
}

/** 掃頻的鋸齒波：載波在 lowHz 與 highHz 之間，由一個低頻振盪器（sweep 的波形決定怎麼掃）推著走。 */
function sweptSaw(
  context: BaseAudioContext,
  lowHz: number,
  highHz: number,
  sweepsPerSecond: number,
  sweep: OscillatorType,
): { readonly carrier: OscillatorNode; readonly lfo: OscillatorNode } {
  const carrier = context.createOscillator();
  carrier.type = 'sawtooth';
  carrier.frequency.value = (lowHz + highHz) / 2;
  const lfo = context.createOscillator();
  lfo.type = sweep;
  lfo.frequency.value = sweepsPerSecond;
  const depth = context.createGain();
  depth.gain.value = (highHz - lowHz) / 2;
  lfo.connect(depth);
  depth.connect(carrier.frequency);
  return { carrier, lfo };
}

/** 車輛警報（喇叭型）：開始時是響的，之後由 gate 跟著燈號開關。detuneCents 讓每台車的音高不同。 */
export function startHorn(
  context: BaseAudioContext,
  output: AudioNode,
  detuneCents: number,
): SustainedVoice {
  const horn = VOICE_SETTINGS.horn;
  return sustain(context, output, horn.gain, (out) => {
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = horn.lowpassHz;
    lowpass.connect(out);
    return horn.tonesHz.map((hz) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.value = hz;
      oscillator.detune.value = detuneCents;
      oscillator.connect(lowpass);
      return oscillator;
    });
  });
}

/** 車輛警報（警報器型）：一直快速上掃，不跟燈號開關。 */
export function startYelp(context: BaseAudioContext, output: AudioNode): SustainedVoice {
  const yelp = VOICE_SETTINGS.yelp;
  return sustain(context, output, yelp.gain, (out) => {
    const { carrier, lfo } = sweptSaw(context, yelp.lowHz, yelp.highHz, yelp.sweepsPerSecond, 'sawtooth');
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = yelp.lowpassHz;
    carrier.connect(lowpass);
    lowpass.connect(out);
    return [carrier, lfo];
  });
}

/** 救護車警笛的短鳴：來回掃頻，響到 soundDirector 叫它停（警戒結束）。 */
export function startSiren(context: BaseAudioContext, output: AudioNode): SustainedVoice {
  const siren = VOICE_SETTINGS.siren;
  return sustain(context, output, siren.gain, (out) => {
    const { carrier, lfo } = sweptSaw(context, siren.lowHz, siren.highHz, siren.sweepsPerSecond, 'triangle');
    const bandpass = context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = siren.bandpassHz;
    bandpass.Q.value = siren.bandpassQ;
    carrier.connect(bandpass);
    bandpass.connect(out);
    return [carrier, lfo];
  });
}
