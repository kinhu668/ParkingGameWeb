// 天氣的環境聲：雨（rain）、雷雨（storm，更大的雨加雷聲）、雨後（wet，只有零星的滴水聲）。
// 只用 Web Audio 合成，沒有音檔；雜訊與雨滴都來自固定種子（core/rng.ts），每次都是同一段。
// 雨聲不是一條白雜訊：底層是粉紅雜訊濾成中頻的「沙——」，上面疊一層很多顆短促雨滴的「啪搭」，再加緩慢的起伏。
// 聲音 → 環境聲匯流排 → 主音量（audioEngine.ts 接）。可調的數字都在 AMBIENCE_SETTINGS。
import { createRng, type Rng } from '../core/rng';
import type { WeatherId } from '../core/weather';

/** 環境聲的種類：雨、雷雨、雨後的滴水。 */
export type AmbienceKind = 'rain' | 'storm' | 'drips';

/** 這種天氣的環境聲；晴天、黃昏、夜晚沒有。 */
export function ambienceFor(weather: WeatherId): AmbienceKind | null {
  return weather === 'rain' ? 'rain' : weather === 'storm' ? 'storm' : weather === 'wet' ? 'drips' : null;
}

export const AMBIENCE_SETTINGS = {
  /** 解鎖後淡入多久（秒）。 */
  fadeInS: 1,
  /** 重來：整個環境聲先在 downS 秒內壓下去，holdS 秒後再用 upS 秒回來（聽得出換了一局；還沒響完的雷聲會跟著回來）。 */
  dip: { downS: 0.12, holdS: 0.3, upS: 0.8 },
  /**
   * 雨的底層：一段循環的粉紅雜訊（左右聲道各自一段，聽起來是四面八方）→ 高通 → 低通。
   * 留下 500–7000 Hz：白雜訊刺耳的高頻嘶聲與悶悶的低頻都拿掉。
   */
  bed: { seed: 0x7a11, loopS: 4, crossfadeS: 0.25, highpassHz: 500, lowpassHz: 7000 },
  /**
   * 雨滴的「啪搭」：循環的一段裡撒很多顆短促的雨滴（一小段衰減很快的雜訊；多數很小聲、少數幾顆很近），再過帶通。
   * tickS 是一顆雨滴衰減的時間常數的範圍（秒）。
   */
  patter: { seed: 0xd409, loopS: 5.3, tickS: [0.0012, 0.006], bandpassHz: 3800, bandpassQ: 0.6 },
  /** 大雨的低頻轟轟聲：同一段雜訊只留這一段（Hz）。再低的喇叭放不出來，只會白白吃掉限幅器的餘裕。 */
  roarBandHz: [90, 380],
  /** 各種雨的音量與密度：底層、啪搭、低頻；每秒幾顆雨滴；緩慢起伏的頻率（Hz）與深度（佔底層音量的比例）。 */
  rain: { bedGain: 0.23, patterGain: 0.42, roarGain: 0, dropsPerS: 70, gustHz: 0.11, gustDepth: 0.12 },
  storm: { bedGain: 0.34, patterGain: 0.5, roarGain: 0.22, dropsPerS: 130, gustHz: 0.17, gustDepth: 0.22 },
  /**
   * 雨後的滴水：兩段長度不同的循環（7 秒與 11 秒，合起來 77 秒才重複），每段裡零星幾滴。
   * 一滴是一個音高很快往上滑的正弦（水滴的「咚」），衰減很快。沒有底噪：雨已經停了。
   */
  drips: {
    seed: 0x0d21b,
    loopsS: [7, 11],
    perS: 0.9,
    hz: [700, 1500],
    riseRatio: 1.9,
    decayS: [0.012, 0.035],
    gain: 0.22,
    lowpassHz: 5000,
  },
  /**
   * 雷聲：閃光之後隔一下才到（越近越快到、越響、開頭多一聲脆的）。低沉的轟隆是雜訊過低通（截止頻率一路往下滑）
   * 加兩個很低的正弦；音量慢慢起來、拖很長的尾巴，中間有幾次起伏。每一道的長相只由「第幾道」決定。
   */
  thunder: {
    seed: 0x7b0171,
    /** 閃光之後多久聽到（秒）：最近的 0.3 秒（約 100 公尺），最遠的 2 秒（約 700 公尺）。 */
    delayS: [0.3, 2],
    /** 整聲多長（秒）。 */
    durationS: [3, 6],
    /** 音量起來要多久（秒）：近的、遠的。 */
    attackS: [0.1, 0.6],
    /** 最遠的雷的音量（最近的是 1）。 */
    farGain: 0.75,
    rumbleGain: 1.8,
    /** 轟隆聲的雜訊先切掉這個頻率以下（Hz）：粉紅雜訊最低的那一段喇叭放不出來，只會讓限幅器把雨聲壓下去。 */
    rumbleHighpassHz: 70,
    /**
     * 轟隆聲低通的截止頻率（Hz）：開頭（遠的、近的）一路滑到結尾。開頭要有幾百 Hz 以上的成分：
     * 手機的喇叭放不出 300 Hz 以下，只有低頻的雷在手機上等於沒有聲音。
     */
    lowpassHz: { far: 1600, near: 4000, end: 320 },
    subHz: [43, 58],
    subGain: 0.1,
    /** 近的雷開頭那一聲脆的：比這個近（0–1）才有；高通之後很快衰減。 */
    crackFrom: 0.45,
    crackHighpassHz: 900,
    crackGain: 1.1,
    crackDecayS: 0.32,
    /** 音量曲線每秒幾個點。 */
    curveHz: 50,
  },
} as const;

