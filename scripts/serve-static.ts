/** Serves the static site in apps/web/out the way GitHub Pages does (used by the browser tests). `PORT` defaults to 3300. */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('apps/web/out');const port=Number(process.env.PORT??3300);
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain'};
const exists=async(p:string)=>{try{return (await stat(p)).isFile();}catch{return false;}};
createServer(async(req,res)=>{
 const url=new URL(req.url??'/','http://localhost');let file=path.join(root,decodeURIComponent(url.pathname));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 if(!await exists(file))file=await exists(path.join(file,'index.html'))?path.join(file,'index.html'):`${file.replace(/\/$/,'')}.html`;
 if(!await exists(file)){res.writeHead(404,{'content-type':'text/plain'}).end('Not found');return;}
 res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
}).listen(port,'127.0.0.1',()=>console.log(`Static site on http://127.0.0.1:${port}`));
