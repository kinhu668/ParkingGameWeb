// 天氣的環境聲：哪種天氣有哪種聲音、固定種子的雜訊與雨滴、雷聲的長相（閃光之後多久到、慢慢起來拖長尾巴）、
// 節點怎麼接（循環的音源 → 濾波器 → 環境聲匯流排 → 主音量）。用手寫的假 AudioContext；這個環境聽不到聲音。
import { describe, expect, test } from 'vitest';
import {
  AMBIENCE_SETTINGS,
  ambienceFor,
  createDripBuffer,
  createPatterBuffer,
  createRainBuffer,
  startAmbience,
  thunderPlan,
} from '../src/audio/ambience';
import { WEATHER_IDS } from '../src/core/weather';
import { FakeAudioContext, FakeBuffer, FakeNode, FakeParam, asContext, asNode, downstream } from './fakeAudio';

function fakeBuffer(buffer: AudioBuffer): FakeBuffer {
  return buffer as unknown as FakeBuffer;
}

/** 最大的絕對值（緩衝區有幾十萬個取樣，不能用展開運算子）。 */
function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}

/** 開始一種環境聲；回傳假的 context、主音量節點與環境聲匯流排。 */
function start(kind: 'rain' | 'storm' | 'drips') {
  const context = new FakeAudioContext();
  const master = context.createGain();
  const ambience = startAmbience(asContext(context), asNode(master), kind);
  const bus = context.of('gain').find((node) => node.outputs.includes(master));
  if (bus === undefined) {
    throw new Error('沒有接到主音量的匯流排');
  }
  const loops = context.of('bufferSource').filter((node) => node.loop);
  return { context, master, ambience, bus, loops };
}

/** 這個節點往下游第一個碰到的某種濾波器。 */
function filterAfter(node: FakeNode, type: string): FakeNode | undefined {
  return downstream(node).find((next) => next.kind === 'filter' && next.type === type);
}

describe('哪種天氣有哪種環境聲', () => {
  test('雨、雷雨、雨後各一種；晴天、黃昏、夜晚沒有', () => {
    expect(WEATHER_IDS.map((weather) => [weather, ambienceFor(weather)])).toEqual([
      ['clear', null],
      ['dusk', null],
      ['rain', 'rain'],
      ['wet', 'drips'],
      ['storm', 'storm'],
      ['night', null],
    ]);
  });
});

describe('固定種子的緩衝區', () => {
  test('雨的底層：雙聲道 4 秒、兩個聲道不同、峰值是 1、每次都一樣；循環的接點沒有跳一下', () => {
    const context = asContext(new FakeAudioContext());
    const buffer = fakeBuffer(createRainBuffer(context));
    expect(buffer.numberOfChannels).toBe(2);
    expect(buffer.length).toBe(48000 * AMBIENCE_SETTINGS.bed.loopS);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    expect(left).not.toEqual(right);
    expect(peakOf(left)).toBeCloseTo(1, 6);
    expect(left.every(Number.isFinite)).toBe(true);
    expect(rms(left)).toBeGreaterThan(0.15);
    expect(fakeBuffer(createRainBuffer(context)).getChannelData(0)).toEqual(left);
    // 粉紅雜訊相鄰兩個取樣差不多；結尾接回開頭的那一步不比平常的大。
    let largestStep = 0;
    for (let index = 1; index < left.length; index += 1) {
      largestStep = Math.max(largestStep, Math.abs((left[index] ?? 0) - (left[index - 1] ?? 0)));
    }
    expect(Math.abs((left[0] ?? 0) - (left[left.length - 1] ?? 0))).toBeLessThanOrEqual(largestStep);
  });

  test('雨滴的啪搭：雨滴越密越大聲；每次都一樣', () => {
    const context = asContext(new FakeAudioContext());
    const light = fakeBuffer(createPatterBuffer(context, AMBIENCE_SETTINGS.rain.dropsPerS));
    const heavy = fakeBuffer(createPatterBuffer(context, AMBIENCE_SETTINGS.storm.dropsPerS));
    expect(light.numberOfChannels).toBe(2);
    expect(rms(heavy.getChannelData(0))).toBeGreaterThan(rms(light.getChannelData(0)) * 1.2);
    expect(light.getChannelData(0).every(Number.isFinite)).toBe(true);
    expect(fakeBuffer(createPatterBuffer(context, AMBIENCE_SETTINGS.rain.dropsPerS)).getChannelData(1)).toEqual(
      light.getChannelData(1),
    );
  });

  test('雨後的滴水：零星幾滴，絕大部分的時間是安靜的', () => {
    const context = asContext(new FakeAudioContext());
    const samples = fakeBuffer(createDripBuffer(context, 7)).getChannelData(0);
    expect(samples).toHaveLength(48000 * 7);
    const loud = samples.filter((sample) => Math.abs(sample) > 0.01).length;
    expect(loud).toBeGreaterThan(0);
    expect(loud / samples.length).toBeLessThan(0.15);
    expect(peakOf(samples)).toBeLessThanOrEqual(1.5);
  });
});

