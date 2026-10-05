import {AddApp} from './apps';
import {AskManager} from './conversation/AskManager';
import {FinancePage} from './finance';
import {OperationsPage,IncidentsPage,NotificationsPage} from './operations/pages';
import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Boxes, Wallet, Activity, ChartNoAxesCombined, TriangleAlert, FileText, Bell, Plug, Settings, Menu, PanelLeftClose, Moon, Sun, RefreshCw, LogOut, Globe, ExternalLink } from 'lucide-react';
import { APP_CATALOG, registryResponseSchema, appIdSchema, type Scope, type Owner, type RegistryItem } from '../../../../packages/contracts/src/index';
import type { Client } from '../lib/firebase';
import { copy, type Locale } from '../lib/i18n';
import { BlogToast, type ToastKind } from '../components/toast';
import { ActionProgress } from '../components/action-progress';
import { useHeaderMotion } from '../components/motion';
import { Button } from '../components/button';
const navigation = [ ['/', 'overview', LayoutDashboard], ['/apps', 'apps', Boxes], ['/finance', 'finance', Wallet], ['/operations', 'operations', Activity], ['/traffic', 'traffic', ChartNoAxesCombined], ['/incidents', 'incidents', TriangleAlert], ['/reports', 'reports', FileText], ['/notifications', 'notifications', Bell], ['/integrations', 'integrations', Plug], ['/settings', 'settings', Settings] ] as const;
export function Shell({ client, owner, locale, setLocale, logout }: { client: Client; owner: Owner; locale: Locale; setLocale: (value: Locale) => void; logout: () => Promise<void> }) {
  const t = copy[locale];
  const headerRef = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState<{text:string;kind:ToastKind;pending?:boolean}>({text:"",kind:"info"});
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useHeaderMotion(headerRef, drawer);
  const [dark, setDark] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const [scopeEnd,setScopeEnd]=useState(()=>new Date().toISOString());
  const environment = 'production' as const;
  const timezone = params.get('timezone') === 'Asia/Ho_Chi_Minh' ? 'Asia/Ho_Chi_Minh' : 'America/Chicago';
  const appId = appIdSchema.safeParse(params.get('app')).success ? params.get('app')! : 'all';
  const days = ['1', '7', '30'].includes(params.get('days') ?? '') ? params.get('days')! : '30';
  const scope:Scope={appId:appId==='all'?'all':appIdSchema.parse(appId),environment,from:new Date(Date.parse(scopeEnd)-Number(days)*86400000).toISOString(),to:scopeEnd,timezone};
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['registry', owner.uid, environment], queryFn: async () => registryResponseSchema.parse(await client.call('listApps', { environment })), staleTime: 30000, retry: 1 });
  const mutation = useMutation({ mutationFn: async (item: RegistryItem) => client.call('checkConnection', { appId: item.id, environment, revision: item.revision, idempotencyKey: crypto.randomUUID() }),
    onMutate: () => setNotice({text:t.testing,kind:'info',pending:true}),
    onError: () => setNotice({text:t.testError,kind:'error'}),
    onSuccess: async () => { setNotice({text:t.connected,kind:'info'}); await cache.invalidateQueries({ queryKey: ['registry', owner.uid, environment] }); } });
  const catalog=query.data?.data??APP_CATALOG;
  const pageProps={client,owner,scope,locale,appNames:Object.fromEntries(catalog.map(app=>[app.id,app.name])),onNotice:(text:string,kind:'info'|'error',pending?:boolean)=>setNotice({text,kind,pending})};
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };
  const format = (value: string | null) => value ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : t.notChecked;
  const items = (query.data?.data ?? []).filter(item => appId === 'all' || item.id === appId);
  const checked = items.filter(item => item.results.length > 0 && item.status !== 'stale').length;
  const title = navigation.find(([path]) => path === location.pathname)?.[1] ?? 'overview';
  const registryPage = ['/', '/apps', '/integrations'].includes(location.pathname);
  return <div className={`workspace ${collapsed ? 'collapsed' : ''} ${dark ? 'dark' : ''}`}>
    <ActionProgress language={locale}/><BlogToast text={notice.text} kind={notice.kind} pending={notice.pending} language={locale} onClose={() => setNotice({text:"",kind:"info"})}/><a className="skip" href="#main">{t.skip}</a>
    {drawer && <button className="scrim" aria-label={t.close} onClick={() => setDrawer(false)} />}
    <aside className={`sidebar ${drawer ? 'open' : ''}`} aria-label={t.menu}>
      <div className="brand"><span className="brand-symbol">S</span>{!collapsed && <span className="wordmark">Satsunic<span>Manager</span></span>}</div>
      
      <nav>{navigation.map(([path, key, Icon]) => <NavLink key={path} to={`${path}?${params}`} end={path === '/'} title={t[key]} aria-label={t[key]} onClick={() => setDrawer(false)}><Icon size={18} />{!collapsed && <span>{t[key]}</span>}</NavLink>)}</nav>
      <div className="sidebar-footer"><Button className="icon collapse" title={t.collapse} aria-label={t.collapse} onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} /></Button></div>
    </aside>
    <header ref={headerRef} className="topbar" data-menu-open={drawer}><Button className="icon mobile-menu" aria-label={t.menu} onClick={() => { setCollapsed(false); setDrawer(true); }}><Menu size={20}/></Button>
      <label className="filter app-filter"><span>{t.apps}</span><select aria-label={t.apps} value={appId} onChange={event => update('app', event.target.value)}><option value="all">{t.all}</option>{catalog.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="filter"><span>{t.environment}</span><select aria-label={t.environment} value={environment} onChange={event => update('environment', event.target.value)}><option value="production">Production</option></select></label>
      <div className="topbar-actions"><Button className="icon" title={t.refresh} aria-label={t.refresh} disabled={query.isFetching} onClick={() => {setScopeEnd(new Date().toISOString());void cache.invalidateQueries();}}><RefreshCw size={17} className={query.isFetching ? 'spin' : ''}/></Button>
      <Button className="icon" title={t.theme} aria-label={t.theme} onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</Button>
      <NavLink className="button icon" to={`/notifications?${params}`} title={t.notifications} aria-label={t.notifications}><Bell size={18}/></NavLink>
      <Button className="user-menu" title={t.logout} aria-label={t.logout} disabled={signingOut} onClick={async () => { setSigningOut(true); await logout(); }}><span className="avatar">{owner.email[0]?.toUpperCase()}</span><LogOut size={16}/></Button></div>
    </header>
    <main id="main" className="content" tabIndex={-1} style={{ paddingBottom: 260 }}>
      {client.config.emulator && <div className="fixture-banner">{t.fixture}</div>}
      {offline && <p role="status" className="notice">{t.offline}</p>}
      <div className="page-heading"><div><h1>{t[title]}</h1></div><label className="locale"><Globe size={16}/><select aria-label={t.language} value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label></div>
      <div className="scope-bar"><label><span>{t.period}</span><select aria-label={t.period} value={days} onChange={event => update('days', event.target.value)}><option value="30">{t.days30}</option><option value="7">{t.days7}</option><option value="1">{t.today}</option></select></label>
      <label><span>{t.timezone}</span><select aria-label={t.timezone} value={timezone} onChange={event => update('timezone', event.target.value)}><option>America/Chicago</option><option>Asia/Ho_Chi_Minh</option></select></label><span className="freshness">{query.data ? `${t.dataAsOf} ${format(query.data.meta.fetchedAt)}` : t.notChecked}</span></div>
      {location.pathname==='/apps'&&<AddApp client={client} owner={owner} locale={locale} onNotice={pageProps.onNotice}/>}
      {registryPage ? <>
        
        <div className="metrics"><section><span>{t.coverageLabel}</span><strong>{query.data ? `${checked} / ${items.length}` : '—'}</strong><small>{t.coverage}</small></section><section><span>{t.revenue}</span><strong>—</strong><small>{t.missing}</small></section><section><span>{t.billing}</span><strong>—</strong><small>{t.missing}</small></section></div>
        <section className="registry"><div className="section-heading"><div><h2>{title === 'apps' ? t.sources : t.registryTitle}</h2></div><span className="count">{query.data ? items.length : '—'}</span></div>
        {query.isPending && <p className="empty" role="status">{t.loading}</p>}
        {query.isError && <div className="empty" role="alert"><p>{t.error}</p><Button onClick={() => void query.refetch()}>{t.retry}</Button></div>}

        <div className="app-list">{items.map((item, index) => <article className="app-row" key={item.id}><div className={`app-mark mark-${index}`}>{item.name.slice(0, 1)}</div><div className="app-info"><h3>{item.name}</h3><div className="row-meta"><span className={`status ${item.status}`}>{t[item.status]}</span><span>{item.environment}</span></div><p className="timestamp">{t.checked}: {format(item.lastAttemptAt)}</p>
          {item.results.length > 0 && <ul className="probe-list">{item.results.map(result => <li key={result.capability}><span>{result.capability === 'public_reachability' ? t.reachability : t.readiness}</span><span className={`status ${result.status}`}>{t[result.status]}{result.httpStatus !== null ? ` · HTTP ${result.httpStatus}` : ''}</span></li>)}</ul>}
          <details><summary>{t.sourceMissing}</summary><p>{item.missingSources.map(source => t[source]).join(' · ')}</p><p>{t.success}: {format(item.lastSuccessAt)}</p>{item.source && <a href={item.source} target="_blank" rel="noreferrer">{item.source}<ExternalLink size={12}/></a>}</details>
          </div><Button title={item.source ? t.test : t.noTarget} disabled={!item.source || mutation.isPending} onClick={() => mutation.mutate(item)}>{mutation.isPending && mutation.variables?.id === item.id ? t.testing : t.test}</Button></article>)}</div>
          {!query.isPending && !query.isError && items.length === 0 && <p className="empty">{t.noFiltered}</p>}
        </section><p className="footnote">{t.healthDisclaimer} {t.readOnly}</p>
      </> : location.pathname==='/operations'?<OperationsPage key={`${appId}:${days}:${timezone}:${scopeEnd}`} {...pageProps}/>:location.pathname==='/incidents'?<IncidentsPage {...pageProps}/>:location.pathname==='/notifications'?<NotificationsPage {...pageProps}/>:location.pathname==='/finance'||location.pathname==='/reports'?<FinancePage {...pageProps} report={location.pathname==='/reports'}/>:<section className="empty-state"><Plug size={28}/><h2>{t.missing}</h2><p>{t.sectionBlocked}</p><NavLink className="button" to={`/integrations?${params}`}>{t.integrations}</NavLink></section>}
      <footer className="product-footer">Product by <a href="https://hunpeolabs.com" target="_blank" rel="noreferrer">HunpeoLabs</a></footer>
    </main>
    <AskManager key={`${appId}/${days}/${timezone}/${scopeEnd}`} locale={locale} scopeLabel={`${appId === 'all' ? t.all : catalog.find(a => a.id === appId)?.name} / ${environment} / ${days === '30' ? t.days30 : days === '7' ? t.days7 : t.today}`}/>
  </div>;
}
