// 合成配方的接線：這個環境聽不到聲音，所以用假的 AudioContext 檢查每一種聲音接了哪些節點、頻率與音量、何時開始與結束。
import { describe, expect, test } from 'vitest';
import {
  VOICE_SETTINGS,
  createNoiseBuffer,
  playBeep,
  playThud,
  startBeepTone,
  startHorn,
  startSiren,
  startYelp,
} from '../src/audio/voices';
import {
  FakeAudioContext,
  FakeNode,
  asContext,
  asNode,
  downstream,
  type FakeBuffer,
  type ParamEvent,
} from './fakeAudio';

/** 一個在 12.5 秒的假 context 與一個假的 sfx 匯流排。 */
function stage(): { context: FakeAudioContext; bus: FakeNode } {
  const context = new FakeAudioContext();
  context.currentTime = 12.5;
  return { context, bus: new FakeNode('gain') };
}

function noiseOf(context: FakeAudioContext): FakeBuffer {
  return createNoiseBuffer(asContext(context)) as unknown as FakeBuffer;
}

/** 這個節點的聲音最後都流進匯流排。 */
function reaches(node: FakeNode, bus: FakeNode): boolean {
  return downstream(node).includes(bus);
}

function lastEvent(events: readonly ParamEvent[]): ParamEvent | undefined {
  return events.at(-1);
}

describe('雜訊緩衝', () => {
  test('固定種子：每次都是同一段，長度 0.2 秒，數值在 −1 到 1 之間而且不是常數', () => {
    const context = new FakeAudioContext();
    const first = noiseOf(context);
    const second = noiseOf(context);
    expect(first.length).toBe(Math.round(context.sampleRate * VOICE_SETTINGS.noise.durationS));
    expect(first.numberOfChannels).toBe(1);
    expect([...first.data]).toEqual([...second.data]);
    expect(Math.min(...first.data)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...first.data)).toBeLessThanOrEqual(1);
    expect(new Set(first.data.slice(0, 200)).size).toBeGreaterThan(150);
    // 沒有直流偏移：平均值接近 0。
    const mean = first.data.reduce((sum, sample) => sum + sample, 0) / first.length;
    expect(Math.abs(mean)).toBeLessThan(0.02);
  });
});

