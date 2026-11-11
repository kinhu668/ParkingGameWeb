// 標了這個 userData 的物件（天空穹頂、半透明光束之類）不參與環境光遮蔽：它們沒有實體表面，
// 畫進環境光遮蔽的法線／深度緩衝區會在後面的東西上留下假的遮蔽。後製鏈算遮蔽時會先把它們藏起來。
// 獨立成一個檔案，場景裡的物件不必為了這個常數 import 整條後製鏈。
export const SKIP_AMBIENT_OCCLUSION = 'skipAmbientOcclusion';
