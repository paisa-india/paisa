import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsAllowed, analyticsPayload, type AnalyticsConfig, type AnalyticsEvent} from '../apps/web/lib/analytics';
const config: AnalyticsConfig = {scriptUrl:'https://stats.example.org/script.js',websiteId:'12345678-1234-1234-1234-123456789abc',hostname:'paisa-india.github.io',basePath:'/paisa'};
test('analytics is opt-in and excludes development, other hosts and privacy opt-outs',()=>{
 assert.equal(analyticsAllowed(config,config.hostname,true),true);
 for(const hostname of ['localhost','127.0.0.1','preview.example.org']) assert.equal(analyticsAllowed(config,hostname,true),false);
 assert.equal(analyticsAllowed(config,config.hostname,false),false);
 assert.equal(analyticsAllowed(config,config.hostname,true,'1'),false);
 assert.equal(analyticsAllowed(config,config.hostname,true,null,true),false);
 for(const patch of [{websiteId:''},{hostname:''},{scriptUrl:''},{scriptUrl:'http://stats.example.org/script.js'},{scriptUrl:'https://stats.example.org/script.js?token=secret'}]) assert.equal(analyticsAllowed({...config,...patch},config.hostname,true),false);
});
test('analytics payloads cannot contain free text, query values or private record paths',()=>{
 const payload=analyticsPayload(config,'/paisa/my-tax/?amount=99999&name=Private#complaint','tax_used');
 assert.deepEqual(payload,{website:config.websiteId,hostname:config.hostname,url:'/paisa/my-tax',title:'PAISA',name:'tax_used'});
 assert.equal(analyticsPayload(config,'/paisa/contractors/private-person'),null);
 assert.equal(analyticsPayload(config,'/paisa/ask','private complaint' as AnalyticsEvent),null);
 assert.equal(analyticsPayload(config,'/paisabad/my-tax'),null);
 assert.equal(analyticsPayload(config,'/paisa/')?.url,'/paisa/');
 assert.equal(analyticsPayload({...config,basePath:''},'/my-tax/')?.url,'/my-tax');
});
