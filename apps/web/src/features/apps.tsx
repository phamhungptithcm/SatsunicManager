import {useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {appDefinitionSchema,type Owner} from '../../../../packages/contracts/src/index';
import type {Client} from '../lib/firebase';
import type {Locale} from '../lib/i18n';
import {Button} from '../components/button';
export function AddApp({client,owner,locale,onNotice}:{client:Client;owner:Owner;locale:Locale;onNotice:(text:string,kind:'info'|'error')=>void}){
 const vi=locale==='vi',cache=useQueryClient();const [open,setOpen]=useState(false),[name,setName]=useState(''),[project,setProject]=useState('');
 const id=name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
 const mutation=useMutation({mutationFn:async()=>appDefinitionSchema.parse(await client.call('addApp',{id,name,sourceProjectId:project.trim()||null,revision:0,idempotencyKey:crypto.randomUUID()})),onSuccess:async()=>{setOpen(false);setName('');setProject('');await cache.invalidateQueries({queryKey:['registry',owner.uid]});onNotice(vi?'Đã thêm ứng dụng.':'Application added.','info');},onError:()=>onNotice(vi?'Chưa thêm được. Kiểm tra tên và dự án rồi thử lại.':'Could not add the application. Check the name and project, then retry.','error')});
 // New callable is not part of the original live pilot allowlist.
 if(!client.config.emulator&&!client.config.addAppEnabled)return null;
 return <section><Button onClick={()=>setOpen(value=>!value)}>{vi?'Thêm ứng dụng':'Add application'}</Button>{open&&<form className="incident-form" onSubmit={event=>{event.preventDefault();mutation.mutate();}}><label>{vi?'Tên ứng dụng':'Application name'}<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label><label>{vi?'Dự án Google Cloud (nếu có)':'Google Cloud project (optional)'}<input pattern="[a-z][a-z0-9-]{5,29}" value={project} onChange={event=>setProject(event.target.value)}/></label><p className="footnote">{vi?'Nguồn cần được xác minh trước khi đọc dữ liệu.':'The source must be verified before data can be read.'}</p><div><Button type="submit" disabled={mutation.isPending||id.length<3}>{vi?'Thêm':'Add'}</Button><Button type="button" disabled={mutation.isPending} onClick={()=>setOpen(false)}>{vi?'Hủy':'Cancel'}</Button></div></form>}</section>;
}