describe('雷聲的長相', () => {
  const plans = Array.from({ length: 40 }, (_, strike) => thunderPlan(strike));

  test('閃光之後 0.3–2 秒才到，整聲 3–6 秒；同一道每次都一樣，每一道不同', () => {
    for (const plan of plans) {
      expect(plan.delayS).toBeGreaterThanOrEqual(0.3);
      expect(plan.delayS).toBeLessThanOrEqual(2);
      expect(plan.durationS).toBeGreaterThanOrEqual(3);
      expect(plan.durationS).toBeLessThanOrEqual(6);
    }
    expect(thunderPlan(3)).toEqual(plans[3]);
    expect(new Set(plans.map((plan) => plan.delayS)).size).toBe(plans.length);
  });

  test('音量曲線：從 0 慢慢起來、最響的地方在前段、拖著尾巴回到 0，不超過 1', () => {
    for (const plan of plans) {
      const { curve } = plan;
      expect(curve[0]).toBe(0);
      expect(curve[curve.length - 1]).toBe(0);
      const peak = Math.max(...curve);
      expect(peak).toBeCloseTo(1, 6);
      expect(Math.min(...curve)).toBeGreaterThanOrEqual(0);
      const peakS = (curve.indexOf(peak) / (curve.length - 1)) * plan.durationS;
      expect(peakS).toBeGreaterThanOrEqual(0.08);
      expect(peakS).toBeLessThan(plan.durationS * 0.4);
      // 第一個點（20 毫秒）還很小聲：不是「砰」一下出來。
      expect(curve[1] ?? 1).toBeLessThan(peak * 0.1);
      // 最後十分之一的尾巴已經很小聲。
      const tail = curve.slice(Math.floor(curve.length * 0.9));
      expect(Math.max(...tail)).toBeLessThan(peak * 0.08);
    }
  });

  test('越近的雷越快到、越響；夠近的開頭才有那一聲脆的', () => {
    const sorted = [...plans].sort((a, b) => a.near - b.near);
    for (let at = 1; at < sorted.length; at += 1) {
      expect(sorted[at]!.delayS).toBeLessThan(sorted[at - 1]!.delayS);
      expect(sorted[at]!.gain).toBeGreaterThan(sorted[at - 1]!.gain);
    }
    expect(plans.some((plan) => plan.crack > 0)).toBe(true);
    expect(plans.some((plan) => plan.crack === 0)).toBe(true);
    for (const plan of plans) {
      expect(plan.crack > 0).toBe(plan.near > AMBIENCE_SETTINGS.thunder.crackFrom);
      expect(plan.crack).toBeLessThanOrEqual(1);
    }
  });
});

