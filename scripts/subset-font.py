# 함초롬바탕 줄이기: python3 scripts/subset-font.py <원본 TTF 폴더> public/fonts src  (pip install fonttools brotli)
import sys, os, re, glob
from fontTools import subset
from fontTools.ttLib import TTFont
src_dir, out_dir, code_dir = sys.argv[1:4]
# 사이트 코드에 나오는 한자 + 기본 글자
han = set()
for f in glob.glob(os.path.join(code_dir, '**/*.ts*'), recursive=True):
    for ch in open(f, encoding='utf-8').read():
        if 0x3400 <= ord(ch) <= 0x9FFF or 0xF900 <= ord(ch) <= 0xFAFF: han.add(ord(ch))
uni = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2000, 0x2070)) | set(range(0x2190, 0x21FF)) \
    | set(range(0x2460, 0x24FF)) | set(range(0x25A0, 0x2600)) | set(range(0x3000, 0x3040)) | set(range(0x3130, 0x3190)) \
    | set(range(0xAC00, 0xD7A4)) | set(range(0xFF01, 0xFF5F)) | han
print('hanja', len(han), 'total', len(uni))
for name, out in [('HCRBatang.ttf', 'HCRBatang.woff2'), ('HCRBatang-bold.ttf', 'HCRBatang-Bold.woff2')]:
    f = TTFont(os.path.join(src_dir, name))
    cmap = f.getBestCmap()
    keep = [u for u in uni if u in cmap]
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.hinting = False; opts.desubroutinize = True
    s = subset.Subsetter(opts); s.populate(unicodes=keep); s.subset(f)
    f.flavor = 'woff2'; f.save(os.path.join(out_dir, out))
    print(out, len(keep), os.path.getsize(os.path.join(out_dir, out)))
