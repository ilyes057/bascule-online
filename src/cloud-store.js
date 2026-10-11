'use strict';
// Optional durable persistence with Supabase REST/PostgREST (no npm packages).
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set SERVER-SIDE ONLY.
const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const enabled=!!(url&&key);
function headers(extra={}){return {apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...extra}}
async function load(){if(!enabled)return null;const c=new AbortController();const timeout=setTimeout(()=>c.abort(),7500);try{const res=await fetch(`${url}/rest/v1/bascule_rooms?select=payload&limit=150`,{headers:headers(),signal:c.signal});if(!res.ok)throw Error(`${res.status}: ${await res.text()}`);return (await res.json()).map(x=>x.payload)}finally{clearTimeout(timeout)}}
let busy=false;let queued=null;
async function save(snapshots){if(!enabled)return;queued=snapshots;if(busy)return;busy=true;try{while(queued){const next=queued;queued=null;if(!next.length)continue;const c=new AbortController();const timeout=setTimeout(()=>c.abort(),10000);try{const res=await fetch(`${url}/rest/v1/bascule_rooms?on_conflict=code`,{method:'POST',headers:headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(next.map(r=>({code:r.code,payload:r,updated_at:new Date().toISOString()}))),signal:c.signal});if(!res.ok)throw Error(`${res.status}: ${await res.text()}`)}finally{clearTimeout(timeout)}}}finally{busy=false}}
module.exports={enabled,load,save};
