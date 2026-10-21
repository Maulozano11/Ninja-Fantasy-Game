# headdraft.py out.txt: segments (y, x, string) -> patch (x0=16, y0=6, 28 wide)
import sys
X0,Y0,WD,HT=16,6,28,32
segs = [
 # peach spark top right (his core at 37.8,9.5): a 3 px diagonal streak
 (8,39,'p'),(9,38,'p'),(10,37,'l'),
 # horn: white tip, leaning back, navy on its back edge
 (12,36,'bs'),
 (13,30,'bb'),(13,36,'br'),
 (14,21,'jjkkmmnnoqqbb'),(14,36,'bqo'),
 (15,20,'ijjkkkmmmnnoqqbbbqo'),
 (16,19,'iijjkkkkmmmnnoqqqqbqobb'),
 (17,19,'jkkkkkddddddnnoqqqbqnoob'),
 (18,19,'ijkkkkmmmmmmdddqrrooonnqc'),
 (19,19,'iijkkkkmmmmmmmmbaabnnoqc'),
 (20,19,'iijbbbbbbnnnnnnmmmmmmoqc'),
 (21,19,'ijbhhhshhbbbbbbkkkkkknoc'),
 (22,19,'ijbhhhrhhhshhshbbbbbbbbc'),
 (23,19,'ijbhhhhhhhshhrhhhshbcccc'),
 (24,19,'iijbrssrhhrhhhhhhshdddd'),
 (25,19,'iijbssssrqqqoohhhhh'),
 (26,19,'iiijbssssrqqqooonnmm'),
 (27,19,'giiibmkrqoooonnnm'),
 (28,19,'ggiiibmkhkkmmmkkj'),
 (29,19,'gggiibmksjkkkkj'),
 (30,19,'ggggiibmkhjjjjj'),
 (31,19,'.ggggiibmksjjji'),
 (32,19,'..ggggiibmkhjii'),
 (33,19,'...gggiibmksii'),
 (34,19,'....ggggibmkhb'),
 (35,19,'......gggbbmb'),
 (36,19,'........ggbb'),
]
grid=[['.']*WD for _ in range(HT)]
for y,x,s in segs:
    for i,ch in enumerate(s):
        gx,gy=x+i-X0,y-Y0
        if 0<=gx<WD and 0<=gy<HT: grid[gy][gx]=ch
open(sys.argv[1],'w').write(f'{X0} {Y0}\n'+'\n'.join(''.join(r) for r in grid)+'\n')