describe('環境聲的接線', () => {
  test('雨：底層（高通 → 低通）與啪搭（帶通）兩個循環的音源，經過匯流排接到主音量，從無聲淡入', () => {
    const { context, master, bus, loops } = start('rain');
    expect(bus.gain.value).toBe(0);
    expect(bus.gain.events).toEqual([
      ['setValueAtTime', 0, 0],
      ['linearRampToValueAtTime', 1, AMBIENCE_SETTINGS.fadeInS],
    ]);
    expect(loops).toHaveLength(2);
    const [bed, patter] = loops;
    expect(bed!.buffer?.numberOfChannels).toBe(2);
    expect(bed!.starts).toEqual([0]);
    expect(filterAfter(bed!, 'highpass')?.frequency.value).toBe(AMBIENCE_SETTINGS.bed.highpassHz);
    expect(filterAfter(bed!, 'lowpass')?.frequency.value).toBe(AMBIENCE_SETTINGS.bed.lowpassHz);
    expect(filterAfter(patter!, 'bandpass')?.frequency.value).toBe(AMBIENCE_SETTINGS.patter.bandpassHz);
    for (const loop of loops) {
      const path = downstream(loop);
      expect(path).toContain(bus);
      expect(path).toContain(master);
      expect(loop.stops).toEqual([]);
    }
    // 緩慢的起伏：一個很慢的振盪器加在底層的音量上。
    const [gust] = context.of('oscillator');
    expect(gust?.frequency.value).toBe(AMBIENCE_SETTINGS.rain.gustHz);
    const bedGain = downstream(bed!).find(
      (node) => node.kind === 'gain' && node.gain.value === AMBIENCE_SETTINGS.rain.bedGain,
    );
    expect(bedGain).toBeDefined();
    const depth = gust?.outputs[0];
    expect(depth instanceof FakeNode && depth.outputs[0]).toBe(bedGain?.gain);
    expect(bedGain?.gain instanceof FakeParam).toBe(true);
  });

  test('雷雨：多一層低頻的轟轟聲，每一層都比雨大聲', () => {
    const { loops } = start('storm');
    expect(loops).toHaveLength(3);
    const roar = loops[2]!;
    expect(filterAfter(roar, 'lowpass')?.frequency.value).toBe(AMBIENCE_SETTINGS.roarLowpassHz);
    expect(roar.buffer).toBe(loops[0]!.buffer);
    expect(AMBIENCE_SETTINGS.storm.bedGain).toBeGreaterThan(AMBIENCE_SETTINGS.rain.bedGain);
    expect(AMBIENCE_SETTINGS.storm.patterGain).toBeGreaterThan(AMBIENCE_SETTINGS.rain.patterGain);
    expect(AMBIENCE_SETTINGS.storm.dropsPerS).toBeGreaterThan(AMBIENCE_SETTINGS.rain.dropsPerS);
  });

  test('雨後：只有兩段長度不同的滴水循環，沒有雨的底層', () => {
    const { context, loops } = start('drips');
    expect(loops.map((loop) => (loop.buffer?.length ?? 0) / 48000)).toEqual([7, 11]);
    expect(loops.every((loop) => loop.buffer?.numberOfChannels === 1)).toBe(true);
    expect(context.of('oscillator')).toHaveLength(0);
  });

  test('重來：匯流排先壓下去，一下子之後再回來', () => {
    const { context, ambience, bus } = start('rain');
    context.currentTime = 5;
    ambience.dip();
    const { downS, holdS, upS } = AMBIENCE_SETTINGS.dip;
    expect(bus.gain.events.slice(2)).toEqual([
      ['cancelScheduledValues', 5],
      ['setTargetAtTime', 0, 5, downS / 3],
      ['setTargetAtTime', 1, 5 + downS + holdS, upS / 3],
    ]);
  });
});

describe('雷聲的接線', () => {
  test('雷雨：閃光之後隔 delayS 才開始，duration 之後所有音源都停；低通的截止頻率一路往下滑', () => {
    const { context, ambience, bus, master } = start('storm');
    const before = context.nodes.length;
    context.currentTime = 10;
    // 找一道夠近、開頭有脆聲的。
    const strike = Array.from({ length: 40 }, (_, index) => index).find((index) => thunderPlan(index).crack > 0.3) ?? 0;
    const plan = thunderPlan(strike);
    expect(ambience.thunder(strike)).toBe(true);
    const added = context.nodes.slice(before);
    const sources = added.filter((node) => node.kind === 'bufferSource' || node.kind === 'oscillator');
    // 轟隆的雜訊、兩個低頻正弦、開頭的脆聲。
    expect(sources).toHaveLength(4);
    const startS = 10 + plan.delayS;
    for (const source of sources) {
      expect(source.starts).toEqual([startS]);
      expect(source.stops).toHaveLength(1);
      expect(source.stops[0]).toBeLessThanOrEqual(startS + plan.durationS);
      const path = downstream(source);
      expect(path).toContain(bus);
      expect(path).toContain(master);
    }
    const lowpass = added.find((node) => node.kind === 'filter' && node.type === 'lowpass');
    const [from, to] = lowpass?.frequency.events ?? [];
    expect(from?.[0]).toBe('setValueAtTime');
    expect(from?.[1]).toBeGreaterThan(AMBIENCE_SETTINGS.thunder.lowpassHz.end);
    expect(to).toEqual(['exponentialRampToValueAtTime', AMBIENCE_SETTINGS.thunder.lowpassHz.end, startS + plan.durationS]);
    // 轟隆與低頻都照同一條音量曲線走。
    const curved = added.filter((node) => node.gain.curves.length > 0);
    expect(curved).toHaveLength(3);
    for (const node of curved) {
      expect(node.gain.value).toBe(0);
      expect(node.gain.events).toEqual([['setValueCurveAtTime', plan.curve.length, startS, plan.durationS]]);
    }
  });

  test('遠的雷沒有開頭的脆聲；不是雷雨的天氣不打雷', () => {
    const storm = start('storm');
    const strike = Array.from({ length: 40 }, (_, index) => index).find((index) => thunderPlan(index).crack === 0) ?? 0;
    const before = storm.context.nodes.length;
    storm.ambience.thunder(strike);
    const sources = storm.context.nodes
      .slice(before)
      .filter((node) => node.kind === 'bufferSource' || node.kind === 'oscillator');
    expect(sources).toHaveLength(3);

    for (const kind of ['rain', 'drips'] as const) {
      const { context, ambience } = start(kind);
      const count = context.nodes.length;
      expect(ambience.thunder(0)).toBe(false);
      expect(context.nodes).toHaveLength(count);
    }
  });
});
