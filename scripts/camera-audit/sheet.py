#!/usr/bin/env python3
"""把 shoot.mjs 拍的開場截圖拼成一張聯絡圖：列 = 關卡、欄 = 鏡頭，每格標關卡 id 與鏡頭名稱。

用法：python3 scripts/camera-audit/sheet.py <截圖目錄> <輸出 png> [標題]
需要 Pillow；中文字型找不到就退回 Pillow 內建字型（中文會變成方塊，英文照常）。
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

LEVELS = ['prototype'] + [f'w1_l{number:02d}' for number in range(1, 11)]
VIEWS = [
    ('chase_near', 'Chase Cam (Near) 近距離跟車'),
    ('chase_far', 'Chase Cam (Far) 遠距離跟車'),
    ('hood', 'Hood Cam 引擎蓋'),
    ('cockpit', 'Cockpit 駕駛座'),
    ('top', 'Top-Down 俯視'),
]
FONT_PATHS = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/System/Library/Fonts/PingFang.ttc',
]
# 每一格的寬（像素）；高依第一張截圖的長寬比決定（直式手機的截圖也能拼）。
CELL_WIDTH = 480
PAD, HEAD, CAPTION = 6, 64, 22


def load_font(size):
    for path in FONT_PATHS:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    source, output = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else 'ParkingGameWeb opening camera audit'
    first = next(
        (
            os.path.join(source, f'{level}-{view}.png')
            for level in LEVELS
            for view, _ in VIEWS
            if os.path.exists(os.path.join(source, f'{level}-{view}.png'))
        ),
        None,
    )
    if first is None:
        sys.exit(f'{source} 裡沒有 <關卡>-<鏡頭>.png')
    with Image.open(first) as sample:
        cell_height = round(CELL_WIDTH * sample.height / sample.width)

    big, middle, small = load_font(26), load_font(18), load_font(15)
    sheet = Image.new(
        'RGB',
        (len(VIEWS) * (CELL_WIDTH + PAD) + PAD, HEAD + len(LEVELS) * (cell_height + CAPTION + PAD) + PAD),
        (18, 20, 24),
    )
    draw = ImageDraw.Draw(sheet)
    draw.text((PAD, 4), title, font=big, fill=(240, 240, 240))
    for column, (_, label) in enumerate(VIEWS):
        draw.text((PAD + column * (CELL_WIDTH + PAD), 38), label, font=middle, fill=(255, 210, 120))
    for row, level in enumerate(LEVELS):
        for column, (view, _) in enumerate(VIEWS):
            x = PAD + column * (CELL_WIDTH + PAD)
            y = HEAD + row * (cell_height + CAPTION + PAD)
            draw.rectangle([x, y, x + CELL_WIDTH - 1, y + CAPTION - 1], fill=(40, 44, 52))
            draw.text((x + 6, y + 1), f'{level} · {view}', font=small, fill=(235, 235, 235))
            path = os.path.join(source, f'{level}-{view}.png')
            if os.path.exists(path):
                with Image.open(path) as shot:
                    sheet.paste(
                        shot.convert('RGB').resize((CELL_WIDTH, cell_height), Image.LANCZOS),
                        (x, y + CAPTION),
                    )
            else:
                draw.text((x + 10, y + CAPTION + 10), 'missing', font=middle, fill=(255, 80, 80))
    sheet.save(output)
    print(output, sheet.size)


if __name__ == '__main__':
    main()
