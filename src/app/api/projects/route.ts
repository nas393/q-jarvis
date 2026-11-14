import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ID = "team_sWS7qi1gaGUI9lifKbbjERXj";
type ApiResult<T> = { data:T; error?:never; status:"VERIFIED" } | { data:null; error:string; status:"FETCH_ERROR"|"AUTH_REQUIRED"|"NOT_CONFIGURED"|"NOT_LINKED" };
const projects = [
  { id:"q-jarvis", name:"NASSIM AI HQ / Q", repo:"q-jarvis", repoVisibility:"public", vercel:"prj_G87tunS7S6xoJAZyZzEmRIhHAru4", priority:"P1", next:"Complete Stage 1 Preview validation, confirm portfolio intelligence and system health, then define the next approved phase.", area:"Personal HQ" },
  { id:"certigo", name:"CERTIGO", repo:"certigo-institute", repoVisibility:"public", vercel:"prj_ZxaLAJyMIXizGz8HqpflWC0TjSfG", priority:"P1", next:"Validate the mobile lesson reader and course quality before adding features.", area:"Education" },
  { id:"dalil", name:"DALIL AL-BAZOURIEH", repo:"dalil-al-bazourieh", repoVisibility:"private", vercel:"prj_y4i0VPZXxzUhKLvNFOCxwdTSr94v", priority:"P1", next:"Protect the approved design baseline and validate the current mobile experience.", area:"Directory" },
  { id:"lumeris", name:"LUMERIS", repo:null, repoVisibility:null, vercel:"prj_9en6kfMm515bnbkmAgXSpEumh88r", priority:"P1", next:"Maintain the cinematic content system and consistent brand execution.", area:"Media" },
  { id:"lumeris-maker", name:"LUMERIS REEL MAKER", repo:"lumeris-reel-maker", repoVisibility:"public", vercel:"prj_UB1B7zuCnvIohc5VSOVZbirqei4E", priority:"P1", next:"Run an end-to-end sample reel export, verify the linked deployment source, and document any workflow failures.", area:"Creator tools" },
  { id:"xauusd", name:"XAU/USD TRADING HQ", repo:"counter-trader", repoVisibility:"private", vercel:"prj_Yj88nFe9nAEY97iUndUUZs42zAhs", priority:"P2", next:"Validate market data, chart interactions, signal integrity and risk controls.", area:"Trading" },
  { id:"novae", name:"NOVAÉ", repo:"novae-site", repoVisibility:"public", vercel:"prj_Vkri4LKQpL3r24l9FpAIfoWBpx38", priority:"P2", next:"Maintain the agency platform and revisit growth work after P1 delivery.", area:"Agency" },
  { id:"radio", name:"RADIO CEDARS", repo:"Radio-Cedars-", repoVisibility:"public", vercel:"prj_QRS67OXbiBMasOqgG2zVcrdHYJOR", priority:"P3", next:"Review the roadmap and define the next release milestone.", area:"Media" }
];

async function github<T>(path:string, token?:string):Promise<ApiResult<T>> {
  try {
    const headers:Record<string,string>={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
    if(token)headers.Authorization=`Bearer ${token}`;
    const response=await fetch(`https://api.github.com/${path}`,{headers,cache:"no-store"});
    if(response.status===404&&!token)return {data:null,error:"Private repository or resource not visible without a GitHub token",status:"AUTH_REQUIRED"};
    if(!response.ok)return {data:null,error:`GitHub API returned ${response.status}`,status:response.status===401||response.status===403?"AUTH_REQUIRED":"FETCH_ERROR"};
    return {data:await response.json() as T,status:"VERIFIED"};
  } catch(error) {
    return {data:null,error:error instanceof Error?error.message:"GitHub request failed",status:"FETCH_ERROR"};
  }
}
async function vercel(projectId:string, token?:string):Promise<ApiResult<{deployments?:Array<{state?:string;url?:string;created?:number;target?:string|null;inspectorUrl?:string;meta?:Record<string,string>}>}>> {
  if(!token)return {data:null,error:"VERCEL_TOKEN is not configured for this Preview environment",status:"NOT_CONFIGURED"};
  try {
    const url=new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId",projectId);
    url.searchParams.set("limit","1");
    url.searchParams.set("teamId",TEAM_ID);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!response.ok) {
      const body=(await response.text()).replace(/\s+/g," ").slice(0,240);
      const status=response.status===401||response.status===403?"AUTH_REQUIRED":"FETCH_ERROR";
      return {data:null,error:`Vercel API returned ${response.status}: ${body||"No error details returned"}`,status};
    }
    return {data:await response.json(),status:"VERIFIED"};
  } catch(error) {
    return {data:null,error:error instanceof Error?error.message:"Vercel request failed",status:"FETCH_ERROR"};
  }
}