describe('碰撞悶響', () => {
  test('雜訊過 900 Hz 低通（車殼悶悶的那一層）與 1100 Hz 帶通（短促的「喀」），加 70→40 Hz 與 185→110 Hz 兩個下滑的正弦，0.12 秒內結束', () => {
    const { context, bus } = stage();
    const noise = noiseOf(context);
    playThud(asContext(context), asNode(bus), noise as unknown as AudioBuffer, 0.6);
    const now = context.currentTime;
    const { thud } = VOICE_SETTINGS;

    const [burst] = context.of('bufferSource');
    expect(burst?.buffer).toBe(noise);
    expect(burst?.starts).toEqual([now]);
    expect(burst?.stops).toEqual([now + thud.durationS]);
    const [lowpass, bandpass] = context.of('filter');
    expect(context.of('filter')).toHaveLength(2);
    expect(burst?.outputs).toEqual([lowpass, bandpass]);
    expect(lowpass?.type).toBe('lowpass');
    expect(lowpass?.frequency.value).toBe(900);
    // 碰到的那一下：中頻、0.04 秒就收掉。
    expect(bandpass?.type).toBe('bandpass');
    expect(bandpass?.frequency.value).toBe(1100);
    const crack = context.of('gain').find((node) => bandpass?.outputs.includes(node));
    expect(crack?.gain.events).toEqual([
      ['setValueAtTime', thud.crackGain, now],
      ['exponentialRampToValueAtTime', 0.001, now + 0.04],
    ]);

    const sines = context.of('oscillator');
    expect(sines.map((sine) => sine.type)).toEqual(['sine', 'sine']);
    expect(sines.map((sine) => sine.frequency.events)).toEqual([
      [
        ['setValueAtTime', 70, now],
        ['exponentialRampToValueAtTime', 40, now + thud.durationS],
      ],
      [
        ['setValueAtTime', 185, now],
        ['exponentialRampToValueAtTime', 110, now + thud.knockDurationS],
      ],
    ]);
    for (const source of [burst, ...sines]) {
      expect(source?.starts).toEqual([now]);
      expect(Math.max(...(source?.stops ?? [Infinity]))).toBeLessThanOrEqual(now + 0.12 + 1e-9);
      expect(source !== undefined && reaches(source, bus)).toBe(true);
    }
  });

  test('整體音量是傳進來的 gain；每一層都從自己的音量指數衰減到幾乎無聲', () => {
    const { context, bus } = stage();
    playThud(asContext(context), asNode(bus), noiseOf(context) as unknown as AudioBuffer, 0.6);
    const now = context.currentTime;
    const out = context.of('gain').find((node) => node.outputs.includes(bus));
    expect(out?.gain.value).toBe(0.6);
    // 只有出口接到匯流排。
    expect(context.nodes.filter((node) => node.outputs.includes(bus))).toEqual([out]);
    const envelopes = context.of('gain').filter((node) => node !== out);
    expect(envelopes.map((envelope) => envelope.gain.events[0])).toEqual([
      ['setValueAtTime', VOICE_SETTINGS.thud.noiseGain, now],
      ['setValueAtTime', VOICE_SETTINGS.thud.crackGain, now],
      ['setValueAtTime', VOICE_SETTINGS.thud.subGain, now],
      ['setValueAtTime', VOICE_SETTINGS.thud.knockGain, now],
    ]);
    for (const envelope of envelopes) {
      const [method, value] = lastEvent(envelope.gain.events) ?? [];
      expect(method).toBe('exponentialRampToValueAtTime');
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(0.001);
      expect(envelope.outputs).toEqual([out]);
    }
  });
});

describe('倒車嗶聲', () => {
  test('1000 Hz 正弦加弱的 2000 Hz，0.22 秒，起音與收音各 8 ms，音量 0.18', () => {
    const { context, bus } = stage();
    playBeep(asContext(context), asNode(bus), VOICE_SETTINGS.beep.durationS);
    const now = context.currentTime;
    const tones = context.of('oscillator');
    expect(tones.map((tone) => [tone.type, tone.frequency.value])).toEqual([
      ['sine', 1000],
      ['sine', 2000],
    ]);
    for (const tone of tones) {
      expect(tone.starts).toEqual([now]);
      expect(tone.stops).toEqual([now + 0.22]);
    }
    const envelope = context.of('gain').find((node) => node.outputs.includes(bus));
    expect(envelope?.gain.events).toEqual([
      ['setValueAtTime', 0, now],
      ['linearRampToValueAtTime', 0.18, now + 0.008],
      ['setValueAtTime', 0.18, now + 0.22 - 0.008],
      ['linearRampToValueAtTime', 0, now + 0.22],
    ]);
    // 兩個分音各自的音量：基音 1、二倍頻 0.25，都進同一個包絡。
    const partials = tones.map((tone) => tone.outputs[0] as FakeNode);
    expect(partials.map((partial) => partial.gain.value)).toEqual([1, 0.25]);
    for (const partial of partials) {
      expect(partial.outputs).toEqual([envelope]);
    }
  });
});

