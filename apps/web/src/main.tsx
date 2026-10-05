import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ownerSchema, type Owner } from '../../../packages/contracts/src/index';
import { loadClient, type Client } from './lib/firebase';
import { copy, type Locale } from './lib/i18n';
import { Login } from './features/auth';
import { Shell } from './features/shell';
import './styles.css';
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });
const clientPromise = loadClient();
function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [setup, setSetup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [locale, setLocale] = useState<Locale>('vi');
  const [denied, setDenied] = useState(false);
  const t = copy[locale];
  useEffect(() => {
    let active = true, epoch = 0;
    let unsubscribeAuth = () => {}, unsubscribeAccess = () => {};
    void clientPromise.then(loaded => {
      if (!active) return;
      setClient(loaded);
      unsubscribeAuth = onIdTokenChanged(loaded.auth, async user => {
        const run = ++epoch; unsubscribeAccess(); queryClient.clear(); setOwner(null); setVerifying(Boolean(user));
        if (!user) { setVerifying(false); return; }
        try {
          const identity = ownerSchema.parse(await loaded.call('bootstrapOwner', {}));
          if (!active || epoch !== run) return;
          setOwner(identity); setVerifying(false); setDenied(false);
          unsubscribeAccess = onSnapshot(doc(loaded.firestore, 'ownerAccess', user.uid), snapshot => {
            if (snapshot.data()?.enabled !== true) { queryClient.clear(); setOwner(null); void signOut(loaded.auth); }
          }, () => { queryClient.clear(); setOwner(null); setDenied(true); void signOut(loaded.auth); });
        } catch {
          if (active && epoch === run) { queryClient.clear(); setOwner(null); setVerifying(false); setDenied(true); await signOut(loaded.auth); }
        }
      });
    }).catch(() => { if (active) setSetup(true); });
    return () => { active = false; epoch++; unsubscribeAuth(); unsubscribeAccess(); queryClient.clear(); };
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  async function logout() { queryClient.clear(); setOwner(null); if (client) await signOut(client.auth); }
  if (verifying) return <main className="login-page"><p role="status">{t.verify}</p></main>;
  if (!owner || !client) return <><Login client={client} setup={setup} t={t}/>{denied && <p className="login-error" role="alert">{t.authError}</p>}</>;
  return <Shell client={client} owner={owner} locale={locale} setLocale={setLocale} logout={logout}/>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider>);
