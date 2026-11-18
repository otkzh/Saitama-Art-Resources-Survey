import { readFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { mayPublish } from './publication';

const root=resolve(import.meta.dirname,'..');
const mode=process.argv.includes('--release')?'release':'review';
const folder=resolve(root,'dist/production');
const dataset=JSON.parse(await readFile(resolve(folder,'data/spots.json'),'utf8'));
if(dataset.mode!==mode)throw Error('生成モードとZIPモードが一致しません');
const records=z.array(z.object({id:z.string(),status:z.enum(['approved','pending-contact','remaining-in-review','denied']),evidence:z.string()}))
  .parse(JSON.parse(await readFile(resolve(root,'data/publication-status.json'),'utf8')).spots);
const allowedIds=new Set(records.filter(row=>mayPublish(row,mode)).map(row=>row.id));
for(const spot of dataset.spots)if(!allowedIds.has(spot.id))throw Error(`掲載対象外のデータ: ${spot.id}`);
const usedImages=new Set(dataset.spots.flatMap((s:{images:{src:string}[]})=>s.images.map(im=>im.src)));
async function check(dir:string):Promise<void> {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    if(entry.isSymbolicLink())throw Error('配布フォルダにシンボリックリンクがあります');
    const p=resolve(dir,entry.name),rel=relative(folder,p).replaceAll('\\','/');
    if(entry.isDirectory()) { await check(p); continue; }
    if(!/^(index\.html|config\.json|favicon\.svg|robots\.txt|INSTALL\.txt|THIRD_PARTY_NOTICES\.txt|assets\/[^/]+|data\/spots\.json|images\/ACS\d+\/[^/]+\.webp)$/.test(rel))throw Error(`配布対象外ファイル: ${rel}`);
    if(rel.startsWith('images/')&&!usedImages.has(rel))throw Error(`未使用画像が含まれています: ${rel}`);
    if(rel.endsWith('.map'))throw Error('ソースマップは同梱できません');
  }
}
await check(folder);
await mkdir(resolve(root,'dist/delivery'),{recursive:true});
const publicZip=resolve(root,`dist/delivery/saitama-art-map-${mode}.zip`);
const script=`import sys,zipfile,pathlib\nfolder=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n for p in sorted(folder.rglob('*')):\n  if p.is_file():z.write(p,p.relative_to(folder).as_posix())\nwith zipfile.ZipFile(sys.argv[2]) as z:\n assert z.testzip() is None\n`;
const result=spawnSync('python3',['-c',script,folder,publicZip],{stdio:'inherit'});
if(result.status!==0)throw Error('公開ZIPの生成に失敗しました');
const sourceZip=resolve(root,'dist/delivery/saitama-art-map-source.zip');
const sourceScript=`import sys,zipfile,pathlib\nroot=pathlib.Path(sys.argv[1])\npaths=['.gitignore','.github','index.html','260902.html','261118-review.html','package.json','package-lock.json','.node-version','README.md','tsconfig.json','tsconfig.tools.json','vite.config.ts','vitest.config.ts','playwright.config.ts','web','scripts','tests','docs','data','assets','vendor']\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n for name in paths:\n  base=root/name\n  files=base.rglob('*') if base.is_dir() else [base]\n  for p in sorted(files):\n   rel=p.relative_to(root)\n   if not p.is_file() or 'public' in rel.parts or '__pycache__' in rel.parts:continue\n   z.write(p,rel.as_posix())\n`;
const sourceResult=spawnSync('python3',['-c',sourceScript,root,sourceZip],{stdio:'inherit'});
if(sourceResult.status!==0)throw Error('保守用ZIPの生成に失敗しました');
console.log(`Verified public ZIP: ${publicZip}\nPrivate source ZIP: ${sourceZip}`);