describe('倒車雷達', () => {
  test('嗶得快的時候一聲比較短：長度是傳進來的秒數，起音與收音照舊各 8 ms', () => {
    const { context, bus } = stage();
    playBeep(asContext(context), asNode(bus), 0.07);
    const now = context.currentTime;
    for (const tone of context.of('oscillator')) {
      expect(tone.starts).toEqual([now]);
      expect(tone.stops).toEqual([now + 0.07]);
    }
    const envelope = context.of('gain').find((node) => node.outputs.includes(bus));
    expect(envelope?.gain.events).toEqual([
      ['setValueAtTime', 0, now],
      ['linearRampToValueAtTime', 0.18, now + 0.008],
      ['setValueAtTime', 0.18, now + 0.07 - 0.008],
      ['linearRampToValueAtTime', 0, now + 0.07],
    ]);
  });

  test('長音：與嗶聲同一個音色（1000 Hz 加弱的 2000 Hz）與音量，淡入之後一直響到 stop', () => {
    const { context, bus } = stage();
    const tone = startBeepTone(asContext(context), asNode(bus));
    const now = context.currentTime;
    const tones = context.of('oscillator');
    expect(tones.map((each) => [each.type, each.frequency.value])).toEqual([
      ['sine', 1000],
      ['sine', 2000],
    ]);
    expect(tones.map((each) => (each.outputs[0] as FakeNode).gain.value)).toEqual([1, 0.25]);
    const out = context.of('gain').find((node) => node.outputs.includes(bus));
    expect(out?.gain.value).toBe(0);
    expect(out?.gain.events).toEqual([
      ['setValueAtTime', 0, now],
      ['linearRampToValueAtTime', VOICE_SETTINGS.beep.gain, now + VOICE_SETTINGS.edgeS],
    ]);
    for (const each of tones) {
      expect(reaches(each, bus)).toBe(true);
      expect(each.starts).toEqual([now]);
      expect(each.stops).toEqual([]);
    }
    context.currentTime += 2;
    tone.stop(0.03);
    expect(lastEvent(out?.gain.events ?? [])).toEqual(['setTargetAtTime', 0, now + 2, 0.03 / 5]);
    for (const each of tones) {
      expect(each.stops).toEqual([now + 2 + 0.03]);
    }
  });
});

describe('車輛警報（喇叭型）', () => {
  test('420 與 525 Hz 兩個方波（照這台車的音分變調）過 1.8 kHz 低通，淡入到設定的音量', () => {
    const { context, bus } = stage();
    startHorn(asContext(context), asNode(bus), 150);
    const now = context.currentTime;
    const tones = context.of('oscillator');
    expect(tones.map((tone) => [tone.type, tone.frequency.value, tone.detune.value])).toEqual([
      ['square', 420, 150],
      ['square', 525, 150],
    ]);
    const [lowpass] = context.of('filter');
    expect([lowpass?.type, lowpass?.frequency.value]).toEqual(['lowpass', 1800]);
    const [out] = context.of('gain');
    for (const tone of tones) {
      expect(tone.outputs).toEqual([lowpass]);
      expect(tone.starts).toEqual([now]);
      expect(tone.stops).toEqual([]);
    }
    expect(lowpass?.outputs).toEqual([out]);
    expect(out?.outputs).toEqual([bus]);
    expect(out?.gain.events).toEqual([
      ['setValueAtTime', 0, now],
      ['linearRampToValueAtTime', VOICE_SETTINGS.horn.gain, now + VOICE_SETTINGS.edgeS],
    ]);
  });

  test('gate 關是往 0、開是往原本的音量，用短的時間常數接過去（沒有瞬間跳變）', () => {
    const { context, bus } = stage();
    const voice = startHorn(asContext(context), asNode(bus), 0);
    const [out] = context.of('gain');
    context.currentTime = 13;
    voice.gate(false);
    context.currentTime = 13.35;
    voice.gate(true);
    const [off, on] = out?.gain.events.slice(-2) ?? [];
    expect(off?.slice(0, 3)).toEqual(['setTargetAtTime', 0, 13]);
    expect(on?.slice(0, 3)).toEqual(['setTargetAtTime', VOICE_SETTINGS.horn.gain, 13.35]);
    for (const event of [off, on]) {
      expect(event?.[3]).toBeGreaterThan(0);
      expect(event?.[3]).toBeLessThan(0.01);
    }
  });

  test('stop：取消排程、在 fadeS 內淡到無聲，振盪器在淡完時停掉', () => {
    const { context, bus } = stage();
    const voice = startHorn(asContext(context), asNode(bus), 0);
    context.currentTime = 14;
    voice.stop(0.8);
    const [out] = context.of('gain');
    expect(out?.gain.events.slice(-2)).toEqual([
      ['cancelScheduledValues', 14],
      ['setTargetAtTime', 0, 14, 0.8 / 5],
    ]);
    for (const tone of context.of('oscillator')) {
      expect(tone.stops).toEqual([14.8]);
    }
  });

  test('出口增益的底值是 0：context 停住時在同一個時間點開始又停掉，排程被取消之後剩下的是無聲，不是增益節點預設的 1', () => {
    for (const start of [
      (context: BaseAudioContext, bus: AudioNode) => startHorn(context, bus, 0),
      startYelp,
      startSiren,
    ]) {
      const { context, bus } = stage();
      const voice = start(asContext(context), asNode(bus));
      const [out] = context.of('gain');
      expect(out?.outputs).toEqual([bus]);
      expect(out?.gain.value).toBe(0);
      voice.stop(0.03);
      expect(out?.gain.events.slice(-2)).toEqual([
        ['cancelScheduledValues', context.currentTime],
        ['setTargetAtTime', 0, context.currentTime, 0.03 / 5],
      ]);
    }
  });
});

