// BASCULE Online – game rules extracted from the validated BASCULE V2 prototype.
// Keep gameplay logic authoritative; no DOM, no client trust.
'use strict';
function createEngine(initialState) {
'use strict';
const TYPES=['m','e','c','v'],RNAME={m:'حديد',e:'طاقة',c:'معلومات',v:'حياة',i:'نفوذ'},EMO={m:'🔩',e:'⚡',c:'💠',v:'🌿',i:'👁️'},COLOR={m:'#ffbb7c',e:'#ffe58a',c:'#88bdff',v:'#87ddb0'};
const obj=(m=0,e=0,c=0,v=0)=>({m,e,c,v});
const M=[
{id:'forge',name:'المصهر',t:1,tag:'m',cost:obj(2,1,0,0),a:{gain:obj(3,0,0,0)},b:{pay:obj(2,1,0,0),vp:4}},
{id:'cell',name:'البطّارية الحيّة',t:1,tag:'e',cost:obj(1,2,0,0),a:{gain:obj(0,3,0,0)},b:{pay:obj(0,2,0,1),vp:4}},
{id:'library',name:'مكتبة الشيفرات',t:1,tag:'c',cost:obj(0,1,2,0),a:{gain:obj(0,0,3,0)},b:{pay:obj(1,0,2,0),vp:4}},
{id:'garden',name:'الحديقة الذكية',t:1,tag:'v',cost:obj(0,0,1,2),a:{gain:obj(0,0,0,3)},b:{pay:obj(0,0,1,2),vp:4}},
{id:'prism',name:'المنشور',t:1,tag:'c',cost:obj(1,0,2,0),a:{pay:obj(0,0,1,0),gain:obj(1,1,0,1),vp:1},b:{pay:obj(1,0,0,1),gain:obj(0,0,2,0),vp:2}},
{id:'exchange',name:'مرآة السوق',t:1,tag:'e',cost:obj(1,1,0,1),a:{gain:obj(0,1,0,0),inf:2},b:{payInf:2,gain:obj(1,0,1,0),vp:3}},
{id:'stitch',name:'الخياطة الضوئية',t:1,tag:'m',cost:obj(2,0,0,1),a:{gain:obj(1,0,1,1)},b:{pay:obj(1,0,1,0),gain:obj(0,1,0,0),vp:3}},
{id:'forest',name:'غابة الطاقة',t:1,tag:'v',cost:obj(0,1,0,2),a:{gain:obj(0,1,0,2)},b:{pay:obj(0,0,0,2),gain:obj(2,0,0,0),vp:2}},
{id:'satellite',name:'القمر الصناعي',t:2,tag:'c',cost:obj(1,2,3,0),a:{gain:obj(0,2,2,0)},b:{pay:obj(0,2,2,0),vp:6}},
{id:'magnet',name:'المحرّك المغناطيسي',t:2,tag:'m',cost:obj(3,2,0,1),a:{gain:obj(2,2,0,0)},b:{pay:obj(2,2,0,0),vp:6}},
{id:'genome',name:'المعمل الجيني',t:2,tag:'v',cost:obj(0,1,2,3),a:{gain:obj(0,0,2,2)},b:{pay:obj(0,0,2,2),vp:6}},
{id:'portal',name:'محرّك الانتقال',t:2,tag:'e',cost:obj(2,3,1,0),a:{gain:obj(1,2,1,0)},b:{pay:obj(1,2,1,0),vp:6}},
{id:'memory',name:'بنك الذكريات',t:2,tag:'c',cost:obj(1,1,3,1),a:{gain:obj(0,0,2,1),inf:1},b:{pay:obj(0,0,2,1),payInf:1,vp:6}},
{id:'bloom',name:'الأنسجة المتكاثرة',t:2,tag:'v',cost:obj(1,0,1,3),a:{pay:obj(0,0,0,1),gain:obj(2,1,1,0)},b:{pay:obj(1,0,0,2),vp:5,gain:obj(0,0,1,0)}},
{id:'foundry',name:'المصنع الذاتي',t:2,tag:'m',cost:obj(3,0,2,0),a:{gain:obj(3,0,1,0)},b:{pay:obj(3,0,1,0),vp:6}},
{id:'beam',name:'الليزر العجيب',t:2,tag:'e',cost:obj(0,3,2,0),a:{gain:obj(0,3,1,0)},b:{pay:obj(0,3,1,0),vp:6}},
{id:'sun',name:'الشمس الاصطناعية',t:3,tag:'e',cost:obj(2,3,2,1),a:{gain:obj(0,3,2,0),vp:1},b:{pay:obj(0,3,2,1),vp:9}},
{id:'oracle',name:'العقل الجماعي',t:3,tag:'c',cost:obj(1,2,3,2),a:{gain:obj(0,1,3,1),vp:1},b:{pay:obj(1,1,3,1),vp:9}},
{id:'oasis',name:'الواحة الآلية',t:3,tag:'v',cost:obj(2,1,2,3),a:{gain:obj(0,1,1,3),vp:1},b:{pay:obj(1,1,1,3),vp:9}},
{id:'citadel',name:'قلعة المواد',t:3,tag:'m',cost:obj(4,1,1,1),a:{gain:obj(4,1,0,0),vp:1},b:{pay:obj(4,1,1,0),vp:9}},
{id:'nexus',name:'قلب الشبكة',t:3,tag:'c',cost:obj(2,2,3,1),a:{gain:obj(1,1,1,1),inf:1,vp:1},b:{pay:obj(1,1,2,2),vp:9}},
{id:'thunder',name:'عاصفة مصغّرة',t:3,tag:'e',cost:obj(2,3,1,2),a:{gain:obj(1,3,0,1)},b:{pay:obj(2,3,0,1),vp:9}},
{id:'seeder',name:'بذرة المستقبل',t:3,tag:'v',cost:obj(1,2,2,3),a:{gain:obj(0,0,2,3)},b:{pay:obj(0,1,2,3),vp:9}},
{id:'reactor',name:'الفرن الكبير',t:3,tag:'m',cost:obj(3,2,1,2),a:{gain:obj(3,1,0,1)},b:{pay:obj(3,2,0,1),vp:9}}
];
// كل عائلة فيها 6 اختراعات بالضبط، ونفس الآلات الأصلية ما تبدّلتش.
const FAMILIES={Production:{name:'إنتاج',symbol:'🌱',desc:'تجيب موارد جديدة',ids:['forge','cell','library','garden','forest','foundry']},Conversion:{name:'تحويل',symbol:'🔄',desc:'تغيّر موارد أو وجه الآلة',ids:['prism','stitch','magnet','genome','portal','bloom']},Exchange:{name:'تبادل',symbol:'🤝',desc:'معلومات ونفوذ وروابط',ids:['exchange','satellite','memory','oracle','nexus','seeder']},Prestige:{name:'مشاريع كبرى',symbol:'🏛️',desc:'مكافآت ونقاط قوية',ids:['beam','sun','oasis','citadel','thunder','reactor']}};
const FAMILY_BY_ID=Object.fromEntries(Object.entries(FAMILIES).flatMap(([k,v])=>v.ids.map(id=>[id,k])));
const FAMILY_KEYS=Object.keys(FAMILIES);
const DISTRICT_DEFS=[
 {id:'harbor',name:'الميناء الحرّ',symbol:'🚢',pay:obj(1,1,0,0),theme:'حديد + طاقة'},
 {id:'atlas',name:'أطلس المعرفة',symbol:'🛰️',pay:obj(0,1,1,0),theme:'طاقة + معلومات'},
 {id:'biome',name:'القبة الحيّة',symbol:'🌳',pay:obj(0,0,1,1),theme:'معلومات + حياة'}
];
const C=[
{id:'c1',t:1,name:'صنع درع ضوئي',pay:obj(2,1,1,0),vp:5,inf:1},
{id:'c2',t:1,name:'إصلاح محطّة',pay:obj(1,2,0,2),vp:6,inf:1},
{id:'c3',t:1,name:'فكّ شيفرة قديمة',pay:obj(0,1,3,1),vp:6,inf:1},
{id:'c4',t:1,name:'اختراع غذاء جديد',pay:obj(0,1,1,3),vp:6,inf:1},
{id:'c5',t:1,name:'تجهيز بعثة',pay:obj(2,0,1,2),vp:6,inf:1},
{id:'c6',t:1,name:'مصباح للميناء',pay:obj(1,3,1,0),vp:6,inf:1},
{id:'c7',t:1,name:'مركب ذكي',pay:obj(2,1,0,2),vp:6,inf:1},
{id:'c8',t:1,name:'أرشفة مدينة',pay:obj(1,0,3,1),vp:6,inf:1},
{id:'c9',t:2,name:'حديقة فوق الغيم',pay:obj(1,2,2,3),vp:10,inf:2},
{id:'c10',t:2,name:'حماية شبكة دولية',pay:obj(2,3,3,0),vp:10,inf:2},
{id:'c11',t:2,name:'بناء سفينة كائنات',pay:obj(3,2,0,3),vp:10,inf:2},
{id:'c12',t:2,name:'تشغيل مصنع متنقل',pay:obj(3,2,2,1),vp:10,inf:2},
{id:'c13',t:2,name:'اختبار ذكاء حيّ',pay:obj(1,1,3,3),vp:10,inf:2},
{id:'c14',t:2,name:'شحن نواة عملاقة',pay:obj(2,3,1,2),vp:10,inf:2},
{id:'c15',t:3,name:'مدينة خارج الزمن',pay:obj(3,3,3,3),vp:16,inf:3},
{id:'c16',t:3,name:'تجربة عالم موازي',pay:obj(2,4,4,2),vp:16,inf:3},
{id:'c17',t:3,name:'إنقاذ قمر صناعي',pay:obj(4,3,3,2),vp:16,inf:3},
{id:'c18',t:3,name:'شجرة الحياة الأخيرة',pay:obj(2,2,4,4),vp:16,inf:3}
];
const AWARDS=[
{id:'collector',name:'المجمّع',desc:'كل جمع موارد يعطي +1 مورد إضافي من نفس النوع.'},
{id:'architect',name:'المهندس',desc:'كل بناء يكلّف حديد أقلّ بواحد (بحدّ أدنى صفر).'},
{id:'patent',name:'براءة الاختراع',desc:'كل عقد ناجح يعطي +2 نقاط زيادة.'},
{id:'resonator',name:'الرنّان',desc:'أوّل تشغيل آلة في كل دور يعطي +1 نفوذ.'},
{id:'switcher',name:'المحوّل',desc:'تشغيل الوجه B لأي آلة يعطي +1 نقطة.'},
{id:'networker',name:'المفاوض',desc:'حركة جمع النفوذ تعطي +1 نفوذ إضافي.'},
{id:'scout',name:'المستكشف',desc:'في بداية كل عصر جديد، تربح +2 معلومات.'},
{id:'crafts',name:'الحرفي',desc:'كل بناء يعطي +1 نقطة فوز.'}
];
const rnd=n=>Math.floor(Math.random()*n),shuffle=a=>{a=[...a];for(let j=a.length-1;j>0;j--){const i=rnd(j+1);[a[j],a[i]]=[a[i],a[j]];}return a;},sum=r=>TYPES.reduce((x,k)=>x+(r[k]||0),0);
function newPlayer(id){return {id,name:id===0?'Vous':['','Maya','Léo','Nora'][id]||`Bot ${id}`,bot:id!==0,style:id%3, r:obj(3,3,3,3),inf:2,vp:0,machines:[],cap:3,actions:3,types:[],used:[],lastTag:null,perks:[],contracts:0,activations:0,borrowRound:0};}
let s={};let logMax=80;
function log(x){s.log.unshift(x);if(s.log.length>logMax)s.log.length=logMax;}
function tier(){return s.round<=4?1:s.round<=9?2:3;}
function machineById(id){return M.find(x=>x.id===id)}
function effectiveCost(card,p){let c={...card.cost};if(p.perks.includes('architect'))c.m=Math.max(0,c.m-1);if(isUnlocked('harbor',2))c.m=Math.max(0,c.m-1);return c;}
function canPay(p,c){return TYPES.every(k=>p.r[k]>=(c?.[k]||0));}
function pay(p,c){for(let k of TYPES)p.r[k]-=(c?.[k]||0);}
function add(p,c){for(let k of TYPES)p.r[k]+=(c?.[k]||0);}
function roundBonus(p,kind){p.actions--;p.types.push(kind);if(p.actions===0){if(new Set(p.types).size===3){p.vp++;log(`✨ ${p.name}: 3 Actions مختلفة = +1 نقطة Combo`);}p.types=[];p.used=[];p.lastTag=null;}}
function initDistricts(){return DISTRICT_DEFS.map(d=>({...d,level:1,goal:4,progress:0,shares:{},done:false}));}
function linksFor(id){return s.links.filter(l=>l.aOwner===id||l.bOwner===id);}
function linkInvolves(l,playerId,machineId){return (l.aOwner===playerId&&l.aMachine===machineId)||(l.bOwner===playerId&&l.bMachine===machineId);}
function linkCanBuild(p,owner,id,myId){const q=s.players.find(x=>x.id===owner);if(!q||q.id===p.id||!p.machines.some(x=>x.id===myId)||!q.machines.some(x=>x.id===id)||p.inf<2||linksFor(p.id).length>=2||linksFor(q.id).length>=2)return false;return !s.links.some(l=>(linkInvolves(l,p.id,myId)&&linkInvolves(l,q.id,id)));}
function onActivateLink(p,machineId){for(let l of s.links){if(!linkInvolves(l,p.id,machineId))continue;
 if(l.aOwner===p.id&&l.aMachine===machineId)l.aUsed=s.round;
 if(l.bOwner===p.id&&l.bMachine===machineId)l.bUsed=s.round;
 if(l.aUsed>0&&l.bUsed>0&&s.round-l.aUsed<=1&&s.round-l.bUsed<=1){
   const a=s.players[l.aOwner],b=s.players[l.bOwner];a.vp+=2;b.vp+=2;a.inf++;b.inf++;
   l.rewarded=s.round;l.lastRewardRound=s.round;l.triggers=(l.triggers||0)+1;
   l.aUsed=0;l.bUsed=0; // chaque nouvelle récompense exige deux nouvelles activations
   s.stats.linkTriggers=(s.stats.linkTriggers||0)+1;
   log(`🌐 SYNC ! ${a.name} + ${b.name}: +2 points et +1 Influence chacun (activation n°${l.triggers}).`);
 }}
}
function completeDistrict(d,p){
 const stage=d.level;
 const participants=Object.entries(d.shares).filter(([_,n])=>n>0).map(([id,n])=>({p:s.players[Number(id)],shares:n})).sort((a,b)=>b.shares-a.shares||a.p.id-b.p.id);
 const top=participants[0]?.shares||0,leaders=participants.filter(x=>x.shares===top);
 for(let x of participants){let pts=x.shares===top?(leaders.length>1?7:10):4;x.p.vp+=pts;}
 const bonus=s.anomaly===DISTRICT_DEFS.findIndex(x=>x.id===d.id)?4:0;p.vp+=bonus;
 if(d.id==='biome'&&stage===2){for(const q of s.players)q.cap=Math.min(7,q.cap+1);}
 log(`🏛️ ${PROJ_FR[d.id].name}: étape ${stage}/3 achevée. Capacité permanente débloquée: ${STAGE_DEFS[d.id][stage-1].unlock}! ${leaders.map(x=>x.p.name).join(' et ')} en tête. ${p.name} ${bonus?'a reçu +4 points d’Anomalie.':''}`);
 s.stats.projectsCompleted=(s.stats.projectsCompleted||0)+1;
 d.level++;d.progress=0;d.shares={};
 d.done=d.level>3;
 d.goal=d.done?0:(d.level===2?5:6);
 d.pay=d.done?obj(0,0,0,0):{
  m:d.pay.m+(d.id==='harbor'?1:0),e:d.pay.e+(d.id==='atlas'?1:0),c:d.pay.c+(d.id==='biome'?1:0),v:d.pay.v+(d.id==='biome'&&d.level===3?1:0)
 };
 if(d.done)log(`🏆 ${PROJ_FR[d.id].name} terminé définitivement. Il ne peut plus être reconstruit.`);
 if(s.anomaly>=0&&s.districts[s.anomaly].done){let next=s.districts.findIndex(x=>!x.done);s.anomaly=next;}
}
function marketFill(){while(s.market.length<4){let avail=M.filter(x=>x.t<=tier()&&!s.market.includes(x.id)&&!s.seenM.includes(x.id));if(!avail.length)break;let t=tier(),target=avail.filter(x=>x.t===t);let from=(target.length&&Math.random()<.78)?target:avail;let x=from[rnd(from.length)];s.market.push(x.id);s.seenM.push(x.id);}}
function contractsFill(){while(s.contracts.length<3){let avail=C.filter(x=>x.t<=tier()&&!s.contracts.includes(x.id)&&!s.seenC.includes(x.id));if(!avail.length)break;let t=tier(),focus=avail.filter(x=>x.t===t);let from=(focus.length&&Math.random()<.7)?focus:avail;let x=from[rnd(from.length)];s.contracts.push(x.id);s.seenC.push(x.id);}}
function refreshEra(){if(s.round===5||s.round===10){s.market.splice(0,2);s.contracts.splice(0,1);marketFill();contractsFill();s.protocol=TYPES[rnd(4)];log(`🪐 العصر ${tier()} بدا: آلات وعقود أقوى ظهروا، والبروتوكول تبدّل`);for(let p of s.players)if(p.perks.includes('scout'))p.r.c+=2;}}
const STAGE_DEFS={
 harbor:[{name:'Quais orbitaux',unlock:'Négoce libre',desc:'Échangez 2 ressources contre 3 autres (1 fois / manche).',icon:'⚓'},{name:'Route des cités',unlock:'Acier subventionné',desc:'Toute construction coûte 1 Métal de moins.',icon:'🌉'},{name:'Port universel',unlock:'Commerce mondial',desc:'Chaque contrat rapporte +2 Influence.',icon:'🌐'}],
 atlas:[{name:'Archives ouvertes',unlock:'Reprogrammation libre',desc:'Changer le mode A / B ne coûte plus d’Information.',icon:'📖'},{name:'Réseau de recherche',unlock:'Découverte constante',desc:'La première activation de chaque manche donne +1 Information.',icon:'🛰️'},{name:'Mémoire vivante',unlock:'Culture technologique',desc:'Chaque activation en mode B rapporte +1 point.',icon:'🧠'}],
 biome:[{name:'Jardins suspendus',unlock:'Récoltes fertiles',desc:'Récolter Vie rapporte +1 ressource.',icon:'🌱'},{name:'Biosphère étendue',unlock:'Ateliers agrandis',desc:'Tous les joueurs gagnent +1 emplacement de machine.',icon:'🌳'},{name:'Équilibre planétaire',unlock:'Écologie collaborative',desc:'Contribuer aux autres projets rapporte +1 point.',icon:'🌍'}]
};
const PROJ_FR={harbor:{name:'Port Libre',subtitle:'COMMERCE & RÉSEAUX',scene:'harbor'},atlas:{name:'Atlas des Savoirs',subtitle:'RECHERCHE & CONNAISSANCE',scene:'atlas'},biome:{name:'Dôme Vivant',subtitle:'VIE & HARMONIE',scene:'biome'}};
function isUnlocked(project,n){return s.districts?.find(d=>d.id===project)?.level>n}
function doMove(kind,info={},automatic=false){if(s.over||s.pendingAuction)return false;const p=s.players[s.turn];if(p.actions<=0)return false;let ok=false,label='';
if(kind==='connect'){const owner=Number(info.owner),id=info.id,myId=info.myId;if(!linkCanBuild(p,owner,id,myId))return false;p.inf-=2;const q=s.players[owner];q.inf++;s.links.push({aOwner:p.id,aMachine:myId,bOwner:owner,bMachine:id,aUsed:0,bUsed:0,rewarded:0});label=`ربط ${machineById(myId).name} مع ${machineById(id).name} متاع ${q.name}. ${q.name} ربح +1 نفوذ` ;ok=true;}
if(kind==='contribute'){const d=s.districts.find(x=>x.id===info.id);if(!d||d.done||!canPay(p,d.pay))return false;pay(p,d.pay);d.shares[p.id]=(d.shares[p.id]||0)+1;d.progress++;if(isUnlocked('biome',3)&&d.id!=='biome')p.vp++;label=`ساهم في ${d.name} (${d.progress}/${d.goal})`;ok=true;if(d.progress>=d.goal)completeDistrict(d,p);}
if(kind==='steer'){let target=Number(info.target);if(![0,1,2].includes(target)||s.districts[target].done||target===s.anomaly||p.inf<1)return false;p.inf--;s.anomaly=target;label=`وجّه الظاهرة المتنقّلة إلى ${s.districts[target].name}`;ok=true;}
if(kind==='swap'){const a=info.from,b=info.to;if(!isUnlocked('harbor',1)||!TYPES.includes(a)||!TYPES.includes(b)||a===b||p.r[a]<2||p.tradeRound===s.round)return false;p.r[a]-=2;p.r[b]+=3;p.tradeRound=s.round;label=`Échange 2 ${RNAME[a]} contre 3 ${RNAME[b]}`;ok=true;}
if(kind==='gather') {let k=info.k;if(!TYPES.includes(k))return false;let amount=2+(s.protocol===k?1:0)+(p.perks.includes('collector')?1:0)+(k==='v'&&isUnlocked('biome',1)?1:0);p.r[k]+=amount;label=`جمع ${amount} ${RNAME[k]}`;ok=true;}
if(kind==='network'){p.inf+=2+(p.perks.includes('networker')?1:0);let k=TYPES.reduce((a,b)=>p.r[a]<p.r[b]?a:b,'m');p.r[k]++;label=`+${2+(p.perks.includes('networker')?1:0)} نفوذ و +1 ${RNAME[k]}`;ok=true;}
if(kind==='build'){let id=info.id,x=machineById(id),cost=x&&effectiveCost(x,p);if(!x||!s.market.includes(id)||p.machines.length>=p.cap||!canPay(p,cost))return false;pay(p,cost);p.machines.push({id,side:'a',lastRound:0});s.market=s.market.filter(y=>y!==id);marketFill();if(p.perks.includes('crafts'))p.vp++;label=`بنى ${x.name}`;ok=true;}
if(kind==='contract'){let x=C.find(c=>c.id===info.id);if(!x||!s.contracts.includes(x.id)||!canPay(p,x.pay))return false;pay(p,x.pay);p.vp+=x.vp+(p.perks.includes('patent')?2:0);p.inf+=x.inf+(isUnlocked('harbor',3)?2:0);p.contracts++;s.contracts=s.contracts.filter(c=>c!==x.id);contractsFill();label=`أكمل «${x.name}» وربح ${x.vp+(p.perks.includes('patent')?2:0)} نقطة` ;ok=true;}
if(kind==='activate'){let m=p.machines.find(y=>y.id===info.id),x=m&&machineById(m.id),f=m&&x[m.side];if(!x||m.lastRound===s.round||!canPay(p,f.pay)||p.inf<(f.payInf||0))return false;pay(p,f.pay);p.inf-=f.payInf||0;add(p,f.gain);p.inf+=f.inf||0;p.vp+=f.vp||0;if(m.side==='b'&&p.perks.includes('switcher'))p.vp++;if(p.perks.includes('resonator')&&!p.used.length)p.inf++;if(p.lastTag!==null&&p.lastTag!==x.tag&&!p.used.includes('SYNERGY')){p.inf++;p.vp++;p.used.push('SYNERGY');log(`🔗 ${p.name}: ربط بين آلتين مختلفتين = +1 نقطة و +1 نفوذ`);}p.lastTag=x.tag;p.used.push(x.id);p.activations++;if(isUnlocked('atlas',2)&&p.lastAtlasRound!==s.round){p.r.c++;p.lastAtlasRound=s.round;log(`📘 ${p.name}: Réseau de recherche +1 Information`);}if(isUnlocked('atlas',3)&&m.side==='b')p.vp++;onActivateLink(p,m.id);m.side=m.side==='a'?'b':'a';m.lastRound=s.round;label=`شغّل ${x.name}؛ توا تبدّل للوجه ${m.side.toUpperCase()}`;ok=true;}
if(kind==='borrow'){const q=s.players.find(y=>y.id===info.owner),m=q&&q.machines.find(y=>y.id===info.id),x=m&&machineById(m.id),f=m&&x[m.side];if(!q||q.id===p.id||!x||p.borrowRound===s.round||p.inf<2+(f.payInf||0)||!canPay(p,f.pay))return false;const borrowedSide=m.side;pay(p,f.pay);p.inf-=2+(f.payInf||0);q.inf+=2;add(p,f.gain);p.inf+=f.inf||0;p.vp+=f.vp||0;if(borrowedSide==='b'&&p.perks.includes('switcher'))p.vp++;p.borrowRound=s.round;label=`استعمل ترخيص «${x.name}» (وجه ${borrowedSide.toUpperCase()}) من ${q.name} مقابل 2 نفوذ` ;ok=true;}
if(kind==='expand'){if(p.cap>=7||!canPay(p,obj(2,0,2,0)))return false;pay(p,obj(2,0,2,0));p.cap++;label=`وسّع Atelier إلى ${p.cap} أماكن`;ok=true;}
if(kind==='flip'){let m=p.machines.find(y=>y.id===info.id);if(!m||(!isUnlocked('atlas',1)&&p.r.c<1)||m.lastRound===s.round)return false;if(!isUnlocked('atlas',1))p.r.c--;m.side=m.side==='a'?'b':'a';label=`عاود برمج ${machineById(m.id).name} للوجه ${m.side.toUpperCase()}`;ok=true;}
if(kind==='tune'){if(!TYPES.includes(info.k)||p.inf<2||s.protocol===info.k)return false;p.inf-=2;s.protocol=info.k;label=`بدّل البروتوكول العام إلى ${RNAME[info.k]}`;ok=true;}
if(kind==='scout'){if(p.inf<1)return false;p.inf--;s.market.splice(0,1);marketFill();label='بدّل آلة واحدة من سوق الاختراعات';ok=true;}
if(ok){s.lastMove={kind,info:{...info},actor:p.id,round:s.round,label};log(`${p.name}: ${label}`);roundBonus(p,kind);s.turnCount++;s.stats[kind]=(s.stats[kind]||0)+1;return true;}return false;
}
function create(names) {
 const n=names.length;
 s={round:1,turn:0,players:Array.from({length:n},(_,i)=>{const p=newPlayer(i);p.name=names[i];p.bot=false;return p;}),market:[],contracts:[],seenM:[],seenC:[],districts:initDistricts(),links:[],anomaly:rnd(3),protocol:TYPES[rnd(4)],log:[],pendingAuction:false,auctionIndex:0,auctionItem:null,over:false,turnCount:0,stats:{},lastMove:null};
 marketFill();contractsFill();return s;
}
if(initialState) s=initialState;
function state(){return s;}
function move(playerId,kind,info={}){
 if(s.over||s.pendingAuction||s.turn!==playerId||!s.players[playerId]||s.players[playerId].actions<1)return null;
 const before=s.turnCount;
 const ok=doMove(kind,info,true);
 if(!ok||s.turnCount===before)return null;
 const event={...s.lastMove};
 if(s.players[playerId].actions===0) advance();
 return event;
}
function pass(playerId) {
 if(s.over||s.pendingAuction||s.turn!==playerId)return null;
 const p=s.players[playerId];
 // Preserve original early-ending 3-different-actions combo rule.
 if(new Set(p.types).size===3)p.vp++;
 p.actions=0;p.types=[];p.used=[];p.lastTag=null;
 const event={kind:'pass',actor:playerId,round:s.round,info:{}};
 advance();return event;
}
function advance(){
 if(s.turn+1<s.players.length){s.turn++;s.players[s.turn].actions=3;return;}
 if([4,8,12].includes(s.round)) {
  s.pendingAuction=true;s.auctionIndex++;
  const choices=AWARDS.filter(x=>!s.players.some(p=>p.perks.includes(x.id)));
  s.auctionItem=choices[rnd(choices.length)]||null;
  s.auctionBids={};
  return;
 }
 goNextRound();
}
function goNextRound(){
 if(s.round>=14){s.over=true;s.winner=[...s.players].sort((a,b)=>b.vp-a.vp||b.inf-a.inf)[0].id;return;}
 s.round++;refreshEra();s.turn=0;
 const remaining=s.districts.map((d,i)=>!d.done?i:-1).filter(i=>i>=0);
 s.anomaly=remaining.length?(remaining.find(i=>i>s.anomaly)??remaining[0]):-1;
 for(let p of s.players){p.actions=3;p.used=[];p.lastTag=null;p.types=[];}
}
function bid(playerId,amount){
 if(!s.pendingAuction||s.over||!Number.isSafeInteger(amount)||amount<0||s.auctionBids[playerId]!==undefined||!s.players[playerId]||amount>s.players[playerId].inf)return null;
 s.auctionBids[playerId]=amount;
 if(Object.keys(s.auctionBids).length===s.players.length){
  const bids=s.players.map(p=>s.auctionBids[p.id]);
  const max=Math.max(...bids);
  const winner=max===0?-1:bids.indexOf(max);
  if(winner>=0){s.players[winner].inf-=max;s.players[winner].perks.push(s.auctionItem.id);}
  const event={kind:'auctionResult',actor:winner,round:s.round,info:{winner,bid:max,item:s.auctionItem.id}};
  s.pendingAuction=false;s.auctionItem=null;s.auctionBids={};
  goNextRound();return event;
 }
 return {kind:'bid',actor:playerId,round:s.round,info:{}};
}
function exportCatalog(){return {machines:M,contracts:C,awards:AWARDS,stages:STAGE_DEFS,projects:DISTRICT_DEFS,families:FAMILIES};}
return {create,state,move,pass,bid,exportCatalog};
}
module.exports={createEngine};
