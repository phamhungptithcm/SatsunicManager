import {useEffect,useRef,useState,type FormEvent,type PointerEvent as ReactPointerEvent} from 'react';
import styles from './AskManager.module.css';

// Presentation/state transitions adapted from HunpeoLabs AskHunpeoLabs.
// Manager questions stay in component memory; no transport or answer provider exists.
function AskIcon({kind}:{kind:'send'|'close'|'chat'}) {
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='chat'?<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-5 3v-5a7.5 7.5 0 1 1 16-5.5Z"/><path d="M8 10h8M8 14h5"/></>:kind==='send'?<path d="M12 20V4m-7 7 7-7 7 7"/>:<path d="m7 7 10 10M17 7 7 17"/>}</svg>;
}
export function AskManager({locale,scopeLabel}:{locale:'vi'|'en';scopeLabel:string}) {
 const vi=locale==='vi';
 const t=vi?{ask:'Hỏi SatsunicManager',send:'Gửi câu hỏi',close:'Đóng hội thoại',hide:'Ẩn khung hỏi',resume:'Tiếp tục hội thoại',blocked:'Chưa kết nối AI. Câu hỏi chưa được gửi.',notice:'Câu hỏi chỉ được giữ trong phiên này; chưa được gửi đến dịch vụ AI.',conversation:'Hội thoại với SatsunicManager'}:{ask:'Ask SatsunicManager',send:'Send question',close:'Close conversation',hide:'Hide Ask SatsunicManager',resume:'Continue conversation',blocked:'AI is not connected. Your question has not been sent.',notice:'Questions stay in this session and are not sent to an AI service.',conversation:'Conversation with SatsunicManager'};
 const [open,setOpen]=useState(false),[dismissed,setDismissed]=useState(false),[hintVisible,setHintVisible]=useState(false),[returned,setReturned]=useState(false),[exiting,setExiting]=useState(false),[idleExiting,setIdleExiting]=useState(false),[focused,setFocused]=useState(false),[input,setInput]=useState(''),[question,setQuestion]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),chatInput=useRef<HTMLInputElement>(null),idleInput=useRef<HTMLInputElement>(null),idleShell=useRef<HTMLElement>(null),launcher=useRef<HTMLButtonElement>(null);
 const dialogMotion=useRef<Animation|null>(null),idleMotion=useRef<Animation|null>(null),closing=useRef(false),outsidePointer=useRef(false),hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null),focusFrame=useRef<number|null>(null);
 useEffect(()=>{
  const element=dialog.current;if(!open||!element)return;
  setExiting(false);element.showModal();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const capsule=element.querySelector('form');if(capsule){const panel=element.getBoundingClientRect(),box=capsule.getBoundingClientRect();const mask=`inset(${box.top-panel.top}px ${panel.right-box.right}px ${panel.bottom-box.bottom}px ${box.left-panel.left}px round 40px)`;dialogMotion.current=element.animate([{clipPath:mask,transform:`translateY(${panel.bottom-box.bottom}px)`},{clipPath:'inset(0px 0px 0px 0px round 28px)',transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});}}
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';chatInput.current?.focus({preventScroll:true});
  return ()=>{dialogMotion.current?.cancel();closing.current=false;element.close();document.body.style.overflow=previousOverflow;};
 },[open]);
 useEffect(()=>()=>{dialogMotion.current?.cancel();idleMotion.current?.cancel();if(hideTimer.current)clearTimeout(hideTimer.current);if(focusFrame.current!==null)cancelAnimationFrame(focusFrame.current);},[]);
 useEffect(()=>{
  if(!dismissed||open||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let showTimer:ReturnType<typeof setTimeout>,clearTimer:ReturnType<typeof setTimeout>|undefined;
  const reveal=()=>{if(document.visibilityState==='visible'){setHintVisible(true);clearTimer=setTimeout(()=>setHintVisible(false),2800);}showTimer=setTimeout(reveal,22000);};showTimer=setTimeout(reveal,5000);
  return ()=>{clearTimeout(showTimer);if(clearTimer)clearTimeout(clearTimer);setHintVisible(false);};
 },[dismissed,open]);
 function close(){
  if(!open||closing.current)return;closing.current=true;setExiting(true);setFocused(false);
  const finish=()=>{setReturned(true);setOpen(false);focusFrame.current=requestAnimationFrame(()=>idleInput.current?.focus({preventScroll:true}));};
  const element=dialog.current,currentStyle=element?getComputedStyle(element):null;
  const startClip=currentStyle?.clipPath==='none'?'inset(0px 0px 0px 0px round 28px)':currentStyle?.clipPath,startTransform=currentStyle?.transform??'none';dialogMotion.current?.cancel();
  if(!element||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}const capsule=element.querySelector('form');if(!capsule){finish();return;}
  const panel=element.getBoundingClientRect(),box=capsule.getBoundingClientRect(),mask=`inset(${box.top-panel.top}px ${panel.right-box.right}px ${panel.bottom-box.bottom}px ${box.left-panel.left}px round 40px)`;
  const motion=element.animate([{clipPath:startClip??'inset(0px 0px 0px 0px round 28px)',transform:startTransform},{clipPath:mask,transform:`translateY(${panel.bottom-box.bottom}px)`}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});dialogMotion.current=motion;void motion.finished.then(finish,()=>{});
 }
 function isBackdrop(event:ReactPointerEvent<HTMLDialogElement>){const box=event.currentTarget.getBoundingClientRect();return event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);}
 function hide(){
  if(idleExiting)return;
  const finish=()=>{setFocused(false);setDismissed(true);setIdleExiting(false);idleMotion.current?.cancel();hideTimer.current=null;focusFrame.current=requestAnimationFrame(()=>launcher.current?.focus({preventScroll:true}));};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}setIdleExiting(true);const shell=idleShell.current;
  if(shell){const box=shell.getBoundingClientRect(),targetWidth=56,deltaX=innerWidth-24-targetWidth/2-(box.left+box.width/2),capsule=shell.querySelector('form')?.getBoundingClientRect(),deltaY=(capsule?capsule.bottom-28:box.bottom-28)-(box.top+box.height/2);idleMotion.current=shell.animate([{opacity:1,transform:'translate(-50%, 0) scale(1)'},{opacity:0,transform:`translate(calc(-50% + ${deltaX}px), ${deltaY}px) scale(${targetWidth/box.width})`}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});}
  hideTimer.current=setTimeout(finish,320);
 }
 function submit(event:FormEvent){event.preventDefault();const text=input.trim();if(!text||text.length>1000||closing.current||hideTimer.current)return;setQuestion(text);setDismissed(false);setOpen(true);}
 const composer=(expanded:boolean)=><div className={styles.composerArea}><form className={styles.composer} onSubmit={submit}><input ref={expanded?chatInput:idleInput} aria-label={t.ask} placeholder="Ask anything..." value={input} maxLength={1000} aria-describedby={expanded?'manager-ai-notice-expanded':'manager-ai-notice-idle'} onChange={event=>setInput(event.target.value)} onFocus={()=>setFocused(true)} onKeyDown={event=>{if(event.key==='Enter'&&event.nativeEvent.isComposing)event.preventDefault();}}/><button className={styles.send} type="submit" aria-label={t.send} title={t.send} disabled={!input.trim()}><AskIcon kind="send"/></button><button className={styles.close} type="button" aria-label={expanded?t.close:t.hide} title={expanded?t.close:t.hide} onClick={()=>expanded?close():hide()}><AskIcon kind="close"/></button></form><p id={expanded?'manager-ai-notice-expanded':'manager-ai-notice-idle'} className={styles.notice}>{expanded||focused?t.notice:t.blocked}</p></div>;
 return <><div className={styles.bottomSpace} aria-hidden="true"/>{!open&&(dismissed||idleExiting)&&<button ref={launcher} className={styles.reopen} data-emerging={idleExiting||undefined} data-hint={hintVisible||undefined} disabled={idleExiting} type="button" aria-label={t.ask} title="Ask Anything" onClick={()=>{setReturned(false);setDismissed(false);if(question)setOpen(true);else focusFrame.current=requestAnimationFrame(()=>idleInput.current?.focus({preventScroll:true}));}}><AskIcon kind="chat"/><span className={styles.hint} aria-hidden="true">{Array.from('Ask Anything').map((letter,index)=><span key={index} style={{animationDelay:`${index*35}ms`}}>{letter===' '?'\u00a0':letter}</span>)}</span></button>}
 {!open&&!dismissed&&<aside ref={idleShell} data-focused={focused||undefined} className={styles.idle} data-returning={returned||undefined} data-hiding={idleExiting||undefined} aria-label={t.ask}><p className={styles.scope}>{scopeLabel}</p>{question&&<button className={styles.resume} type="button" onClick={()=>setOpen(true)}>{t.resume}</button>}{composer(false)}</aside>}
 <dialog ref={dialog} data-closing={exiting||undefined} className={styles.dialog} aria-labelledby="manager-ask-title" onPointerDown={event=>{outsidePointer.current=isBackdrop(event);}} onPointerUp={event=>{const collapse=outsidePointer.current&&isBackdrop(event);outsidePointer.current=false;if(collapse)close();}} onPointerCancel={()=>{outsidePointer.current=false;}} onCancel={event=>{event.preventDefault();close();}} onClose={()=>{if(open)close();}}><header className={styles.header}><span id="manager-ask-title">Satsunic<span>Manager</span></span><span>{t.ask}</span></header><div className={styles.conversation} role="log" aria-label={t.conversation}><p className={styles.scope}>{scopeLabel}</p>{question&&<section className={styles.turn} aria-label={question}><div className={styles.question}><p>{question}</p></div><p className={styles.status} role="status">{t.blocked}</p></section>}</div><div className={styles.dialogBottom}>{composer(true)}</div></dialog></>;
}
