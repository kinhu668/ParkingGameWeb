// 背景音樂的播放：玩家打開（而且沒靜音）之後才下載、解碼，然後一直循環。不在第一次載入時下載，也不擋第一幀。
// 音源 → 開關與淡入 → 音樂匯流排（音量、有警報時壓低）→ 主音量（audioEngine.ts 接）。
// 下載或解碼失敗就是沒有音樂：不丟例外、不寫 console、不重試。
import { MUSIC_SETTINGS, musicLoopS, type MusicTrack } from './music';

/** 給 e2e 讀的狀態：idle = 還沒開始（還沒解鎖、這個畫面沒有音樂、或載入失敗）；off = 玩家關掉了（或靜音）。 */
export type MusicState = 'idle' | 'loading' | 'playing' | 'off';

export interface Music {
  /** 開或關（音樂的開關與靜音合起來）。第一次打開才下載；關掉時音源照走，只是沒聲音，再打開就接上。 */
  setOn(on: boolean): void;
  /** 有車輛警報或警笛在響：壓低；停了再慢慢回來。 */
  setDucked(ducked: boolean): void;
  state(): MusicState;
  ducked(): boolean;
}

/** 解碼。回呼與 promise 兩種寫法都接：舊版 Safari 只有回呼；新的瀏覽器另外回傳的 promise 失敗時也要有人接。 */
function decode(context: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const pending: Promise<AudioBuffer> | undefined = context.decodeAudioData(data, resolve, reject);
    pending?.catch(() => undefined);
  });
}

/**
 * @param fetchAudio 下載音檔（audioEngine.ts 的 AudioHost.fetchAudio）
 */
export function createMusic(
  context: BaseAudioContext,
  master: AudioNode,
  track: MusicTrack,
  fetchAudio: (url: string) => Promise<ArrayBuffer>,
): Music {
  const settings = MUSIC_SETTINGS;
  const bus = context.createGain();
  bus.gain.value = settings.gain;
  bus.connect(master);
  const level = context.createGain();
  level.gain.value = 0;
  level.connect(bus);
  let on = false;
  let ducked = false;
  let load: 'none' | 'loading' | 'playing' | 'failed' = 'none';

  /** 開：從無聲淡入。關：很快收掉；context 停住時（暫停面板）直接設，繼續時第一個取樣就是無聲。 */
  function applyOn(): void {
    const now = context.currentTime;
    level.gain.cancelScheduledValues(now);
    if (on) {
      level.gain.setValueAtTime(0, now);
      level.gain.linearRampToValueAtTime(1, now + settings.fadeInS);
    } else if (context.state === 'running') {
      level.gain.setTargetAtTime(0, now, settings.offTauS);
    } else {
      level.gain.value = 0;
    }
  }

  function start(buffer: AudioBuffer): void {
    const { startS, endS } = musicLoopS(track, buffer.duration);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = startS;
    source.loopEnd = endS;
    source.connect(level);
    source.start(0, startS);
    load = 'playing';
    if (on) {
      applyOn();
    }
  }

  function begin(): void {
    load = 'loading';
    Promise.resolve()
      .then(() => fetchAudio(settings.tracks[track].url))
      .then((data) => decode(context, data))
      .then(start)
      .catch(() => {
        load = 'failed';
      });
  }

  return {
    setOn(next) {
      if (on === next) {
        return;
      }
      on = next;
      if (load === 'none' && on) {
        begin();
      } else if (load === 'playing') {
        applyOn();
      }
    },
    setDucked(next) {
      if (ducked === next) {
        return;
      }
      ducked = next;
      bus.gain.setTargetAtTime(
        settings.gain * (ducked ? settings.duckGain : 1),
        context.currentTime,
        ducked ? settings.duckTauS : settings.unduckTauS,
      );
    },
    state: () => (!on ? 'off' : load === 'loading' ? 'loading' : load === 'playing' ? 'playing' : 'idle'),
    ducked: () => ducked,
  };
}
