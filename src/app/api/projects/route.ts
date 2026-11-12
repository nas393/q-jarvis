import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ID = "team_sWS7qi1gaGUI9lifKbbjERXj";
const projects = [
  { id:"q-jarvis", name:"NASSIM AI HQ / Q JARVIS", repo:"q-jarvis", vercel:"prj_G87tunS7S6xoJAZyZzEmRIhHAru4", priority:"P1", next:"Finish the core chat foundation, then expand the project headquarters.", area:"Personal HQ" },
  { id:"certigo", name:"CERTIGO", repo:"certigo-institute", vercel:"prj_ZxaLAJyMIXizGz8HqpflWC0TjSfG", priority:"P1", next:"Validate the mobile lesson reader and course quality before adding features.", area:"Education" },
  { id:"dalil", name:"DALIL AL-BAZOURIEH", repo:"dalil-al-bazourieh", vercel:"prj_y4i0VPZXxzUhKLvNFOCxwdTSr94v", priority:"P1", next:"Review the current live build and confirm the approved design baseline.", area:"Directory" },
  { id:"lumeris-maker", name:"LUMERIS Reel Maker", repo:"lumeris-reel-maker", vercel:"prj_UB1B7zuCnvIohc5VSOVZbirqei4E", priority:"P1", next:"Resolve the outstanding media-library and video playback issues.", area:"Creator tools", note:"Vercel deployment metadata currently points to photo-nw-vault; verify the Git link." },
  { id:"photo-vault", name:"Android Photo Organizer", repo:"photo-nw-vault", vercel:null, priority:"P2", next:"Fix incomplete photo indexing and retest the full device library.", area:"Android" },
  { id:"trading", name:"XAUUSD Trading Terminal", repo:"counter-trader", vercel:"prj_K230e9qdMTKfvAQRZgGr0MpD0b1J", priority:"P2", next:"Verify candle history, timeframe switching, chart interactions and signal integrity.", area:"Trading" },
  { id:"lumeris", name:"LUMERIS Brand", repo:null, vercel:"prj_9en6kfMm515bnbkmAgXSpEumh88r", priority:"P2", next:"Maintain the content engine and consistent brand execution.", area:"Media" },
  { id:"novae", name:"NOVAÉ", repo:"novae-site", vercel:"prj_Vkri4LKQpL3r24l9FpAIfoWBpx38", priority:"P3", next:"Keep the agency site stable; revisit growth work after P1 delivery.", area:"Agency" },
  { id:"radio", name:"Radio Cedars", repo:"Radio-Cedars-", vercel:"prj_QRS67OXbiBMasOqgG2zVcrdHYJOR", priority:"P3", next:"Review roadmap and define the next release milestone.", area:"Media" },
  { id:"price-intel", name:"Luanda Price Intel", repo:"luanda-price-intel", vercel:null, priority:"P2", next:"Reconnect or verify the repository and deployment ownership.", area:"Market intelligence", note:"Vercel project was not present in the current connected project listing." },
  { id:"ala-hawa", name:"Ala Hawa", repo:"ala-hawa", vercel:"prj_fIQ16ehm4dg42uJgf0RApHS1qyMI", priority:"P3", next:"Review product status and decide whether to resume.", area:"Web app" },
  { id:"counter-trader", name:"Counter Trader", repo:"counter-trader", vercel:"prj_Yj88nFe9nAEY97iUndUUZs42zAhs", priority:"P2", next:"Keep the trading strategy and execution app aligned with the terminal.", area:"Trading" },
  { id:"angoalissar", name:"Angoalissar Commercial", repo:null, vercel:null, priority:"P1", next:"Track commercial priorities, category performance and key execution actions.", area:"Business" }
];

async function github(path:string, token:string) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers:{ Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28" },
    cache:"no-store"
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  return response.json();
}
async function vercel(projectId:string, token:string) {
  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId",projectId);
  url.searchParams.set("limit","1");
  url.searchParams.set("teamId",TEAM_ID);
  const response = await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if (!response.ok) throw new Error(`Vercel ${response.status}`);
  return response.json();
}

export async function GET() {
  const ghToken = process.env.GITHUB_TOKEN;
  const vToken = process.env.VERCEL_TOKEN;
  const data = await Promise.all(projects.map(async project => {
    const [issues,commits,deployment] = await Promise.all([
      ghToken && project.repo ? github(`repos/nas393/${project.repo}/issues?state=open&per_page=30`,ghToken).catch(error=>({error:String(error)})) : Promise.resolve(null),
      ghToken && project.repo ? github(`repos/nas393/${project.repo}/commits?per_page=1`,ghToken).catch(error=>({error:String(error)})) : Promise.resolve(null),
      vToken && project.vercel ? vercel(project.vercel,vToken).catch(error=>({error:String(error)})) : Promise.resolve(null)
    ]);
    const latest = Array.isArray(deployment?.deployments) ? deployment.deployments[0] : null;
    return {
      ...project,
      openIssues:Array.isArray(issues) ? issues.filter((item:any)=>!item.pull_request).length : null,
      issuesError:issues?.error ?? null,
      lastCommit:Array.isArray(commits) && commits[0] ? { message:commits[0].commit?.message?.split("\n")[0], date:commits[0].commit?.author?.date, url:commits[0].html_url } : null,
      commitError:commits?.error ?? null,
      deployment:latest ? { state:latest.state, url:latest.url ? `https://${latest.url}` : null, created:latest.created, target:latest.target, inspectorUrl:latest.inspectorUrl } : null,
      deploymentError:deployment?.error ?? null,
      integration:{ github:!!(ghToken && project.repo), vercel:!!(vToken && project.vercel) }
    };
  }));
  return NextResponse.json({
    updatedAt:new Date().toISOString(),
    integrations:{ github:!!ghToken, vercel:!!vToken },
    projects:data
  },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
