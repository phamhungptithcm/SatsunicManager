import {describe,it,expect} from 'vitest';
import {financialFactSchema} from '../../packages/contracts/src/finance';
import {summarizeFacts,csvCell,exportFacts} from '../../functions/src/finance/money';
import type {FinancialFact} from '../../packages/contracts/src/finance';
const base={transactionId:'order1',appId:'hunpeolabs',currency:'USD',occurredAt:'2026-10-01T00:00:00.000Z'} as const;
describe('Official-source exact cash arithmetic',()=>{
 it('uses integer precision beyond Number safe range and refuses mixed currencies',()=>{expect(summarizeFacts([{...base,kind:'gross',minorUnits:'9007199254740999'}],'USD').netCollections).toBe('9007199254740999');expect(()=>summarizeFacts([{...base,currency:'VND',kind:'gross',minorUnits:'1'}],'USD')).toThrow();});
 it('deducts partial refunds and fees once, respects supplied final net',()=>{const rows:FinancialFact[]=[{...base,kind:'gross',minorUnits:'10000'},{...base,kind:'fee',minorUnits:'300'},{...base,kind:'refund',minorUnits:'2000'}];expect(summarizeFacts(rows,'USD').netCollections).toBe('7700');expect(summarizeFacts([...rows,{...base,kind:'net',minorUnits:'7700'}],'USD').netCollections).toBe('7700');});
 it('exports exact amounts and rejects invalid financial identifiers/decimal minor units',()=>{const fact={...base,kind:'gross',minorUnits:'100'};expect(exportFacts([financialFactSchema.parse(fact)])).toContain('"100"');for(const invalid of [{...fact,minorUnits:'1.2'},{...fact,transactionId:'person@email.test'},{...fact,transactionId:'=IMPORTXML'}])expect(()=>financialFactSchema.parse(invalid)).toThrow();expect(csvCell('=formula')).toBe('"\'=formula"');});
});
