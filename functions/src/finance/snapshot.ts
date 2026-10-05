import {financeQuerySchema,financialFactSchema,financeSnapshotSchema} from '../../../packages/contracts/src/finance.js';
import {db} from '../shared/admin.js';
import {digest} from '../shared/mutation.js';
import {currencyDigits,summarizeFacts,exportFacts} from './money.js';
export async function financeSnapshot(input:unknown){
 const {scope,currency}=financeQuerySchema.parse(input);
 const sourceDocs=await db.collection('connectorSources').where('enabled','==',true).where('verified','==',true).limit(51).get();
 const sources=sourceDocs.docs.filter(doc=>scope.appId==='all'||doc.get('appId')===scope.appId);
 if(!sources.length)return financeSnapshotSchema.parse({id:digest(JSON.stringify({scope,currency,status:'not_configured'})),scope,currency,minorUnitDigits:currencyDigits[currency],status:'not_configured',fetchedAt:new Date().toISOString(),observedThrough:null,queryVersion:'finance-v1',data:[],totals:{},count:0,coverage:'verified official sources only',csv:''});
 const ids=new Set(sources.map(doc=>doc.id));
 let q=db.collection('financialFacts').where('environment','==','production').where('currency','==',currency).where('occurredAt','>=',scope.from).where('occurredAt','<',scope.to);
 if(scope.appId!=='all')q=q.where('appId','==',scope.appId);
 const result=await q.orderBy('occurredAt','desc').limit(201).get();const partial=result.size>200||sourceDocs.size>50||sources.some(doc=>typeof doc.get('observedThrough')!=='string'||!Number.isFinite(Date.parse(doc.get('observedThrough')))||Date.parse(doc.get('observedThrough'))<Date.parse(scope.to));
 const facts=result.docs.slice(0,200).filter(doc=>ids.has(doc.get('sourceId'))).map(doc=>financialFactSchema.parse(Object.fromEntries(Object.keys(financialFactSchema.shape).map(key=>[key,doc.get(key)]))));
 const totals:Record<string,string>=partial||!facts.length?{}:summarizeFacts(facts,currency);
 if(!sources.every(doc=>doc.get('netSemanticsVerified')===true)||!facts.some(fact=>fact.kind==='gross'||fact.kind==='net'))delete totals.netCollections;
 if(!facts.some(fact=>fact.kind==='cost'))delete totals.cost;
 const fetchedAt=new Date().toISOString();const payload={scope,currency,facts,sources:sources.map(doc=>({id:doc.id,observedThrough:doc.get('observedThrough')??null,netSemanticsVerified:doc.get('netSemanticsVerified')===true})),queryVersion:'finance-v1'};
 return financeSnapshotSchema.parse({id:digest(JSON.stringify(payload)),scope,currency,minorUnitDigits:currencyDigits[currency],status:partial?'partial':facts.length?'available':'empty',fetchedAt,observedThrough:sources.map(doc=>doc.get('observedThrough')).filter((value):value is string=>typeof value==='string').sort()[0]??null,queryVersion:'finance-v1',data:facts,totals,count:facts.length,coverage:'verified official sources only',csv:partial?'':exportFacts(facts)});
}
