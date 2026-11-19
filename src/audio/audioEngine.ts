// 音效引擎：第一個手勢才建立並解鎖 AudioContext；聲音 → sfx 匯流排（天氣的環境聲走自己的匯流排）→ 主音量 → 限幅器 → 輸出；
// 音量與靜音、暫停與背景分頁時停住、執行 soundDirector 的指令、給 e2e 的唯讀快照。
// 沒有 AudioContext 或建立失敗時整個引擎是空動作：不丟例外、不寫 console。
import { MAX_VOLUME, type AudioSettings } from '../core/save';
import { startAmbience, type Ambience, type AmbienceKind } from './ambience';
import type { SoundCommand } from './soundDirector';
import {
  createNoiseBuffer,
  playBeep,
  playThud,
  startBeepTone,
  startHorn,
  startSiren,
  startYelp,
  VOICE_SETTINGS,
  type SustainedVoice,
} from './voices';

/** 音量開到最大時主音量的增益：留一點餘裕，幾個聲音疊在一起才不會一直壓到限幅器。 */
export const MASTER_HEADROOM = 0.8;
/** 改音量、靜音時增益的時間常數（秒）：夠短，聽起來是立刻；又不會有爆音。 */
const VOLUME_TAU_S = 0.02;
/** 限幅器（內建的壓縮器調成很硬）：三台車同時叫也不破音。 */
const LIMITER = { thresholdDb: -6, kneeDb: 0, ratio: 20, attackS: 0.003, releaseS: 0.25 } as const;
/**
 * 會解鎖聲音的手勢。瀏覽器只在算「使用者啟動」的事件裡才讓聲音開始：滑鼠是按下去，
 * 觸控與筆是放開（pointerup／touchend），鍵盤是按下去（Esc 除外）。
 */
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;
const GESTURE_OPTIONS = { capture: true, passive: true } as const;
/**
 * context 沒在出聲時（剛建立、剛解除暫停、剛回到前景，或被系統打斷），會開始新聲音的指令只再收這麼多幀：
 * 它們排在 context 停住的那個時間點，一出聲就播，所以第一個動作就是切到 R 檔也聽得到第一聲嗶。
 * 過了這麼多幀還沒出聲就丟掉，不然全部疊在同一個時間點，等它終於出聲時一起爆出來
 *（iPhone 從背景回來，要等下一次手指放開才出聲；這段時間的倒車嗶聲會疊成很大的一聲）。
 */
const STALLED_RUNS = 30;

