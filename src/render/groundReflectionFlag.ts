// 標了這個 userData 的物件不畫進地面的倒影（render/groundReflection.ts）：貼在地面上的東西（標線、光斑、輪胎痕）
// 鏡像之後還是在原地，從地面底下往上看只是多畫一遍；雨絲、灰塵這類很細的粒子縮小畫進倒影只會變成雜訊；
// 目標車位的發光標記是玩法標記，不該在水裡多出一份。倒影那一遍會先把它們藏起來。
// 獨立成一個檔案，場景裡的物件不必為了這個常數 import 倒影的算圖程式。
export const SKIP_GROUND_REFLECTION = 'skipGroundReflection';
