import {adminApp} from '../shared/admin.js';
export type GoogleReader=(url:string,body?:unknown)=>Promise<{status:number;data:unknown}>;
export const googleRead:GoogleReader=async(url,body)=>{
 if(process.env.GCLOUD_PROJECT?.startsWith('demo-'))return {status:503,data:null};
 const credential=adminApp.options.credential;
 if(!credential) return {status:503,data:null};
 const {access_token}=await credential.getAccessToken();
 const response=await fetch(url,{method:body?'POST':'GET',headers:{authorization:`Bearer ${access_token}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});
 if(!response.body) return {status:response.status,data:null};
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try {for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024)throw Error('Response limit');chunks.push(value);}return {status:response.status,data:JSON.parse(Buffer.concat(chunks).toString()) as unknown};}
 finally{await reader.cancel().catch(()=>undefined);}
};
