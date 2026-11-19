// 背景音樂的純函式：哪種天氣播哪一首、循環的起點與終點；兩個音檔在 public/audio/ 裡。
import { describe, expect, test } from 'vitest';
import { MENU_TRACK, MUSIC_SETTINGS, musicLengthS, musicLoopS, musicTrackFor } from '../src/audio/music';
import { WEATHER_IDS } from '../src/core/weather';

describe('哪一首', () => {
  test('夜晚與雷雨播夜晚的，其餘播白天的；關卡選擇畫面播白天的', () => {
    expect(WEATHER_IDS.map((weather) => [weather, musicTrackFor(weather)])).toEqual([
      ['clear', 'day'],
      ['dusk', 'day'],
      ['rain', 'day'],
      ['wet', 'day'],
      ['storm', 'night'],
      ['night', 'night'],
    ]);
    expect(MENU_TRACK).toBe('day');
  });

  test('兩個音檔在 public/audio/；網址是相對的（子路徑底下也找得到）', () => {
    // 沒裝 @types/node：用 Vite 的 import.meta.glob 看檔案在不在（大小由 e2e 對實際下載的回應檢查）。
    const files = Object.keys(import.meta.glob('../public/audio/*.mp3', { query: '?url' }));
    expect(files.sort()).toEqual(['../public/audio/bgm_day.mp3', '../public/audio/bgm_night.mp3']);
    expect(MUSIC_SETTINGS.tracks.day.url).toBe('audio/bgm_day.mp3');
    expect(MUSIC_SETTINGS.tracks.night.url).toBe('audio/bgm_night.mp3');
  });
});

describe('循環的起點與終點', () => {
  test('原始長度：白天 64.4 秒、夜晚 61.6 秒', () => {
    expect(musicLengthS('day')).toBeCloseTo(64.4, 9);
    expect(musicLengthS('night')).toBeCloseTo(61.6, 9);
  });

  test('解碼出來剛好是原始長度（解碼器照檔頭裁過）：整段循環', () => {
    expect(musicLoopS('day', 64.4)).toEqual({ startS: 0, endS: 64.4 });
    expect(musicLoopS('night', 61.6)).toEqual({ startS: 0, endS: 61.6 });
  });

  test('解碼器什麼都沒裁（2685 格 × 1152）：跳過開頭的 1105 個取樣，循環長度仍是原始長度', () => {
    const loop = musicLoopS('day', (2685 * 1152) / 48_000);
    expect(loop.startS).toBeCloseTo(1105 / 48_000, 12);
    expect(loop.endS - loop.startS).toBeCloseTo(64.4, 9);
    expect(loop.endS).toBeLessThan((2685 * 1152) / 48_000);
  });

  test('只多出一點點：多的全部算在開頭；比原始長度短（取整的誤差）就到緩衝區的結尾為止', () => {
    const loop = musicLoopS('night', 61.6 + 0.01);
    expect(loop.startS).toBeCloseTo(0.01, 9);
    expect(loop.endS).toBeCloseTo(61.61, 9);
    expect(musicLoopS('night', 61.5999)).toEqual({ startS: 0, endS: 61.5999 });
  });
});
