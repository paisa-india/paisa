import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {api} from './service';
export async function buildServer(){const app=Fastify({logger:process.env.NODE_ENV!=='test',bodyLimit:16384,trustProxy:false});await app.register(rateLimit,{max:90,timeWindow:'1 minute'});app.get('/api/v1/*',async(request,reply)=>{try{const url=new URL(request.url,'http://localhost');const result=await api(url.pathname.replace('/api/v1/',''),url.searchParams);if(result===null)return reply.code(404).send({error:'Not found'});return result;}catch{return reply.code(503).send({error:'Published dataset temporarily unavailable'});}});return app;}
if(process.env.NODE_ENV!=='test'){const app=await buildServer();await app.listen({port:Number(process.env.PORT??4000),host:process.env.HOST??'127.0.0.1'});}
