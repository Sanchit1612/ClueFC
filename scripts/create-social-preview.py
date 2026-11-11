from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent.parent
im=Image.new('RGB',(1200,630),'#14251a');d=ImageDraw.Draw(im)
regular='/System/Library/Fonts/Supplemental/Arial.ttf';bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def font(n,strong=False):return ImageFont.truetype(bold if strong else regular,n)
for x in range(0,1200,150):d.rectangle((x,0,x+75,630),fill='#182b1e')
d.rounded_rectangle((30,30,1170,600),radius=14,outline='#5b754244',width=2)
d.ellipse((440,140,820,520),outline='#29422d',width=2);d.line((630,32,630,600),fill='#29422d',width=2)
d.text((66,55),'CLUE FC',font=font(36,True),fill='#f0ead6');d.text((900,65),'OPEN BETA',font=font(15,True),fill='#abc98a')
d.text((66,152),'One clue.',font=font(72,True),fill='#f1ecd9');d.text((66,231),'Your whole team.',font=font(63,True),fill='#d8c485')
d.text((70,330),'The football word game.',font=font(27),fill='#b8c8a8')
d.text((70,379),'Solo bots or a room with your mates.',font=font(21),fill='#b8c8a8')
d.rounded_rectangle((68,458,427,523),radius=6,fill='#98bc59',outline='#c4d89c',width=2);d.text((94,478),'PLAY FREE  →',font=font(23,True),fill='#152314')
d.text((70,552),'cluefc.pages.dev',font=font(22,True),fill='#eee8d4')
d.rounded_rectangle((734,144,1122,206),radius=6,fill='#243d2a',outline='#7b9259',width=2)
d.text((772,163),'THE CLUE: GOAT · 2',font=font(21,True),fill='#e3d4a5')
for label,x,y in [('MESSI',733,236),('RONALDO',939,236),('REFEREE',733,377),('GLOVES',939,377)]:
 d.rounded_rectangle((x+2,y+5,x+183,y+120),radius=7,fill='#06140d');d.rounded_rectangle((x,y,x+181,y+115),radius=7,fill='#eee6cf',outline='#b8a67c',width=3);d.rounded_rectangle((x+7,y+7,x+174,y+108),radius=3,outline='#c9ba95',width=1)
 d.rectangle((x+19,y+22,x+162,y+89),outline='#ded4b8',width=1);d.line((x+90,y+22,x+90,y+89),fill='#ded4b8');d.ellipse((x+74,y+40,x+107,y+72),outline='#ded4b8')
 box=d.textbbox((0,0),label,font=font(21,True));d.text((x+(181-(box[2]-box[0]))/2,y+47),label,font=font(21,True),fill='#283227')
 d.text((x+79,y+94),'FC',font=font(8,True),fill='#998d69')
d.text((756,542),'Example clue. Pick two words.',font=font(17),fill='#b8c8a8')
im.save(root/'assets/social-preview.png',optimize=True)
print('Created assets/social-preview.png (1200×630).')
