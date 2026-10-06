/** Rebuild the original vector identity and raster exports. No remote assets. */
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const dir='apps/web/public/brand';
const mark=(green='#285B4B',ink='#FAF9F2',dot='#ACCCAA')=>`<rect width="96" height="96" rx="27" fill="${green}"/><g fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M27 27h42M27 39h42M36 27c24 0 24 27 0 27h-7l25 22"/></g><circle cx="74" cy="74" r="6" fill="${dot}"/>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const icon=svg(96,96,mark());
await writeFile(`${dir}/symbol.svg`,icon);
for(const [name,ink,bg,dot] of [['logo','#25392F','#285B4B','#ACCCAA'],['logo-light','#FAF9F2','#416F5A','#ACCCAA']]){
 await writeFile(`${dir}/${name}.svg`,svg(365,100,`<title>PAISA — Public money. Public knowledge.</title><g transform="translate(2 2)">${mark(bg,'#FAF9F2',dot)}</g><text x="120" y="70" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="700" letter-spacing="-4">paisa<tspan fill="#7FA783">.</tspan></text>`));
}
await sharp(Buffer.from(icon)).resize(32,32).png().toFile(`${dir}/favicon-32.png`);
await sharp(Buffer.from(icon)).resize(180,180).png().toFile(`${dir}/apple-touch-icon.png`);
await sharp(Buffer.from(icon)).resize(192,192).png().toFile(`${dir}/icon-192.png`);
await sharp(Buffer.from(icon)).resize(512,512).png().toFile(`${dir}/icon-512.png`);
const palette=['#285B4B','#6A947B','#B2C8A1','#D5A35D','#A7B2C5'];
let pieces='';
for(let i=0;i<100;i++){const x=825+(i%10)*27,y=161+Math.floor(i/10)*27;pieces+=`<rect x="${x}" y="${y}" width="21" height="21" rx="5" fill="${palette[Math.floor(i/20)]}"/>`;}
const card=svg(1200,630,`<rect width="1200" height="630" fill="#F8F9F3"/><rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#DDE5D9"/><g transform="translate(66 65) scale(.67)">${mark()}</g><text x="150" y="114" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" letter-spacing="-3" fill="#25392F">paisa<tspan fill="#7FA783">.</tspan></text><g font-family="Arial, Helvetica, sans-serif"><text x="66" y="252" font-size="64" font-weight="700" letter-spacing="-2" fill="#25392F">Public money.</text><text x="66" y="326" font-size="64" font-weight="700" letter-spacing="-2" fill="#285B4B">Public knowledge.</text><text x="69" y="392" font-size="25" fill="#627264">Follow India’s public money.</text><text x="69" y="430" font-size="25" fill="#627264">Understand it. Verify it.</text>${pieces}<text x="69" y="553" font-size="17" letter-spacing="2" fill="#627264">INDEPENDENT · OPEN SOURCE · FOR EVERY CITIZEN</text></g>`);
await writeFile(`${dir}/social-card.svg`,card);
await sharp(Buffer.from(card)).png().toFile(`${dir}/social-card.png`);
console.log('Brand SVGs and PNG exports rebuilt.');
