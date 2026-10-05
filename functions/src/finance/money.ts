import type {FinancialFact} from '../../../packages/contracts/src/finance.js';
export const currencyDigits={USD:2,EUR:2,GBP:2,VND:0,JPY:0} as const;
export function summarizeFacts(facts:FinancialFact[],currency:FinancialFact['currency']){
 const totals:Record<string,bigint>={gross:0n,tax:0n,refund:0n,chargeback:0n,fee:0n,net:0n,cost:0n,settlement:0n};
 const transactions=new Map<string,FinancialFact[]>();
 for(const fact of facts){if(fact.currency!==currency)throw Error('Mixed currency');totals[fact.kind]!+=BigInt(fact.minorUnits);const key=`${fact.appId}:${fact.transactionId}`;transactions.set(key,[...(transactions.get(key)??[]),fact]);}
 let net=0n;
 for(const rows of transactions.values()){
  const explicit=rows.filter(r=>r.kind==='net');
  if(explicit.length)net+=explicit.reduce((sum,r)=>sum+BigInt(r.minorUnits),0n);
  else net+=rows.reduce((sum,r)=>sum+(['gross'].includes(r.kind)?BigInt(r.minorUnits):['tax','refund','chargeback','fee'].includes(r.kind)?-BigInt(r.minorUnits):0n),0n);
 }
 return {...Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value.toString()])),netCollections:net.toString()};
}
export function csvCell(value:string){const safe=/^[=+\-@\t\r]/.test(value)?`'${value}`:value;return `"${safe.replaceAll('"','""')}"`;}
export function exportFacts(facts:FinancialFact[]){return ['transaction_id,app_id,currency,kind,minor_units,occurred_at',...facts.map(row=>[row.transactionId,row.appId,row.currency,row.kind,row.minorUnits,row.occurredAt].map(csvCell).join(','))].join('\r\n');}
