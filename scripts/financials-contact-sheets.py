from pathlib import Path
from PIL import Image
root=Path('work/financials-verification')
years=list(range(2025,2003,-1))
for start in range(0,len(years),3):
    chunk=years[start:start+3]
    sheet=Image.new('RGB',(1800,620*len(chunk)),'#dddddd')
    for i,year in enumerate(chunk):
        with Image.open(root/f'tax-{year}.png') as source:
            sheet.paste(source.crop((0,0,1800,610)),(0,i*620))
    sheet.save(root/f'tax-contact-{start//3+1}.png')