export async function GET() {
  if(!await readSession())return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  const ghToken=process.env.GITHUB_TOKEN;
  const vToken=process.env.VERCEL_TOKEN;
  const data=await Promise.all(projects.map(async project=>{
    const canReadRepo=!!project.repo&&(!!ghToken||project.repoVisibility==="public");
    const [issues,commits,deployment]=await Promise.all([
      !project.repo?Promise.resolve({data:null,error:"No repository mapped",status:"NOT_LINKED"} as const):
      !canReadRepo?Promise.resolve({data:null,error:"Private repository requires GITHUB_TOKEN in this Preview environment",status:"AUTH_REQUIRED"} as const):
      github<Array<{pull_request?:unknown}>>(`repos/nas393/${project.repo}/issues?state=open&per_page=100`,ghToken),
      !project.repo?Promise.resolve({data:null,error:"No repository mapped",status:"NOT_LINKED"} as const):
      !canReadRepo?Promise.resolve({data:null,error:"Private repository requires GITHUB_TOKEN in this Preview environment",status:"AUTH_REQUIRED"} as const):
      github<Array<{commit?:{message?:string;author?:{date?:string}};html_url?:string}>>(`repos/nas393/${project.repo}/commits?per_page=1`,ghToken),
      project.vercel?vercel(project.vercel,vToken):Promise.resolve({data:null,error:"No Vercel project mapped",status:"NOT_LINKED"} as const)
    ]);
    const latest=deployment.data?.deployments?.[0]??null;
    const sourceRepo=latest?.meta?.githubRepo??null;
    const sourceMatches=sourceRepo?sourceRepo.toLowerCase()===project.repo?.toLowerCase():null;
    return {
      ...project,
      openIssues:issues.data?issues.data.filter(item=>!item.pull_request).length:null,
      issuesError:issues.error??null,
      issuesDataStatus:issues.status,
      lastCommit:commits.data?.[0]?{message:commits.data[0].commit?.message?.split("\n")[0],date:commits.data[0].commit?.author?.date,url:commits.data[0].html_url}:null,
      commitError:commits.error??null,
      commitDataStatus:commits.status,
      deployment:latest?{state:latest.state??"UNKNOWN",url:latest.url?`https://${latest.url}`:null,created:latest.created??null,target:latest.target??null,inspectorUrl:latest.inspectorUrl??null,sourceRepo,sourceMatches}:null,
      deploymentError:deployment.error??null,
      deploymentDataStatus:deployment.status,
      integration:{github:issues.status==="VERIFIED"&&commits.status==="VERIFIED",vercel:deployment.status==="VERIFIED"},
      githubDataStatus:issues.status==="VERIFIED"&&commits.status==="VERIFIED"?"VERIFIED":issues.status==="AUTH_REQUIRED"||commits.status==="AUTH_REQUIRED"?"AUTH_REQUIRED":issues.status,
      vercelDataStatus:deployment.status
    };
  }));
  const githubVerified=data.some(project=>project.githubDataStatus==="VERIFIED");
  return NextResponse.json({
    updatedAt:new Date().toISOString(),
    integrations:{github:githubVerified,githubTokenConfigured:!!ghToken,vercel:!!vToken},
    projects:data
  },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