/** 引擎需要的瀏覽器功能（測試時換成假的）。 */
export interface AudioHost {
  /** 建立 AudioContext；瀏覽器沒有這個功能就是 undefined。 */
  readonly createContext: (() => AudioContext) | undefined;
  /** 掛手勢監聽的地方（window）。 */
  readonly gestureTarget: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** 瀏覽器的 AudioHost。舊版 Safari 只有 webkitAudioContext。 */
export function browserAudioHost(view: Window & typeof globalThis): AudioHost {
  const Context =
    view.AudioContext ??
    (view as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return {
    createContext: Context === undefined ? undefined : () => new Context(),
    gestureTarget: view,
  };
}

/** 給 e2e 讀的快照。 */
export interface AudioSnapshot {
  /** 玩家已經做過第一個手勢（解鎖跑過了）。 */
  readonly unlockRequested: boolean;
  /** AudioContext 的狀態；還沒建立或建立不了是 'none'。 */
  readonly contextState: string;
  readonly volume: number;
  readonly muted: boolean;
  /** 正在響的持續聲音，例如 ['alarm:12', 'siren:0']；倒車雷達的長音是 'beepTone'。 */
  readonly voices: readonly string[];
  /** 累計嗶了幾聲。 */
  readonly beeps: number;
  /** 累計幾聲悶響。 */
  readonly thuds: number;
  /** 正在響的天氣環境聲（雨、雷雨、雨後的滴水）；這一關沒有、或還沒解鎖是 null。 */
  readonly ambience: AmbienceKind | null;
  /** 累計排了幾聲雷。 */
  readonly thunders: number;
}

export interface AudioEngine {
  /**
   * 執行這一幀的聲音指令。解鎖之前的指令直接丟掉；context 停住超過一小段時間，
   * 會開始新聲音的指令（悶響、嗶聲、新的警報）也丟掉，都不排隊補播。開關與停止已有的聲音一定執行。
   */
  run(commands: readonly SoundCommand[]): void;
  /** 改音量或靜音（靜音只把主音量降到 0，聲音照常進行，取消靜音就接上）。 */
  setAudio(settings: AudioSettings): void;
  /** 暫停、正在等玩家按新鍵：整個停住；解除就從停住的地方繼續。 */
  setHeld(held: boolean): void;
  /** 分頁切到背景：停住（背景分頁不跑畫面更新，沒有人去關警報）。 */
  setHidden(hidden: boolean): void;
  snapshot(): AudioSnapshot;
}

/** 主音量的增益：靜音是 0；否則音量的平方（聽起來比較接近線性）乘上餘裕。 */
export function masterGain(settings: AudioSettings): number {
  return settings.muted ? 0 : (settings.volume / MAX_VOLUME) ** 2 * MASTER_HEADROOM;
}

/** 倒車雷達的長音在快照裡的名字。 */
const TONE_KEY = 'beepTone';

/** 這個警報的聲音在快照裡的名字。 */
function voiceKey(index: number, siren: boolean): string {
  return `${siren ? 'siren' : 'alarm'}:${index}`;
}

/**
 * 瀏覽器不當成使用者啟動的事件：觸控與筆按下去的那一刻（放開才算）、Esc 鍵。
 * 在這種事件裡 resume 起不來，只會留下一個停住的 context。
 */
function cannotUnlock(event: Event): boolean {
  return (
    (event.type === 'pointerdown' && (event as PointerEvent).pointerType !== 'mouse') ||
    (event.type === 'keydown' && (event as KeyboardEvent).key === 'Escape')
  );
}

/** 這個指令會開始一個新的聲音（其餘的只是開關或停掉已有的）。 */
function startsSound(command: SoundCommand): boolean {
  return (
    command.type === 'thud' ||
    command.type === 'beep' ||
    command.type === 'alarmStart' ||
    command.type === 'thunder'
  );
}

/** resume／suspend 被瀏覽器拒絕（還沒有手勢、被系統打斷）不算錯：下一個手勢會再試。 */
function quietly(pending: Promise<void>): void {
  pending.catch(() => undefined);
}

interface Graph {
  readonly context: AudioContext;
  readonly sfx: GainNode;
  readonly master: GainNode;
  readonly noise: AudioBuffer;
  /** 天氣的環境聲（有自己的匯流排）；這一關沒有就是 null，也不建立空的匯流排。 */
  readonly ambience: Ambience | null;
}

/**
 * @param ambienceKind 這一關的天氣環境聲（audio/ambience.ts 的 ambienceFor）；null = 沒有
 */
export function createAudioEngine(
  host: AudioHost,
  initial: AudioSettings,
  ambienceKind: AmbienceKind | null = null,
): AudioEngine {
  let settings = initial;
  let graph: Graph | null = null;
  /** 建立失敗過就不再試。 */
  let failed = host.createContext === undefined;
  let unlockRequested = false;
  /** context 曾經進到 running（解鎖成功過）。 */
  let everRan = false;
  /** context 沒在出聲已經連續幾幀（上限 STALLED_RUNS）；開始出聲、暫停或前景背景一變就歸零。 */
  let stalledRuns = 0;
  let held = false;
  let hidden = false;
  let listening = false;
  let beeps = 0;
  let thuds = 0;
  let thunders = 0;
  /** 持續的聲音：名字 → 聲音；keys 記每個障礙物索引的警報用的是哪個名字。 */
  const voices = new Map<string, SustainedVoice>();
  const keys = new Map<number, string>();
  /**
   * 倒車雷達的長音現在該不該響。它是一個「狀態」而不是一次性的聲音：context 停住太久而沒有開始的話，
   * 恢復出聲後的下一幀補上（車還貼著後面的東西，長音就該在）。
   */
  let toneWanted = false;

  function listen(on: boolean): void {
    if (listening === on) {
      return;
    }
    listening = on;
    for (const type of GESTURES) {
      if (on) {
        host.gestureTarget.addEventListener(type, unlock, GESTURE_OPTIONS);
      } else {
        host.gestureTarget.removeEventListener(type, unlock, GESTURE_OPTIONS);
      }
    }
  }

  /** 讓 context 的狀態跟上「現在該不該出聲」。 */
  function sync(): void {
    if (graph === null) {
      return;
    }
    const { context } = graph;
    const wanted = !held && !hidden;
    if (wanted && context.state === 'suspended') {
      quietly(context.resume());
    } else if (!wanted && context.state === 'running') {
      quietly(context.suspend());
    }
  }

  function build(create: () => AudioContext): Graph | null {
    let context: AudioContext;
    try {
      context = create();
    } catch {
      return null;
    }
    try {
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = LIMITER.thresholdDb;
      limiter.knee.value = LIMITER.kneeDb;
      limiter.ratio.value = LIMITER.ratio;
      limiter.attack.value = LIMITER.attackS;
      limiter.release.value = LIMITER.releaseS;
      limiter.connect(context.destination);
      const master = context.createGain();
      master.gain.value = masterGain(settings);
      master.connect(limiter);
      const sfx = context.createGain();
      sfx.connect(master);
      context.addEventListener('statechange', () => {
        // 開始出聲就不必再聽手勢；被停住（來電、切 App、我們自己暫停）就重新聽，下一個手勢再解鎖。
        if (context.state === 'running') {
          everRan = true;
          listen(false);
        } else if (context.state !== 'closed') {
          listen(true);
        }
        sync();
      });
      return {
        context,
        sfx,
        master,
        noise: createNoiseBuffer(context),
        // 環境聲一解鎖就開始（從無聲淡入），之後一直響；暫停時跟著 context 停住。
        ambience: ambienceKind === null ? null : startAmbience(context, master, ambienceKind),
      };
    } catch {
      quietly(context.close());
      return null;
    }
  }

  /** 手勢的處理函式：同步建立 context、resume、播一格無聲的緩衝（舊版 iOS 要這一步才算解鎖）。 */
  function unlock(event: Event): void {
    if (cannotUnlock(event)) {
      return;
    }
    unlockRequested = true;
    if (graph === null && !failed && host.createContext !== undefined) {
      graph = build(host.createContext);
      failed = graph === null;
    }
    if (graph === null) {
      listen(false);
      return;
    }
    const { context } = graph;
    if (context.state === 'running') {
      // 已經在出聲（有的瀏覽器一建立就是 running，不會另外通知）。
      everRan = true;
      listen(false);
      return;
    }
    // 我們自己停住的時候（暫停、背景）不靠手勢叫醒；但第一次解鎖一定要在手勢裡 resume
    //（開始之後 statechange 那邊的 sync 會再把它停住）。
    if ((!held && !hidden) || !everRan) {
      quietly(context.resume());
      const silent = context.createBufferSource();
      silent.buffer = context.createBuffer(1, 1, context.sampleRate);
      silent.connect(context.destination);
      silent.start();
    }
  }

  function stopVoice(index: number, fadeS: number): void {
    const key = keys.get(index);
    if (key !== undefined) {
      voices.get(key)?.stop(fadeS);
      voices.delete(key);
      keys.delete(index);
    }
  }

  function execute({ context, sfx, noise, ambience }: Graph, command: SoundCommand): void {
    switch (command.type) {
      case 'thunder':
        if (ambience?.thunder(command.strike) === true) {
          thunders += 1;
        }
        break;
      case 'ambienceDip':
        ambience?.dip();
        break;
      case 'thud':
        playThud(context, sfx, noise, command.gain);
        thuds += 1;
        break;
      case 'beep':
        playBeep(context, sfx, command.durationS);
        beeps += 1;
        break;
      case 'beepTone':
        toneWanted = command.on;
        if (!command.on) {
          voices.get(TONE_KEY)?.stop(VOICE_SETTINGS.beep.toneFadeS);
          voices.delete(TONE_KEY);
        }
        break;
      case 'alarmStart': {
        if (keys.has(command.index)) {
          break;
        }
        const { variant } = command;
        const voice =
          variant.sound === 'horn'
            ? startHorn(context, sfx, variant.detuneCents)
            : variant.sound === 'yelp'
              ? startYelp(context, sfx)
              : startSiren(context, sfx);
        const key = voiceKey(command.index, variant.sound === 'siren');
        keys.set(command.index, key);
        voices.set(key, voice);
        break;
      }
      case 'alarmGate': {
        const key = keys.get(command.index);
        if (key !== undefined) {
          voices.get(key)?.gate(command.on);
        }
        break;
      }
      case 'alarmStop':
        stopVoice(command.index, command.fadeS);
        break;
      case 'stopAll':
        for (const index of [...keys.keys()]) {
          stopVoice(index, command.fadeS);
        }
        break;
    }
  }

  if (!failed) {
    listen(true);
  }

  return {
    run: (commands) => {
      if (graph === null) {
        return;
      }
      let canStart = true;
      if (graph.context.state === 'running') {
        stalledRuns = 0;
      } else if (stalledRuns === STALLED_RUNS) {
        canStart = false;
      } else {
        stalledRuns += 1;
      }
      for (const command of commands) {
        if (canStart || !startsSound(command)) {
          execute(graph, command);
        }
      }
      if (toneWanted && canStart && !voices.has(TONE_KEY)) {
        voices.set(TONE_KEY, startBeepTone(graph.context, graph.sfx));
      }
    },
    setAudio: (next) => {
      settings = next;
      if (graph === null) {
        return;
      }
      const { context, master } = graph;
      const gain = masterGain(next);
      if (context.state === 'running') {
        master.gain.setTargetAtTime(gain, context.currentTime, VOLUME_TAU_S);
      } else {
        // 停住的時候（暫停面板就是在這時候調音量）時間不走，直接設，繼續時第一個取樣就是新的音量。
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.value = gain;
      }
    },
    setHeld: (next) => {
      if (held !== next) {
        held = next;
        stalledRuns = 0;
        sync();
      }
    },
    setHidden: (next) => {
      if (hidden !== next) {
        hidden = next;
        stalledRuns = 0;
        sync();
      }
    },
    snapshot: () => ({
      unlockRequested,
      contextState: graph === null ? 'none' : graph.context.state,
      volume: settings.volume,
      muted: settings.muted,
      voices: [...voices.keys()],
      beeps,
      thuds,
      ambience: graph?.ambience?.kind ?? null,
      thunders,
    }),
  };
}