describe('車輛警報（警報器型）', () => {
  test('鋸齒波在 650–1500 Hz 之間每秒上掃 4 次（鋸齒波的低頻振盪器推頻率），過低通', () => {
    const { context, bus } = stage();
    startYelp(asContext(context), asNode(bus));
    const [carrier, lfo] = context.of('oscillator');
    expect([carrier?.type, carrier?.frequency.value]).toEqual(['sawtooth', 1075]);
    expect([lfo?.type, lfo?.frequency.value]).toEqual(['sawtooth', 4]);
    const depth = lfo?.outputs[0] as FakeNode;
    expect(depth.gain.value).toBe(425);
    expect(depth.outputs).toEqual([carrier?.frequency]);
    const [lowpass] = context.of('filter');
    expect(lowpass?.type).toBe('lowpass');
    expect(carrier?.outputs).toEqual([lowpass]);
    const out = lowpass?.outputs[0] as FakeNode;
    expect(out.outputs).toEqual([bus]);
    expect([carrier?.starts, lfo?.starts]).toEqual([[12.5], [12.5]]);
  });
});

describe('救護車警笛', () => {
  test('鋸齒波在 650–1550 Hz 之間來回掃（三角波、每秒 3.3 次），過帶通；stop 之前一直響', () => {
    const { context, bus } = stage();
    const voice = startSiren(asContext(context), asNode(bus));
    const [carrier, lfo] = context.of('oscillator');
    expect([carrier?.type, carrier?.frequency.value]).toEqual(['sawtooth', 1100]);
    expect([lfo?.type, lfo?.frequency.value]).toEqual(['triangle', 3.3]);
    const depth = lfo?.outputs[0] as FakeNode;
    expect(depth.gain.value).toBe(450);
    expect(depth.outputs).toEqual([carrier?.frequency]);
    const [bandpass] = context.of('filter');
    expect(bandpass?.type).toBe('bandpass');
    expect(bandpass?.frequency.value).toBeGreaterThan(650);
    expect(bandpass?.frequency.value).toBeLessThan(1550);
    const out = bandpass?.outputs[0] as FakeNode;
    expect(out.outputs).toEqual([bus]);
    expect(carrier?.stops).toEqual([]);
    context.currentTime = 15;
    voice.stop(0.06);
    expect([carrier?.stops, lfo?.stops]).toEqual([[15.06], [15.06]]);
  });
});

describe('音量不刺耳', () => {
  test('每一種聲音單獨響的時候峰值都遠低於滿刻度；倒車嗶聲的音量是 0.18', () => {
    const { horn, yelp, siren, beep } = VOICE_SETTINGS;
    // 喇叭是兩個方波相加，峰值是 2 × gain。
    for (const peak of [horn.gain * horn.tonesHz.length, yelp.gain, siren.gain, beep.gain * 1.25]) {
      expect(peak).toBeLessThanOrEqual(0.3);
    }
    expect(beep.gain).toBe(0.18);
  });
});
