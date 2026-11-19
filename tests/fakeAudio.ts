// 手寫的假 AudioContext：不出聲，只記錄節點怎麼接、參數排了哪些時間、音源什麼時候開始與停止。
// 這個環境聽不到聲音，音效的測試靠它驗證接線（誰接到誰、頻率、音量、resume／suspend）。
import type { AudioHost } from '../src/audio/audioEngine';

/** 一次排程呼叫：方法名與參數。 */
export type ParamEvent = readonly [method: string, ...args: number[]];

export class FakeParam {
  value: number;
  readonly events: ParamEvent[] = [];

  constructor(value: number) {
    this.value = value;
  }

  setValueAtTime(value: number, time: number): this {
    this.events.push(['setValueAtTime', value, time]);
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push(['linearRampToValueAtTime', value, time]);
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.events.push(['exponentialRampToValueAtTime', value, time]);
    return this;
  }

  setTargetAtTime(value: number, time: number, timeConstant: number): this {
    this.events.push(['setTargetAtTime', value, time, timeConstant]);
    return this;
  }

  cancelScheduledValues(time: number): this {
    this.events.push(['cancelScheduledValues', time]);
    return this;
  }
}

export class FakeBuffer {
  readonly data: Float32Array;

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

export type FakeNodeKind = 'gain' | 'oscillator' | 'filter' | 'compressor' | 'bufferSource' | 'destination';

/** 一個節點。所有種類共用一個類別：用不到的參數就放著。 */
export class FakeNode {
  /** 接出去的對象（節點，或另一個節點的參數）。 */
  readonly outputs: (FakeNode | FakeParam)[] = [];
  /** start(when)／stop(when) 被叫到的時間。 */
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  /** 振盪器的波形或濾波器的種類。 */
  type = '';
  buffer: FakeBuffer | null = null;
  readonly gain = new FakeParam(1);
  readonly frequency = new FakeParam(0);
  readonly detune = new FakeParam(0);
  readonly Q = new FakeParam(1);
  readonly threshold = new FakeParam(-24);
  readonly knee = new FakeParam(30);
  readonly ratio = new FakeParam(12);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);

  constructor(readonly kind: FakeNodeKind) {}

  connect<Target extends FakeNode | FakeParam>(target: Target): Target {
    this.outputs.push(target);
    return target;
  }

  start(when = 0): void {
    this.starts.push(when);
  }

  stop(when = 0): void {
    this.stops.push(when);
  }
}

export class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly destination = new FakeNode('destination');
  /** 建立過的節點，依建立的先後。 */
  readonly nodes: FakeNode[] = [];
  resumes = 0;
  suspends = 0;
  /** true = 瀏覽器不讓它開始：resume 之後還是 suspended。 */
  blocked = false;
  /** true = resume／suspend 回傳被拒絕的 promise。 */
  rejecting = false;
  private readonly listeners: (() => void)[] = [];

  addEventListener(type: string, listener: () => void): void {
    if (type === 'statechange') {
      this.listeners.push(listener);
    }
  }

  private node(kind: FakeNodeKind): FakeNode {
    const node = new FakeNode(kind);
    this.nodes.push(node);
    return node;
  }

  createGain(): FakeNode {
    return this.node('gain');
  }

  createOscillator(): FakeNode {
    return this.node('oscillator');
  }

  createBiquadFilter(): FakeNode {
    return this.node('filter');
  }

  createDynamicsCompressor(): FakeNode {
    return this.node('compressor');
  }

  createBufferSource(): FakeNode {
    return this.node('bufferSource');
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): FakeBuffer {
    return new FakeBuffer(numberOfChannels, length, sampleRate);
  }

  /** 像真的一樣：狀態在稍後（微任務）才變，並發出 statechange。 */
  resume(): Promise<void> {
    this.resumes += 1;
    return this.settle(this.blocked ? this.state : 'running');
  }

  suspend(): Promise<void> {
    this.suspends += 1;
    return this.settle('suspended');
  }

  private settle(next: FakeAudioContext['state']): Promise<void> {
    if (this.rejecting) {
      return Promise.reject(new Error('not allowed'));
    }
    return Promise.resolve().then(() => {
      this.setState(next);
    });
  }

  /** 直接改狀態（模擬系統打斷，例如來電）。 */
  setState(next: FakeAudioContext['state']): void {
    if (this.state !== next) {
      this.state = next;
      for (const listener of this.listeners) {
        listener();
      }
    }
  }

  of(kind: FakeNodeKind): FakeNode[] {
    return this.nodes.filter((node) => node.kind === kind);
  }
}

/** 假的 window：記錄掛了哪些手勢監聽，fire 模擬一次手勢。 */
export class FakeGestureTarget {
  readonly listeners = new Map<string, Set<() => void>>();
  /** 每次 addEventListener 傳進來的選項。 */
  readonly options: unknown[] = [];

  addEventListener(type: string, listener: () => void, options?: unknown): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    this.options.push(options);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  fire(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener();
    }
  }

  /** 現在掛著監聽的事件種類。 */
  listening(): string[] {
    return [...this.listeners].filter(([, set]) => set.size > 0).map(([type]) => type);
  }
}

/** 把假的 context 當成真的型別交給被測的程式。 */
export function asContext(context: FakeAudioContext): AudioContext {
  return context as unknown as AudioContext;
}

export function asNode(node: FakeNode): AudioNode {
  return node as unknown as AudioNode;
}

/** 用假的 context 與假的 window 組一個 AudioHost。 */
export function fakeHost(context: FakeAudioContext, target: FakeGestureTarget): AudioHost {
  return {
    createContext: () => asContext(context),
    gestureTarget: target as unknown as AudioHost['gestureTarget'],
  };
}

/** 等微任務跑完（resume／suspend 的狀態變化）。 */
export async function settled(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await Promise.resolve();
  }
}

/** 從這個節點一路往下游走（只走節點，不走參數），回傳走到的每一個節點。 */
export function downstream(node: FakeNode): FakeNode[] {
  const seen: FakeNode[] = [];
  const queue = [node];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const output of next.outputs) {
      if (output instanceof FakeNode && !seen.includes(output)) {
        seen.push(output);
        queue.push(output);
      }
    }
  }
  return seen;
}
