import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {financeSnapshotSchema,currencySchema} from '../../../../packages/contracts/src/finance';
import type {Scope,Owner} from '../../../../packages/contracts/src/index';
import type {Client} from '../lib/firebase';
import type {Locale} from '../lib/i18n';
import {Button} from '../components/button';
function money(value:string|undefined,digits:number,currency:string,locale:Locale){if(value===undefined)return '—';const n=BigInt(value),absolute=n<0n?-n:n,power=10n**BigInt(digits);return `${n<0n?'−':''}${new Intl.NumberFormat(locale).format(absolute/power)}${digits?`${locale==='vi'?',':'.'}${String(absolute%power).padStart(digits,'0')}`:''} ${currency}`;}
function download(csv:string,id:string){const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`manager-${id.slice(0,12)}.csv`;anchor.click();URL.revokeObjectURL(url);}
export function FinancePage({client,owner,scope,locale}:{client:Client;owner:Owner;scope:Scope;locale:Locale;report?:boolean}){
 const vi=locale==='vi';const [currency,setCurrency]=useState('USD');const enabled=client.config.emulator||client.config.financeEnabled;
 const query=useQuery({enabled,queryKey:['finance',owner.uid,scope,currency],queryFn:async()=>financeSnapshotSchema.parse(await client.call('getFinanceSnapshot',{scope,currency})),retry:false});const snap=query.data;
 if(!enabled||snap?.status==='not_configured')return <section className="empty-state"><h2>{vi?'Chưa kết nối nguồn tài chính':'Financial sources are not connected'}</h2><p>{vi?'Dữ liệu sẽ tự cập nhật từ nguồn đã xác minh.':'Data will sync automatically from verified sources.'}</p></section>;
 return <section className="registry operation-section"><div className="section-heading"><label>{vi?'Tiền tệ':'Currency'}<select aria-label={vi?'Tiền tệ':'Currency'} value={currency} onChange={event=>setCurrency(event.target.value)}>{currencySchema.options.map(value=><option key={value}>{value}</option>)}</select></label><Button disabled={!snap||snap.status!=='available'} onClick={()=>snap&&download(snap.csv,snap.id)}>{vi?'Tải CSV':'Download CSV'}</Button></div>
 {query.isPending&&<p role="status">{vi?'Đang tải…':'Loading…'}</p>}{query.isError&&<p role="alert">{vi?'Chưa tải được dữ liệu.':'Data could not be loaded.'}<Button onClick={()=>void query.refetch()}>{vi?'Thử lại':'Retry'}</Button></p>}{snap?.status==='empty'&&<p>{vi?'Chưa ghi nhận dữ liệu trong khoảng này.':'No observations in this period.'}</p>}{snap?.status==='partial'&&<p role="status">{vi?'Nguồn chưa đủ dữ liệu để chốt báo cáo.':'Source coverage is incomplete; the report is not final.'}</p>}
 <div className="metrics"><section><span>{vi?'Tiền thu thuần':'Net collections'}</span><strong>{money(snap?.totals.netCollections,snap?.minorUnitDigits??2,currency,locale)}</strong></section><section><span>{vi?'Chi phí':'Cost'}</span><strong>{money(snap?.totals.cost,snap?.minorUnitDigits??2,currency,locale)}</strong></section></div>
 {snap&&<details><summary>{vi?'Nguồn báo cáo':'Report source'}</summary><p>{snap.id} · {snap.queryVersion}</p><p>{new Intl.DateTimeFormat(locale,{timeZone:scope.timezone,dateStyle:'short',timeStyle:'short'}).format(new Date(snap.fetchedAt))}</p><p>{vi?'Chỉ gồm nguồn chính thức đã xác minh.':'Verified official sources only.'}</p></details>}
 {snap&&snap.data.length>0&&<div className="table-scroll"><table><thead><tr><th>ID</th><th>{vi?'Ứng dụng':'Application'}</th><th>{vi?'Loại':'Kind'}</th><th>{vi?'Số tiền':'Amount'}</th></tr></thead><tbody>{snap.data.map(row=><tr key={`${row.appId}:${row.transactionId}:${row.kind}`}><td>{row.transactionId}</td><td>{row.appId}</td><td>{row.kind}</td><td>{money(row.minorUnits,snap.minorUnitDigits,row.currency,locale)}</td></tr>)}</tbody></table></div>}
 </section>;
}