/** 指數衰減的終點（不能是 0）。 */
const SILENT = 0.001;

/** 一段粉紅雜訊（Paul Kellet 的濾波器），尾巴與開頭交叉淡化所以循環時接得起來；峰值正規化成 1。 */
function pinkLoop(random: Rng, length: number, overlap: number): Float32Array {
  const raw = new Float32Array(length + overlap);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    raw[index] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
  }
  const loop = new Float32Array(length);
  let peak = 0;
  for (let index = 0; index < length; index += 1) {
    // 開頭的 overlap 個取樣：從「接在結尾後面的那一段」等功率地換到開頭自己的。
    const share = index < overlap ? index / overlap : 1;
    const value =
      (raw[index] ?? 0) * Math.sqrt(share) + (index < overlap ? (raw[length + index] ?? 0) * Math.sqrt(1 - share) : 0);
    loop[index] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  for (let index = 0; index < length; index += 1) {
    loop[index] = (loop[index] ?? 0) / peak;
  }
  return loop;
}

/** 雨的底層用的雜訊（雙聲道、循環）；雷聲的轟隆也用它。 */
export function createRainBuffer(context: BaseAudioContext): AudioBuffer {
  const { seed, loopS, crossfadeS } = AMBIENCE_SETTINGS.bed;
  const length = Math.round(context.sampleRate * loopS);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    buffer
      .getChannelData(channel)
      .set(pinkLoop(createRng(seed + channel), length, Math.round(context.sampleRate * crossfadeS)));
  }
  return buffer;
}

/** 雨滴的「啪搭」（雙聲道、循環）：每秒 dropsPerS 顆，跨過結尾的那幾顆繞回開頭。 */
export function createPatterBuffer(context: BaseAudioContext, dropsPerS: number): AudioBuffer {
  const { seed, loopS, tickS } = AMBIENCE_SETTINGS.patter;
  const rate = context.sampleRate;
  const length = Math.round(rate * loopS);
  const buffer = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = buffer.getChannelData(channel);
    const random = createRng(seed + channel);
    for (let drop = 0; drop < Math.round(dropsPerS * loopS); drop += 1) {
      const start = Math.floor(random() * length);
      // 多數很小聲，少數幾顆很近。
      const level = random() ** 3;
      const decaySamples = (tickS[0] + random() * (tickS[1] - tickS[0])) * rate;
      // 指數衰減用乘的（每個取樣乘一次），不必每個取樣算一次 exp：這段是在第一個手勢裡算的，越快越好。
      const fade = Math.exp(-1 / decaySamples);
      let envelope = level;
      for (let offset = 0; offset < decaySamples * 5; offset += 1) {
        const at = (start + offset) % length;
        samples[at] = (samples[at] ?? 0) + (random() * 2 - 1) * envelope;
        envelope *= fade;
      }
    }
  }
  return buffer;
}

/** 雨後的滴水（單聲道、循環 loopS 秒）：零星幾滴，每滴是音高往上滑的正弦。 */
export function createDripBuffer(context: BaseAudioContext, loopS: number): AudioBuffer {
  const { seed, perS, hz, riseRatio, decayS } = AMBIENCE_SETTINGS.drips;
  const rate = context.sampleRate;
  const length = Math.round(rate * loopS);
  const buffer = context.createBuffer(1, length, rate);
  const samples = buffer.getChannelData(0);
  const random = createRng(seed + Math.round(loopS * 100));
  for (let drip = 0; drip < Math.round(perS * loopS); drip += 1) {
    const start = Math.floor(random() * length);
    const level = 0.25 + 0.75 * random() ** 2;
    const fromHz = hz[0] + random() * (hz[1] - hz[0]);
    const decaySamples = (decayS[0] + random() * (decayS[1] - decayS[0])) * rate;
    let phase = 0;
    for (let offset = 0; offset < decaySamples * 6; offset += 1) {
      const progress = offset / (decaySamples * 6);
      phase += (2 * Math.PI * fromHz * (1 + (riseRatio - 1) * progress)) / rate;
      const at = (start + offset) % length;
      // 開頭幾個取樣淡入，不要「喀」一聲。
      const attack = Math.min(offset / (0.002 * rate), 1);
      samples[at] = (samples[at] ?? 0) + Math.sin(phase) * level * attack * Math.exp(-offset / decaySamples);
    }
  }
  return buffer;
}

