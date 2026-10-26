import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const folder=path.dirname(fileURLToPath(import.meta.url));
const native=path.resolve(folder,'..');
const root=path.resolve(native,'..');
const www=path.join(native,'www');
fs.rmSync(www,{recursive:true,force:true});fs.mkdirSync(www,{recursive:true});
for(const name of ['index.html','app.js','ai.js','collab.js','config.js','presets.js','style.css','manifest.webmanifest','sw.js']){
 fs.copyFileSync(path.join(root,name),path.join(www,name));
}
fs.cpSync(path.join(root,'assets'),path.join(www,'assets'),{recursive:true});
console.log('Native web assets ready:',www);
