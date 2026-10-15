"""Outline Bender Regular VER and offset its contours inward (fonttools, pyclipper).
Run: python scripts/build_control_ver.py --inset 10
Original glyph positions are retained; the viewBox is trimmed to the visible outlines.
"""
from pathlib import Path
import argparse
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
import pyclipper

ROOT = Path(__file__).resolve().parents[1]
SCALE = 64

class Contours(BasePen):
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.paths, self.points = [], []
    def _moveTo(self, pt):
        self.points = [pt]
    def _lineTo(self, pt):
        self.points.append(pt)
    def _curveToOne(self, a, b, c):
        start = self._getCurrentPoint()
        for step in range(1, 81):
            t = step / 80
            self.points.append(tuple((1-t)**3*start[i]+3*(1-t)**2*t*a[i]+3*(1-t)*t*t*b[i]+t**3*c[i] for i in (0,1)))
    def _closePath(self):
        self.paths.append([(round(x*SCALE), round(y*SCALE)) for x,y in self.points])
    def _endPath(self):
        raise ValueError('Expected closed font contour')

def build(inset):
    font = TTFont(ROOT/'assets/fonts/Bender-Regular.otf')
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    x, paths, all_points = 0, [], []
    for char in 'VER':
        glyph = glyphs[cmap[ord(char)]]
        pen = Contours(glyphs); glyph.draw(pen)
        clip = pyclipper.Pyclipper(); clip.AddPaths(pen.paths, pyclipper.PT_SUBJECT, True)
        original = clip.Execute(pyclipper.CT_UNION, pyclipper.PFT_NONZERO, pyclipper.PFT_NONZERO)
        offset = pyclipper.PyclipperOffset(); offset.AddPaths(original, pyclipper.JT_MITER, pyclipper.ET_CLOSEDPOLYGON)
        reduced = offset.Execute(-inset*SCALE)
        assert reduced and 0 < sum(pyclipper.Area(p) for p in reduced) < sum(pyclipper.Area(p) for p in original)
        segments=[]
        for polygon in reduced:
            points=[(px/SCALE+x,710-py/SCALE) for px,py in polygon]
            all_points.extend(points)
            segments.append('M'+' L'.join(f'{px:.3f},{py:.3f}' for px,py in points)+' Z')
        paths.append('<path d="'+' '.join(segments)+'"/>')
        x += glyph.width + 40
    width = x-40
    left,bottom=min(p[0] for p in all_points),min(p[1] for p in all_points)
    right,top=max(p[0] for p in all_points),max(p[1] for p in all_points)
    bounds=f'{left:.3f} {bottom:.3f} {right-left:.3f} {top-bottom:.3f}'
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bounds}" fill="#f5f6f4"><title>VER</title><desc>Bender Regular outlined; contours inset {inset:g} font units.</desc>'+''.join(paths)+'</svg>\n'
    target=ROOT/'assets/icons/control-ver.svg';target.write_text(svg)
    print(f'{target.relative_to(ROOT)}: 3 outlined letters, original layout {width} x 725, inset {inset:g}')

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--inset',type=float,default=10)
    args=parser.parse_args()
    if not 0 < args.inset < 25: parser.error('inset must be between 0 and 25 font units')
    build(args.inset)
