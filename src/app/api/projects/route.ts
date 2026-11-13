import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ID = "team_sWS7qi1gaGUI9lifKbbjERXj";
const projects = [
  { id:"q-jarvis", name:"NASSIM AI HQ / Q", repo:"q-jarvis", vercel:"prj_G87tunS7S6xoJAZyZzEmRIhHAru4", priority:"P1", next:"Complete Stage 1 Preview validation, confirm portfolio intelligence and system health, then define the next approved phase.", area:"Personal HQ" },
  { id:"certigo", name:"CERTIGO", repo:"certigo-institute", vercel:"prj_ZxaLAJyMIXizGz8HqpflWC0TjSfG", priority:"P1", next:"Validate the mobile lesson reader and course quality before adding features.", area:"Education" },
  { id:"dalil", name:"DALIL AL-BAZOURIEH", repo:"dalil-al-bazourieh", vercel:"prj_y4i0VPZXxzUhKLvNFOCxwdTSr94v", priority:"P1", next:"Protect the approved design baseline and validate the current mobile experience.", area:"Directory" },
  { id:"lumeris", name:"LUMERIS", repo:null, vercel:"prj_9en6kfMm515bnbkmAgXSpEumh88r", priority:"P1", next:"Maintain the cinematic content system and consistent brand execution.", area:"Media" },
  { id:"lumeris-maker", name:"LUMERIS REEL MAKER", repo:"lumeris-reel-maker", vercel:"prj_UB1B7zuCnvIohc5VSOVZbirqei4E", priority:"P1", next:"Stabilise the media workflow and verify the correct deployment connection.", area:"Creator tools", note:"Deployment mapping intentionally withheld until the Vercel project link is verified." },
  { id:"xauusd", name:"XAU/USD TRADING HQ", repo:"counter-trader", vercel:"prj_K230e9qdMTKfvAQRZgGr0MpD0b1J", priority:"P2", next:"Validate market data, chart interactions, signal integrity and risk controls.", area:"Trading" },
  { id:"novae", name:"NOVAÉ", repo:"novae-site", vercel:"prj_Vkri4LKQpL3r24l9FpAIfoWBpx38", priority:"P2", next:"Maintain the agency platform and revisit growth work after P1 delivery.", area:"Agency" },
  { id:"radio", name:"RADIO CEDARS", repo:"Radio-Cedars-", vercel:"prj_QRS67OXbiBMasOqgG2zVcrdHYJOR", priority:"P3", next:"Review the roadmap and define the next release milestone.", area:"Media" }
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
      openIssues:Array.isArray(issues) ? issues.filter((item:{pull_request?:unknown})=>!item.pull_request).length : null,
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
