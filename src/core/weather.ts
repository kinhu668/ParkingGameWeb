// 天氣：六種天氣的 id、`?weather=` 的解析、以及「網址蓋過關卡 JSON」的規則。不 import three、不碰 DOM。
// 每種天氣長什麼樣子（天空、太陽、霧、地面、雨、閃電、路燈）在 render/weatherPresets.ts。
import { DEFAULT_LEVEL_WEATHER, LEVEL_WEATHERS, type LevelWeather } from '../level/levelSchema';

/** 天氣的 id：與關卡 JSON 的 `weather` 欄位是同一組值。 */
export type WeatherId = LevelWeather;

/** 全部的天氣（clear、dusk、rain、wet、storm、night）。 */
export const WEATHER_IDS: readonly WeatherId[] = LEVEL_WEATHERS;

const WEATHER_PARAM = 'weather';

function isWeatherId(value: string): value is WeatherId {
  return (WEATHER_IDS as readonly string[]).includes(value);
}

/** `?weather=<id>`（不分大小寫、去掉前後空白）；沒給或不認得回傳 undefined。 */
export function parseWeatherParam(urlSearch: string): WeatherId | undefined {
  const value = new URLSearchParams(urlSearch).get(WEATHER_PARAM)?.trim().toLowerCase();
  return value !== undefined && isWeatherId(value) ? value : undefined;
}

/**
 * 這一場要用的天氣：`?weather=` 蓋過關卡 JSON；網址沒給（或不認得）就用關卡的；關卡也沒填就是 clear。
 * @param levelWeather 關卡 JSON 的 `weather`
 */
export function resolveWeather(urlSearch: string, levelWeather?: WeatherId): WeatherId {
  return parseWeatherParam(urlSearch) ?? levelWeather ?? DEFAULT_LEVEL_WEATHER;
}
