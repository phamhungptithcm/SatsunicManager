import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {ownerPreferencesSchema,type OwnerPreferences} from '../../../../packages/contracts/src/preferences';
import type {Client} from '../lib/firebase';
import type {Locale} from '../lib/i18n';
import {Button} from '../components/button';

const words={vi:{language:'Ngôn ngữ',theme:'Giao diện',light:'Sáng',dark:'Tối',timezone:'Múi giờ mặc định',save:'Lưu thiết lập',saving:'Đang lưu…',saved:'Đã lưu thiết lập.',failed:'Chưa lưu được. Tải lại thiết lập rồi thử lại.',refresh:'Tải lại thiết lập',blocked:'Chưa bật lưu thiết lập cho tài khoản.'},en:{language:'Language',theme:'Appearance',light:'Light',dark:'Dark',timezone:'Default timezone',save:'Save preferences',saving:'Saving…',saved:'Preferences saved.',failed:'Could not save. Reload preferences and try again.',refresh:'Reload preferences',blocked:'Account preferences are not enabled yet.'}};
export function SettingsPage({client,locale,preferences,onSaved,onRefresh,onNotice}:{client:Client;locale:Locale;preferences:OwnerPreferences|undefined;onSaved:(value:OwnerPreferences)=>void;onRefresh:()=>void;onNotice:(text:string,kind:'info'|'error',pending?:boolean)=>void}){
 const t=words[locale];
 if(!client.config.emulator&&!client.config.preferencesEnabled)return <p className="empty-state">{t.blocked}</p>;
 if(!preferences)return <div className="empty-state"><Button onClick={onRefresh}>{t.refresh}</Button></div>;
 return <PreferencesForm key={preferences.revision} {...{client,locale,preferences,onSaved,onRefresh,onNotice}}/>;
}
function PreferencesForm({client,locale,preferences,onSaved,onRefresh,onNotice}:{client:Client;locale:Locale;preferences:OwnerPreferences;onSaved:(value:OwnerPreferences)=>void;onRefresh:()=>void;onNotice:(text:string,kind:'info'|'error',pending?:boolean)=>void}){
 const t=words[locale];const [draft,setDraft]=useState(preferences);
 // Keep the same key/payload for a retry after an uncertain network outcome.
 const [retry,setRetry]=useState<{value:OwnerPreferences;key:string}|null>(null);
 const mutation=useMutation({mutationFn:async()=>{
  const request=retry??{value:draft,key:crypto.randomUUID()};setRetry(request);
  return ownerPreferencesSchema.parse(await client.call('saveOwnerPreferences',{...request.value,idempotencyKey:request.key}));
 },onMutate:()=>onNotice(t.saving,'info',true),onSuccess:value=>{setRetry(null);onSaved(value);onNotice(words[value.locale].saved,'info');},onError:()=>onNotice(t.failed,'error')});
 const change=(value:OwnerPreferences)=>{setDraft(value);setRetry(null);};
 return <form className="registry incident-form" onSubmit={event=>{event.preventDefault();mutation.mutate();}}>
  <label>{t.language}<select disabled={mutation.isPending} value={draft.locale} onChange={event=>change({...draft,locale:event.target.value as Locale})}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
  <label>{t.theme}<select disabled={mutation.isPending} value={draft.theme} onChange={event=>change({...draft,theme:event.target.value as 'light'|'dark'})}><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label>
  <label>{t.timezone}<select disabled={mutation.isPending} value={draft.timezone} onChange={event=>change({...draft,timezone:event.target.value as OwnerPreferences['timezone']})}><option>America/Chicago</option><option>Asia/Ho_Chi_Minh</option></select></label>
  <div><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?t.saving:t.save}</Button>{mutation.isError&&<Button type="button" disabled={mutation.isPending} onClick={onRefresh}>{t.refresh}</Button>}</div>
 </form>;
}
