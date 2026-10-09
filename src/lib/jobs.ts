import type { RemoteJob } from '../types';
// Public endpoint, remote positions only. Production should respect Jobicy rate limits and terms.
function plain(html:string) { return html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(); }
export async function fetchRemoteJobs(query=''): Promise<RemoteJob[]> {
  const url = 'https://jobicy.com/api/v2/remote-jobs?count=40'+(query.trim()?'&tag='+encodeURIComponent(query.trim()):'');
  const r = await fetch(url,{headers:{Accept:'application/json'}});
  if (!r.ok) throw new Error(`Job discovery unavailable (HTTP ${r.status}). Your saved jobs still work offline.`);
  const data = await r.json();
  if (data.success===false) throw new Error(data.error || 'Could not load jobs');
  return (Array.isArray(data.jobs)?data.jobs:[]).map((j:any)=>({
    id:String(j.id), company:j.companyName || 'Company not listed', title:j.jobTitle || 'Untitled role',
    location:j.jobGeo || 'Remote', salary:j.annualSalaryMin && j.annualSalaryMax ? `${j.annualSalaryMin}–${j.annualSalaryMax} ${j.salaryCurrency||''}` : 'Not specified',
    employmentType:j.jobType || 'Remote', description:plain(j.jobDescription||''), url:j.url||''
  }));
}
