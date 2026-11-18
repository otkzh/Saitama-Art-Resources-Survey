import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const script=`import pathlib,shutil,zipfile,sys\nroot=pathlib.Path(sys.argv[1])\nqa=root/'dist/qa/map'\nif qa.exists():shutil.rmtree(qa)\nqa.mkdir(parents=True)\nwith zipfile.ZipFile(root/'dist/delivery/saitama-art-map-review.zip') as z:z.extractall(qa)\n`;
if(spawnSync('python3',['-c',script,root],{stdio:'inherit'}).status!==0)throw Error('ZIP検証用フォルダを作成できません');