/** 一聲雷的長相。 */
export interface ThunderPlan {
  /** 閃光之後多久開始（秒）。 */
  readonly delayS: number;
  readonly durationS: number;
  /** 多近（0 = 最遠，1 = 最近）。 */
  readonly near: number;
  readonly gain: number;
  /** 開頭那一聲脆的有多大（0 = 沒有）。 */
  readonly crack: number;
  /** 音量曲線（0–1，最響的地方是 1；第一個與最後一個點是 0），均勻分布在 durationS 秒上。 */
  readonly curve: Float32Array;
}

/** 第 strike 道閃電的雷聲（只由「第幾道」決定，每次都一樣）。 */
export function thunderPlan(strike: number): ThunderPlan {
  const thunder = AMBIENCE_SETTINGS.thunder;
  const random = createRng(thunder.seed + strike * 7919);
  const near = random();
  const delayS = thunder.delayS[1] - near * (thunder.delayS[1] - thunder.delayS[0]);
  const durationS = thunder.durationS[0] + random() * (thunder.durationS[1] - thunder.durationS[0]);
  const attackS = thunder.attackS[1] - near * (thunder.attackS[1] - thunder.attackS[0]);
  // 尾巴：結束時還剩 5% 左右（拖得夠長，蓋得過雨聲的那一段才有一兩秒）；中間疊兩個慢的起伏（雷聲在雲裡滾）。
  const tauS = (durationS - attackS) / 3;
  const rollHz = [0.5 + random() * 0.6, 1.1 + random() * 0.9];
  const rollPhase = [random() * 2 * Math.PI, random() * 2 * Math.PI];
  const points = Math.round(durationS * thunder.curveHz);
  const curve = new Float32Array(points);
  let peak = 0;
  for (let point = 1; point < points - 1; point += 1) {
    const timeS = (point / (points - 1)) * durationS;
    const rise = Math.min(timeS / attackS, 1) ** 2;
    const decay = Math.exp(-Math.max(timeS - attackS, 0) / tauS);
    const roll =
      1 +
      0.35 * Math.sin(2 * Math.PI * (rollHz[0] ?? 0) * timeS + (rollPhase[0] ?? 0)) +
      0.2 * Math.sin(2 * Math.PI * (rollHz[1] ?? 0) * timeS + (rollPhase[1] ?? 0));
    const value = rise * decay * roll;
    curve[point] = value;
    peak = Math.max(peak, value);
  }
  // 最響的地方正規化成 1（多響由 gain 決定）。
  for (let point = 0; point < points; point += 1) {
    curve[point] = (curve[point] ?? 0) / peak;
  }
  return {
    delayS,
    durationS,
    near,
    gain: thunder.farGain + (1 - thunder.farGain) * near,
    crack: Math.max(0, (near - thunder.crackFrom) / (1 - thunder.crackFrom)),
    curve,
  };
}

/** 排一聲雷：從現在算 plan.delayS 秒後開始，plan.durationS 秒後所有音源自己停掉。 */
function playThunder(context: BaseAudioContext, output: AudioNode, noise: AudioBuffer, plan: ThunderPlan): void {
  const thunder = AMBIENCE_SETTINGS.thunder;
  const startS = context.currentTime + plan.delayS;
  const endS = startS + plan.durationS;
  const out = context.createGain();
  out.gain.value = plan.gain;
  out.connect(output);
  /** 照音量曲線走的增益節點。 */
  const shaped = (level: number): GainNode => {
    const envelope = context.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueCurveAtTime(plan.curve.map((value) => value * level), startS, plan.durationS);
    envelope.connect(out);
    return envelope;
  };

  const rumble = context.createBufferSource();
  rumble.buffer = noise;
  rumble.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  const { far, near, end } = thunder.lowpassHz;
  lowpass.frequency.setValueAtTime(far + (near - far) * plan.near, startS);
  lowpass.frequency.exponentialRampToValueAtTime(end, endS);
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = thunder.rumbleHighpassHz;
  rumble.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(shaped(thunder.rumbleGain));
  // 每一道從雜訊的不同位置開始。
  rumble.start(startS, plan.near * noise.duration);
  rumble.stop(endS);

  for (const hz of thunder.subHz) {
    const sub = context.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = hz;
    sub.connect(shaped(thunder.subGain));
    sub.start(startS);
    sub.stop(endS);
  }

  if (plan.crack > 0) {
    const crack = context.createBufferSource();
    crack.buffer = noise;
    crack.loop = true;
    const sharp = context.createBiquadFilter();
    sharp.type = 'highpass';
    sharp.frequency.value = thunder.crackHighpassHz;
    const envelope = context.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueAtTime(0, startS);
    envelope.gain.linearRampToValueAtTime(thunder.crackGain * plan.crack, startS + 0.004);
    envelope.gain.exponentialRampToValueAtTime(SILENT, startS + thunder.crackDecayS);
    crack.connect(sharp);
    sharp.connect(envelope);
    envelope.connect(out);
    crack.start(startS);
    crack.stop(startS + thunder.crackDecayS);
  }
}

