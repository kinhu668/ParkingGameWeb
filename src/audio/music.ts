// 背景音樂的設定與純函式：哪種天氣播哪一首、循環的起點與終點。不碰 Web Audio、不碰 DOM。
// 兩首都是已經做好首尾交叉淡化的循環（MP3 96 kbps、48 kHz 立體聲），放在 public/audio/，解鎖之後才下載。
import type { WeatherId } from '../core/weather';

/** 兩首背景音樂：白天的、夜晚的。 */
export type MusicTrack = 'day' | 'night';

export const MUSIC_SETTINGS = {
  /**
   * 每一首的網址（相對於頁面，放在子路徑底下也找得到）與原始長度（取樣數，48 kHz）：
   * 白天 3,091,200 個取樣 = 64.4 秒，夜晚 2,956,800 個取樣 = 61.6 秒。循環的長度以這個為準，不是解碼出來的長度。
   */
  tracks: {
    day: { url: 'audio/bgm_day.mp3', samples: 3_091_200 },
    night: { url: 'audio/bgm_night.mp3', samples: 2_956_800 },
  },
  sampleRate: 48_000,
  /**
   * MP3 的編碼器會在開頭墊 576 個取樣、結尾補到整格；檔頭（Info 標籤）有寫，照著裁的解碼器解出來剛好是原始長度。
   * 不裁的解碼器另外還有自己的 529 個取樣的延遲，所以多出來的部分先算在開頭，最多 576 + 529 = 1105 個取樣。
   */
  decoderLeadSamples: 1105,
  /**
   * 循環的最後這麼多秒加一條斜坡，讓最後一個取樣接上循環的第一個取樣：交付的兩首在接點有落差
   * （差 0.1–0.2 滿刻度，平常相鄰取樣只差 0.003），不處理的話每循環一次「喀」一聲。
   */
  seamRampS: 0.02,
  /** 音樂匯流排的音量（相對於音效）、解鎖後淡入多久（秒）。 */
  gain: 0.35,
  fadeInS: 1.5,
  /** 玩家關掉音樂（或靜音）時收掉的時間常數（秒）。 */
  offTauS: 0.03,
  /** 有車輛警報或救護車警笛在響時壓低到這個比例（約 −6 dB）；壓下去與回來的時間常數（秒）：壓得快、回來得慢。 */
  duckGain: 0.5,
  duckTauS: 0.15,
  unduckTauS: 0.6,
} as const;

/** 關卡選擇畫面播的那一首。 */
export const MENU_TRACK: MusicTrack = 'day';

/** 這種天氣播哪一首：夜晚與雷雨是夜晚的，其餘（晴、黃昏、雨、雨後）是白天的。 */
export function musicTrackFor(weather: WeatherId): MusicTrack {
  return weather === 'night' || weather === 'storm' ? 'night' : 'day';
}

/** 這一首的原始長度（秒）。 */
export function musicLengthS(track: MusicTrack): number {
  return MUSIC_SETTINGS.tracks[track].samples / MUSIC_SETTINGS.sampleRate;
}

/**
 * 循環的起點與終點（秒）：長度剛好是原始長度，接點才不會有空隙或「喀」一聲。
 * 解碼出來比原始長度長（解碼器沒有裁掉墊的取樣）：多出來的先算在開頭（最多 decoderLeadSamples），從那裡開始循環。
 * @param decodedS 解碼後的緩衝區長度（秒；context 的取樣率不是 48 kHz 時瀏覽器會重新取樣，秒數不變）
 */
export function musicLoopS(track: MusicTrack, decodedS: number): { readonly startS: number; readonly endS: number } {
  const lengthS = musicLengthS(track);
  const leadS = MUSIC_SETTINGS.decoderLeadSamples / MUSIC_SETTINGS.sampleRate;
  const startS = Math.min(Math.max(decodedS - lengthS, 0), leadS);
  return { startS, endS: Math.min(startS + lengthS, decodedS) };
}
