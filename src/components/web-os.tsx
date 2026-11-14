"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./web-os.css";

type Project={id:string;name:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceRepo?:string|null;sourceMatches?:boolean|null}|null;deploymentError?:string|null;issuesError?:string|null;commitError?:string|null;issuesDataStatus?:string;commitDataStatus?:string;deploymentDataStatus?:string;githubDataStatus?:string;integration:{github:boolean;vercel:boolean}};
type Telemetry={updatedAt:string;integrations:{github:boolean;githubTokenConfigured:boolean;vercel:boolean};projects:Project[]};
const marks=["Q","C","د","L","▶","X","N","R"];
const types=["Personal HQ / AI","Education / Certification","Business Directory","Media / Mindset","Creator Tools","Trading / Markets","Branding / Marketing","Media / Audio"];
const nav=[["⌂","Command Center","/dashboard"],["▱","Projects","/projects"],["▥","Business Intelligence","/projects"],["⌁","Trading HQ","/projects"],["◈","AI Studio","/chat"],["▷","Media & Content","/projects"],["▤","Operations","/projects"],["◷","Analytics","/projects"],["▣","Resources","/projects"]];
const nice=(s:string)=>s.replaceAll("_"," ");
export default function WebOS({conversationCount=0,activityCount=0}:{conversationCount?:number;activityCount?:number}){
 const [clock,setClock]=useState(new Date()),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[searchOpen,setSearchOpen]=useState(false),[active,setActive]=useState("Command Center");
 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/projects",{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"Sign in to load live project telemetry":`Portfolio API returned ${r.status}`);setData(await r.json());}catch(e){setError(e instanceof Error?e.message:"Telemetry unavailable");}finally{setLoading(false)}},[]);
 useEffect(()=>{const t=window.setInterval(()=>setClock(new Date()),1000);return()=>window.clearInterval(t)},[]);
 useEffect(()=>{refresh();const t=window.setInterval(refresh,300000);return()=>window.clearInterval(t)},[refresh]);
 const projects=useMemo(()=>data?.projects??[],[data]);
 const filtered=useMemo(()=>projects.filter(p=>(p.name+" "+p.area+" "+(p.repo??"")).toLowerCase().includes(query.toLowerCase())),[projects,query]);
 const ready=projects.filter(p=>p.deployment?.state==="READY").length,failed=projects.filter(p=>p.deployment?.state==="ERROR").length;
 const vercelVerified=projects.filter(p=>p.deploymentDataStatus==="VERIFIED").length;
 const githubVerified=projects.filter(p=>p.githubDataStatus==="VERIFIED").length;
 const issueTotal=projects.reduce((n,p)=>n+(p.openIssues??0),0);
 const unresolved=projects.filter(p=>p.githubDataStatus!=="VERIFIED"||p.deploymentDataStatus!=="VERIFIED").length;
 const date=clock.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
 const time=clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:false});
 const stateClass=(p:Project)=>p.deployment?.state==="READY"?"ready":p.deployment?.state==="ERROR"?"failed":"unknown";
 return <main className="q-command-center">
  <aside className="q-sidebar">
   <a className="q-logo" href="/dashboard"><span>Q</span> OS<small>OPERATIONS SYSTEM</small></a>
   <nav>{nav.map(([icon,label,url])=><a key={label} href={url} className={active===label?"selected":""} onClick={()=>setActive(label)}><i>{icon}</i>{label}</a>)}</nav>
   <a className="q-assistant-link" href="/chat"><b>✧</b> Q Assistant</a>
   <div className="q-profile"><div className="q-avatar">N</div><span><b>Nassim</b><small>Portfolio Operator</small></span><a href="/login" aria-label="Account settings">⚙</a></div>
  </aside>
  <section className="q-main">
   <header className="q-topbar"><div><h1>Command Center</h1><p>Portfolio · Operations · Growth · Execution</p></div><div className="q-top-right"><span className="q-date">▣ {date}</span><strong>{time}</strong><small>⌖ Luanda (GMT+1)</small><button aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}>⌕</button><button aria-label="Refresh notifications" onClick={refresh}>♧<i/></button><a href="/projects" aria-label="Open modules">▦</a></div></header>
   <div className="q-content">
    {searchOpen&&<div className="q-global-search"><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects, repositories and workspaces…"/><button onClick={()=>{setQuery("");setSearchOpen(false)}}>CLOSE</button></div>}
    <section className="q-hero"><div className="q-hero-copy"><small>Q OS / EXECUTIVE COMMAND ENVIRONMENT</small><h2>Build. Operate. <em>Grow.</em></h2><p>Projects&nbsp; | &nbsp;Business&nbsp; | &nbsp;Markets&nbsp; | &nbsp;Content&nbsp; | &nbsp;AI</p></div><div className="q-hero-scene"><div className="q-skyline"/><div className="q-globe"><span>AFRICA</span></div><b>ANGOLA</b></div></section>
    <section className="q-kpis">
     <article><small>PORTFOLIO VALUE</small><strong>$18.5M</strong><em className="positive">▲ +19.2% YoY</em></article>
     <article><small>REVENUE (YTD)</small><strong>$11.50M</strong><em className="negative">▼ −3.0% vs Bdg</em></article>
     <article><small>GROSS MARGIN</small><strong>18.0%</strong><em className="negative">▼ −6.0 pp YoY</em></article>
     <article><small>EBITDA</small><strong>3.0%</strong><em className="negative">▼ −4.0 pp YoY</em></article>
     <article><small>FACTORY UTILIZATION</small><strong>40%</strong><div className="q-kpi-progress"><i/></div></article>
    </section>
    <section className="q-dashboard-grid">
     <article className="q-panel q-portfolio"><header><div><small>EXECUTION / 01</small><h3>Project Portfolio <b>(08)</b></h3></div><div className="q-filters"><span>ALL 08</span><span>READY {data?ready:"—"}</span><span>RISK {data?failed:"—"}</span></div></header>
      {error&&<div className="q-inline-error">{error}</div>}
      <div className="q-project-grid">{(query?filtered:projects.length?projects: Array.from({length:8},(_,i)=>({id:String(i),name:["NASSIM AI HQ","CERTIGO","DALIL AL-BAZOURIEH","LUMERIS","LUMERIS REEL MAKER","XAU/USD TRADING HQ","NOVAÉ","RADIO CEDARS"][i],area:"Project workspace",priority:"—",repo:null,vercel:null,next:"",openIssues:null,lastCommit:null,deployment:null,integration:{github:false,vercel:false}} as Project))).map((p)=>{const i=Math.max(0,projects.findIndex(x=>x.id===p.id));const href=`/projects/${p.id}`;return <a className="q-project-card" key={p.id} href={href} target={href.startsWith("http")?"_blank":undefined} rel={href.startsWith("http")?"noreferrer":undefined}><div className={`q-project-art art-${i}`}><b>{marks[i]}</b><span>{String(i+1).padStart(2,"0")}</span></div><strong>{p.name.replace(" / Q","")}</strong><small>{types[i]??p.area}</small><footer><i className={stateClass(p)}/><span>{p.deployment?nice(p.deployment.state):loading?"SYNCING":nice(p.deploymentDataStatus??"UNVERIFIED")}</span><em>{p.priority}</em></footer></a>})}</div>
      <div className="q-portfolio-foot"><span>{loading?"SYNCHRONIZING PORTFOLIO":data?`UPDATED ${new Date(data.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"LIVE DATA UNAVAILABLE"}</span><button onClick={refresh}>↻ REFRESH DATA</button><a href="/projects">OPEN PROJECT WORKSPACE ↗</a></div>
     </article>
     <div className="q-side-stack">
      <article className="q-panel q-intelligence"><header><div><small>DECISION SUPPORT / 02</small><h3>Q Intelligence</h3></div><span className="q-live">{loading?"SYNCING":data?"LIVE DATA":"OFFLINE"}</span></header>
       <div className="q-insight"><b>↗</b><span><strong>Deployment coverage</strong><small>{data?`${vercelVerified} of ${projects.length} Vercel connections verified · ${ready} READY · ${failed} ERROR`:"Waiting for authenticated project data"}</small></span></div>
       <div className="q-insight"><b>◈</b><span><strong>Repository visibility</strong><small>{data?`${githubVerified} repositories verified · ${issueTotal} open issues reported`:"GitHub integration not yet verified"}</small></span></div>
       <div className="q-insight"><b>◎</b><span><strong>Attention required</strong><small>{data?`${unresolved} projects have at least one unverified integration`:"No recommendations until data is available"}</small></span></div>
      </article>
      <article className="q-panel q-actions"><header><div><small>WORKSPACE / 03</small><h3>Quick Actions</h3></div></header><div className="q-action-grid"><a href="/projects"><b>＋</b><span>Projects</span></a><a href="/chat"><b>✧</b><span>Q Assistant</span></a><a href="/projects"><b>↗</b><span>Deployments</span></a><a href="/projects"><b>▥</b><span>Reports</span></a></div></article>
     </div>
     <article className="q-panel q-agenda"><header><div><small>OPERATING RHYTHM / 04</small><h3>Today’s Agenda</h3></div><span>LUANDA · GMT+1</span></header>
      <div className="q-agenda-list"><p><time>01</time><span><b>Q OS</b><small>Validate the new executive command center</small></span></p><p><time>02</time><span><b>CERTIGO</b><small>Mobile lesson-reader quality assurance</small></span></p><p><time>03</time><span><b>DALIL AL-BAZOURIEH</b><small>Protect approved design baseline</small></span></p><p><time>04</time><span><b>PORTFOLIO</b><small>Resolve confirmed integration gaps</small></span></p></div>
     </article>
     <article className="q-panel q-alerts"><header><div><small>ATTENTION REQUIRED / 05</small><h3>Alerts & Watchlist</h3></div><b className="q-alert-count">{data?failed:"—"}</b></header>
      <p><i className="red"/> {data?`${failed} deployment errors detected`:"Deployment state not yet verified"} <span>›</span></p><p><i className="amber"/> {data?`${projects.filter(p=>p.githubDataStatus!=="VERIFIED").length} projects without verified GitHub data`:"GitHub status not yet verified"} <span>›</span></p><p><i className="amber"/> {data?`${projects.filter(p=>p.deploymentDataStatus!=="VERIFIED").length} projects without verified Vercel data`:"Vercel status not yet verified"} <span>›</span></p>
     </article>
    </section>
    <section className="q-bottom-grid">
     <article className="q-panel q-revenue"><header><div><small>PERFORMANCE / 06</small><h3>Revenue Trend</h3></div></header><div className="q-chart-total"><strong>$11.50M</strong><span>YTD</span><em>−3.0% vs Bdg</em></div><div className="q-bars">{[42,46,48,55,62,73,88,94].map((v,i)=><div key={i}><i style={{height:v+"%"}}/><small>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"][i]}</small></div>)}</div><div className="q-axis"><span>0.0</span><span>0.5</span><span>1.0</span><span>1.5</span><span>2.0</span></div></article>
     <article className="q-panel q-channel"><header><div><small>COMMERCIAL / 07</small><h3>Channel Mix (Sales)</h3></div></header><div className="q-donut-wrap"><div className="q-donut"><strong>$11.50M<small>YTD</small></strong></div><div className="q-legend"><p><i/>Modern Trade <b>45%</b></p><p><i/>Traditional <b>23%</b></p><p><i/>Institutions <b>27%</b></p><p><i/>Horeca <b>1%</b></p><p><i/>E-Commerce <b>1%</b></p></div></div></article>
     <article className="q-panel q-trading"><header><div><small>MARKETS / 08</small><h3>Trading – XAU/USD</h3></div></header><div className="q-price"><strong>2,063.40</strong><em>▲ +0.82%</em></div><svg className="q-spark" viewBox="0 0 320 112" preserveAspectRatio="none" role="img" aria-label="Illustrative XAU USD market chart"><path d="M0 89 L12 80 22 85 34 62 46 73 58 52 70 58 82 41 94 51 106 35 118 43 130 24 142 33 154 51 166 39 178 48 190 30 202 43 214 19 226 27 238 15 250 34 262 18 274 24 286 8 298 18 310 2" fill="none" stroke="#35df82" strokeWidth="2.5"/><path d="M0 105H320" stroke="#555" strokeWidth="1" strokeDasharray="3 4"/></svg><div className="q-timeframes"><span>15m</span><b>1H</b><span>4H</span><span>1D</span></div></article>
     <article className="q-panel q-factory"><header><div><small>OPERATIONS / 09</small><h3>Factory Utilization</h3></div></header><div className="q-factory-total"><strong>40%</strong><span>Overall</span></div>{[["UHT Milk",25],["Margarine",80],["Butter",10],["Milk Powder",1]].map(([name,value])=><div className="q-factory-row" key={name as string}><span>{name}</span><div><i style={{width:value+"%"}}/></div><b>{value}%</b></div>)}</article>
    </section>
    <footer className="q-footer"><span>Q OS · EXECUTIVE COMMAND CENTER</span><span>PRIVATE PORTFOLIO ENVIRONMENT · LUANDA</span></footer>
   </div>
  </section>
 </main>;
}