/** 正在響的環境聲。 */
export interface Ambience {
  readonly kind: AmbienceKind;
  /** 重來：先壓下去，一下子之後再回來。 */
  dip(): void;
  /** 第 strike 道閃電的雷聲（閃光開始的那一刻呼叫）。只有雷雨有；回傳有沒有排進去。 */
  thunder(strike: number): boolean;
}

/** 一個循環播放的音源 → 濾波器（依序）→ 音量，接到 output。回傳音量節點。 */
function loopLayer(
  context: BaseAudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  filters: readonly (readonly [BiquadFilterType, number, number?])[],
  level: number,
): GainNode {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  let tail: AudioNode = source;
  for (const [type, hz, q] of filters) {
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    if (q !== undefined) {
      filter.Q.value = q;
    }
    tail.connect(filter);
    tail = filter;
  }
  const gain = context.createGain();
  gain.gain.value = level;
  tail.connect(gain);
  gain.connect(output);
  source.start(context.currentTime);
  return gain;
}

/**
 * 開始這種天氣的環境聲：建立環境聲匯流排（接到 master）、各層循環的音源，從無聲淡入。
 * 之後一直響到換頁；暫停與背景分頁時整個 context 停住，它也跟著停。
 */
export function startAmbience(context: BaseAudioContext, master: AudioNode, kind: AmbienceKind): Ambience {
  const settings = AMBIENCE_SETTINGS;
  const now = context.currentTime;
  const bus = context.createGain();
  bus.gain.value = 0;
  bus.gain.setValueAtTime(0, now);
  bus.gain.linearRampToValueAtTime(1, now + settings.fadeInS);
  bus.connect(master);

  let noise: AudioBuffer | undefined;
  if (kind === 'drips') {
    const { loopsS, gain, lowpassHz } = settings.drips;
    for (const loopS of loopsS) {
      loopLayer(context, bus, createDripBuffer(context, loopS), [['lowpass', lowpassHz]], gain);
    }
  } else {
    const rain = settings[kind];
    const { highpassHz, lowpassHz } = settings.bed;
    const { bandpassHz, bandpassQ } = settings.patter;
    noise = createRainBuffer(context);
    const bed = loopLayer(context, bus, noise, [['highpass', highpassHz], ['lowpass', lowpassHz]], rain.bedGain);
    loopLayer(
      context,
      bus,
      createPatterBuffer(context, rain.dropsPerS),
      [['bandpass', bandpassHz, bandpassQ]],
      rain.patterGain,
    );
    if (rain.roarGain > 0) {
      const [roarFromHz, roarToHz] = settings.roarBandHz;
      loopLayer(context, bus, noise, [['highpass', roarFromHz], ['lowpass', roarToHz]], rain.roarGain);
    }
    // 緩慢的起伏：一個很慢的正弦加在底層的音量上，雨勢不是死板的一條線。
    const gust = context.createOscillator();
    gust.type = 'sine';
    gust.frequency.value = rain.gustHz;
    const depth = context.createGain();
    depth.gain.value = rain.bedGain * rain.gustDepth;
    gust.connect(depth);
    depth.connect(bed.gain);
    gust.start(now);
  }

  return {
    kind,
    dip() {
      const { downS, holdS, upS } = settings.dip;
      const at = context.currentTime;
      bus.gain.cancelScheduledValues(at);
      bus.gain.setTargetAtTime(0, at, downS / 3);
      bus.gain.setTargetAtTime(1, at + downS + holdS, upS / 3);
    },
    thunder(strike) {
      if (kind !== 'storm' || noise === undefined) {
        return false;
      }
      playThunder(context, bus, noise, thunderPlan(strike));
      return true;
    },
  };
}
