"use client";
import { useEffect, useState } from "react";
import "./web-os.css";

type Project = { name:string; type:string; mark:string; state:string; href:string };
const projects:Project[] = [
 {name:"NASSIM AI HQ",type:"Personal HQ / AI",mark:"Q",state:"Priority 1",href:"/dashboard"},
 {name:"CERTIGO",type:"Education / Certification",mark:"C",state:"Priority 2",href:"https://certigo-gray.vercel.app"},
 {name:"DALIL AL-BAZOURIEH",type:"Business Directory",mark:"د",state:"Priority 3",href:"https://github.com/nas393/dalil-al-bazourieh"},
 {name:"LUMERIS",type:"Media / Mindset",mark:"L",state:"Active",href:"#"},
 {name:"LUMERIS REEL MAKER",type:"Content Tools",mark:"▶",state:"Active",href:"https://github.com/nas393/lumeris-reel-maker"},
 {name:"XAU/USD TRADING HQ",type:"Trading / Markets",mark:"X",state:"Active",href:"https://github.com/nas393/counter-trader"},
 {name:"NOVAÉ",type:"Branding / Marketing",mark:"N",state:"Active",href:"https://github.com/nas393/novae-site"},
 {name:"RADIO CEDARS",type:"Media / Audio",mark:"R",state:"Active",href:"https://github.com/nas393/Radio-Cedars-"}
];
const nav = [
 ["⌂","Command Center","/dashboard"],["▦","Projects","/projects"],["▥","Business","#"],["⌁","Trading HQ","#"],["◈","AI Studio","/chat"],["▷","Media & Content","#"],["▤","Operations","#"],["◷","Analytics","#"],["▣","Resources","#"]
];
export default function WebOS({conversationCount=0,activityCount=0}:{conversationCount?:number;activityCount?:number}) {
 const [clock,setClock]=useState(new Date());
 const [active,setActive]=useState("Command Center");
 useEffect(()=>{const id=window.setInterval(()=>setClock(new Date()),1000);return()=>window.clearInterval(id)},[]);
 const date=clock.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
 return <main className="q-command-center">
  <aside className="q-sidebar">
   <a className="q-logo" href="/dashboard"><span>Q</span> OS<small>COMMAND SYSTEM</small></a>
   <nav>{nav.map(([icon,label,href])=><a key={label} href={href} className={active===label?"selected":""} onClick={()=>setActive(label)}><i>{icon}</i>{label}</a>)}</nav>
   <a className="q-assistant-link" href="/chat"><b>✧</b> Q Assistant</a>
   <div className="q-profile"><div className="q-avatar">N</div><span><b>Nassim</b><small>Portfolio Operator</small></span><i>⚙</i></div>
  </aside>
  <section className="q-main">
   <header className="q-topbar"><div><h1>Command Center</h1><p>Portfolio · Operations · Growth · Execution</p></div><div className="q-top-right"><span className="q-date">▣ {date}</span><strong>{clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:false})}</strong><small>⌖ Luanda (GMT+1)</small><button aria-label="Search">⌕</button><button aria-label="Notifications">♧<i/></button><button aria-label="Apps">▦</button></div></header>
   <div className="q-content">
    <section className="q-hero"><div className="q-hero-copy"><small>Q OS / EXECUTIVE OVERVIEW</small><h2>Build. Operate. <em>Grow.</em></h2><p>Projects&nbsp; | &nbsp;Business&nbsp; | &nbsp;Markets&nbsp; | &nbsp;Content&nbsp; | &nbsp;AI</p></div><div className="q-hero-scene"><div className="q-cityline"/><div className="q-globe"><span>AFRICA</span></div><b>ANGOLA</b></div></section>
    <section className="q-kpis">
     <article><small>PROJECT PORTFOLIO</small><strong>08</strong><em>Active initiatives</em></article>
     <article><small>TOP PRIORITIES</small><strong>03</strong><em>Current execution focus</em></article>
     <article><small>CONVERSATIONS</small><strong>{conversationCount}</strong><em>Q workspace activity</em></article>
     <article><small>RECENT EVENTS</small><strong>{activityCount}</strong><em>Recorded / 24 hours</em></article>
     <article><small>PRODUCTION CHANGES</small><strong>00</strong><em>Protected baseline</em></article>
    </section>
    <section className="q-dashboard-grid">
     <article className="q-panel q-portfolio"><header><div><small>EXECUTION / 01</small><h3>Project Portfolio <b>(8)</b></h3></div><a href="/projects">VIEW ALL ↗</a></header><div className="q-project-grid">{projects.map((p,i)=><a className="q-project-card" key={p.name} href={p.href}><div className={"q-project-art art-"+i}><b>{p.mark}</b><span>{String(i+1).padStart(2,"0")}</span></div><strong>{p.name}</strong><small>{p.type}</small><footer><i/> {p.state}</footer></a>)}</div></article>
     <div className="q-side-stack">
      <article className="q-panel q-intelligence"><header><div><small>DECISION SUPPORT / 02</small><h3>Q Intelligence</h3></div><span className="q-today">TODAY⌄</span></header><div className="q-insight"><b>↗</b><span><strong>Portfolio focus</strong><small>Complete Q OS Preview validation before expanding scope</small></span></div><div className="q-insight"><b>◈</b><span><strong>CERTIGO</strong><small>Mobile lesson-reader QA remains a priority</small></span></div><div className="q-insight"><b>◎</b><span><strong>DALIL AL-BAZOURIEH</strong><small>Protect the approved design baseline and verify mobile experience</small></span></div></article>
      <article className="q-panel q-actions"><header><div><small>WORKSPACE / 03</small><h3>Quick Actions</h3></div></header><div className="q-action-grid"><a href="/projects"><b>＋</b><span>Projects</span></a><a href="/chat"><b>✧</b><span>AI Task</span></a><a href="/projects"><b>↗</b><span>Deployments</span></a><a href="/dashboard"><b>▥</b><span>Overview</span></a></div></article>
     </div>
     <article className="q-panel q-agenda"><header><div><small>OPERATING RHYTHM / 04</small><h3>Today's Agenda</h3></div><span>14 NOV</span></header><div className="q-agenda-list"><p><time>01</time><span><b>Q OS</b><small>Preview validation and visual review</small></span></p><p><time>02</time><span><b>CERTIGO</b><small>Mobile lesson-reader quality assurance</small></span></p><p><time>03</time><span><b>DALIL</b><small>Mobile experience and design baseline</small></span></p><p><time>04</time><span><b>PORTFOLIO</b><small>Review next execution priorities</small></span></p></div></article>
     <article className="q-panel q-alerts"><header><div><small>ATTENTION REQUIRED / 05</small><h3>Alerts & Watchlist</h3></div><b className="q-alert-count">3</b></header><p><i className="red"/> Q OS Preview build verification <span>›</span></p><p><i className="amber"/> CERTIGO mobile QA pending <span>›</span></p><p><i className="amber"/> DALIL mobile validation pending <span>›</span></p></article>
    </section>
    <section className="q-bottom-grid">
     <article className="q-panel"><header><div><small>PORTFOLIO / 06</small><h3>Execution Priorities</h3></div></header><div className="q-priority"><b>01</b><span><strong>NASSIM AI HQ / Q</strong><small>Stage 1 Preview validation</small></span><em>HIGH</em></div><div className="q-priority"><b>02</b><span><strong>CERTIGO</strong><small>Mobile lesson-reader QA</small></span><em>HIGH</em></div><div className="q-priority"><b>03</b><span><strong>DALIL AL-BAZOURIEH</strong><small>Protect design baseline</small></span><em>HIGH</em></div></article>
     <article className="q-panel"><header><div><small>PORTFOLIO MIX / 07</small><h3>Project Categories</h3></div></header><div className="q-category"><div className="q-donut"><strong>08<small>PROJECTS</small></strong></div><div className="q-legend"><p><i/> AI & Productivity <b>1</b></p><p><i/> Education & Directory <b>2</b></p><p><i/> Media & Content <b>3</b></p><p><i/> Trading & Branding <b>2</b></p></div></div></article>
     <article className="q-panel"><header><div><small>SYSTEM / 08</small><h3>Q OS Status</h3></div></header><div className="q-system-status"><span><i/> Preview branch</span><b>STAGE 1</b></div><div className="q-system-status"><span><i/> Production</span><b>UNCHANGED</b></div><div className="q-system-status"><span><i/> Project workspace</span><b>CONNECTED</b></div></article>
    </section>
    <footer className="q-footer"><span>Q OS COMMAND CENTER</span><span>PRIVATE PORTFOLIO ENVIRONMENT · LUANDA</span></footer>
   </div>
  </section>
 </main>;
}
