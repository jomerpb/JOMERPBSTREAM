import colorsys
# 36 colours: 6 games x 6 positions, every one distinct, so nothing can repeat
# in a line, in a game, or on a day (a day shows at most 4 games = 24 of them).
#
# Within a row the six hues are a full 60 degrees apart - red, yellow, green,
# cyan, blue, magenta - so neighbours are strongly different colours, not
# shades of one. Each game rotates that wheel by 10 degrees, which is what
# keeps all 36 distinct (0,10,20,30,40,50 are distinct mod 60), and carries its
# own brightness/saturation character on top so two rows never read as a copy
# of each other.
GAMES = [('642', 62, 78),   # key, lightness, saturation
         ('645', 71, 74),
         ('649', 46, 82),
         ('655', 66, 70),
         ('658', 54, 86),
         ('ez2', 58, 64)]
def rgbof(h,s,l):
    r,g,b = colorsys.hls_to_rgb((h%360)/360.0, max(0,min(1,l/100.0)), max(0,min(1,s/100.0)))
    return (round(r*255),round(g*255),round(b*255))
def hexof(h,s,l): return '#%02x%02x%02x' % rgbof(h,s,l)
def lum(rgb):
    def c(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    r,g,b=[c(x) for x in rgb]; return .2126*r+.7152*g+.0722*b
def contrast(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+.05)/(lo+.05)

out, seen, rows = [], {}, []
for g,(key,L,S) in enumerate(GAMES):
    row=[]
    for i in range(6):
        h = (i*60 + g*10) % 360
        base = rgbof(h,S,L)
        idx  = g*6+i
        light= hexof(h,min(S+10,95),min(L+20,92))
        dark = hexof(h,min(S+8,95),max(L-26,8))
        br   = rgbof(h,S,min(L+10,82))
        dk,wh=(18,14,8),(255,255,255)
        text = '#12100a' if contrast(base,dk) >= contrast(base,wh) else '#fff'
        seen.setdefault(hexof(h,S,L),[]).append((key,i+1))
        row.append(hexof(h,S,L))
        out.append('#oracle-page .osph-%d{background:radial-gradient(circle at 35%% 30%%,%s,%s 55%%,%s);color:%s;border:2px solid rgba(%d,%d,%d,.5)}'
                   % (idx,light,hexof(h,S,L),dark,text,br[0],br[1],br[2]))
    rows.append((key,row))
open('palette.css','w').write('\n'.join(out)+'\n')
for key,row in rows: print(key, ' '.join(row))
dupes={k:v for k,v in seen.items() if len(v)>1}
print('\n36 colours generated. duplicates:', dupes if dupes else 'NONE')
mins=[]
for g,(key,L,S) in enumerate(GAMES):
    for i in range(6):
        h=(i*60+g*10)%360
        mins.append(max(contrast(rgbof(h,S,L),(18,14,8)),contrast(rgbof(h,S,L),(255,255,255))))
print('min text contrast:', round(min(mins),2))
