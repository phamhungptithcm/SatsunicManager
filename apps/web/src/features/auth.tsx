import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import type { Client } from '../lib/firebase';
import type { Text } from '../lib/i18n';
import { Button } from '../components/button';
function reportAuthFailure(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  // Only a bounded SDK error code; never credentials, account details or exception payloads.
  console.warn('Manager Google sign-in:', typeof code === 'string' && /^auth\/[a-z-]+$/.test(code) ? code : 'unavailable');
}
type GoogleAPI = { accounts: { id: { initialize: (options: { client_id: string; callback: (data: { credential: string }) => void; use_fedcm_for_prompt: boolean; auto_select: boolean }) => void; prompt: () => void; cancel: () => void } } };
declare global { interface Window { google?: GoogleAPI } }
export function Login({ client, setup, t }: { client: Client | null; setup: boolean; t: Text }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!client || client.config.emulator) return;
    let active = true;
    const initialize = () => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({ client_id: client.config.oauthClientId, auto_select: false, use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          if (!active) return;
          setPending(true); setFailed(false);
          try { await signInWithCredential(client.auth, GoogleAuthProvider.credential(credential)); }
          catch (error) { reportAuthFailure(error); if (active) setFailed(true); }
          finally { if (active) setPending(false); }
        } });
      window.google.accounts.id.prompt();
    };
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = initialize;
    script.onerror = () => { /* Fallback remains available when GIS is blocked. */ };
    document.head.append(script);
    return () => { active = false; window.google?.accounts.id.cancel(); script.remove(); };
  }, [client]);
  async function fallback() {
    if (!client) return;
    setPending(true); setFailed(false);
    try { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); await signInWithPopup(client.auth, provider); }
    catch (error) { reportAuthFailure(error); setFailed(true); }
    finally { setPending(false); }
  }
  return <main className="login-page"><section className="login-box"><span className="wordmark">Satsunic<span>Manager</span></span><p className="eyebrow">HunpeoLabs</p>
    <h1>{t.private}</h1><p>{t.intro}</p>
    {setup ? <div className="notice"><h2>{t.setup}</h2><p>{t.setupBody}</p></div> : <Button className="primary" onClick={() => void fallback()} disabled={!client || pending}>{pending ? t.verify : t.login}</Button>}
    {failed && <p role="alert">{t.authError}</p>}
  </section></main>;
}
