// 暫停面板的音效列：「−」「＋」怎麼改音量、靜音鈕上寫什麼、讀數的格式，以及七個翻譯鍵兩種語言都有。
import { describe, expect, test } from 'vitest';
import { DEFAULT_AUDIO, MAX_VOLUME, type AudioSettings } from '../src/core/save';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';
import { VOLUME_STEP, formatVolume, muteLabelKey, volumeStepped } from '../src/ui/pausePanel';

describe('音量的「−」「＋」', () => {
  test('一次 10，從預設的 70 往上是 80、往下是 60', () => {
    expect(VOLUME_STEP).toBe(10);
    expect(volumeStepped(DEFAULT_AUDIO, 1)).toEqual({ volume: 80, muted: false });
    expect(volumeStepped(DEFAULT_AUDIO, -1)).toEqual({ volume: 60, muted: false });
  });

  test('夾在 0–100：一直按也不會超出去', () => {
    let audio: AudioSettings = DEFAULT_AUDIO;
    for (let press = 0; press < 20; press += 1) {
      audio = volumeStepped(audio, 1);
      expect(audio.volume).toBeLessThanOrEqual(MAX_VOLUME);
    }
    expect(audio.volume).toBe(MAX_VOLUME);
    for (let press = 0; press < 20; press += 1) {
      audio = volumeStepped(audio, -1);
      expect(audio.volume).toBeGreaterThanOrEqual(0);
    }
    expect(audio.volume).toBe(0);
  });

  test('不是 10 的倍數（手改的存檔）也只是加減 10，到頭就停在 0 或 100', () => {
    expect(volumeStepped({ volume: 75, muted: false }, 1).volume).toBe(85);
    expect(volumeStepped({ volume: 95, muted: false }, 1).volume).toBe(100);
    expect(volumeStepped({ volume: 5, muted: false }, -1).volume).toBe(0);
  });

  test('靜音中調高音量會取消靜音；調低音量維持靜音', () => {
    expect(volumeStepped({ volume: 40, muted: true }, 1)).toEqual({ volume: 50, muted: false });
    expect(volumeStepped({ volume: 40, muted: true }, -1)).toEqual({ volume: 30, muted: true });
  });

  test('不改到傳進來的設定', () => {
    const before = { volume: 70, muted: true };
    volumeStepped(before, 1);
    expect(before).toEqual({ volume: 70, muted: true });
  });
});

describe('靜音鈕與讀數', () => {
  test('靜音鈕寫的是按下去會做的事：沒靜音時是「靜音」，靜音中是「取消靜音」', () => {
    expect(muteLabelKey({ volume: 70, muted: false })).toBe('audio.mute');
    expect(muteLabelKey({ volume: 70, muted: true })).toBe('audio.unmute');
    expect(zhTW['audio.mute']).toBe('靜音');
    expect(zhTW['audio.unmute']).toBe('取消靜音');
    expect(en['audio.mute']).toBe('Mute');
    expect(en['audio.unmute']).toBe('Unmute');
  });

  test('讀數是百分比', () => {
    expect(formatVolume(DEFAULT_AUDIO)).toBe('70%');
    expect(formatVolume({ volume: 0, muted: false })).toBe('0%');
    expect(formatVolume({ volume: 100, muted: true })).toBe('100%');
  });
});

describe('音效的翻譯鍵', () => {
  const KEYS = [
    'audio.title',
    'audio.volume',
    'audio.volumeDown',
    'audio.volumeUp',
    'audio.mute',
    'audio.unmute',
    'audio.silentHint',
  ] as const;

  test('七個鍵兩種語言都有、都不是空的，而且兩種語言的字不一樣', () => {
    for (const key of KEYS) {
      expect(zhTW[key], key).toMatch(/\S/);
      expect(en[key], key).toMatch(/\S/);
      expect(zhTW[key], key).not.toBe(en[key]);
    }
    expect(Object.keys(en).filter((key) => key.startsWith('audio.'))).toEqual([...KEYS]);
    expect(Object.keys(zhTW).filter((key) => key.startsWith('audio.'))).toEqual([...KEYS]);
  });
});
