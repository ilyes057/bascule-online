// BASCULE Online v0.2: voluntary exit, Enter-to-chat, and more reliable optional voice.
let voiceMembers=new Set(),audioBlocked=false;
const UX={
 fr:{quitGame:'Quitter la partie',quitConfirm:'Quitter cette partie et retourner au menu ? Si elle a commencé, votre place sera abandonnée.',voiceConnecting:'Connexion…',voiceLive:'Connecté',voiceNoTurn:'Le micro est autorisé, mais aucun ami n’est encore connecté au vocal.',voiceBlocked:'Activez le son',voiceRetry:'Réessayer le vocal',voiceNetwork:'Si le vocal ne se connecte pas entre réseaux différents, un relais TURN est nécessaire.'},
 en:{quitGame:'Leave game',quitConfirm:'Leave this game and return to the main menu? You will resign if it has started.',voiceConnecting:'Connecting…',voiceLive:'Connected',voiceNoTurn:'Your mic is ready, but nobody else is in voice chat yet.',voiceBlocked:'Enable audio',voiceRetry:'Retry voice',voiceNetwork:'A TURN relay may be required on some networks.'},
 ar:{quitGame:'مغادرة المباراة',quitConfirm:'هل تريد الخروج للقائمة الرئيسية؟ ستنسحب إن بدأت المباراة.',voiceConnecting:'جار الاتصال…',voiceLive:'متصل',voiceNoTurn:'الميكروفون جاهز لكن مازال ما دخل حتى لاعب آخر للصوت.',voiceBlocked:'تشغيل الصوت',voiceRetry:'إعادة اتصال الصوت',voiceNetwork:'بعض الشبكات تحتاج لخادم TURN لتشغيل الصوت.'}
};
for(const l in UX)Object.assign(LANGS[l],UX[l]);
let quitting=false;
function quitGame(){if(!room||quitting||!confirm(t('quitConfirm')))return;quitting=true;if(!send({type:'leave'}))quitting=false;setTimeout(()=>{quitting=false},1800);}
const wasReceive=receive;
receive=function(d){
 if(d.type==='voice-members'){
  const updated=new Set(d.members||[]),joinNow=voiceJoined&&!voiceMembers.has(you);
  if(voiceJoined)for(const id of updated)if(id!==you&&(joinNow||!voiceMembers.has(id)))voicePresence(id,true);
  for(const id of voiceMembers)if(!updated.has(id))voicePresence(id,false);
  voiceMembers=updated;
  if(drawerMode==='voice')renderVoiceDrawer();return;
 }
 if(d.type==='seat'){you=d.playerId;render();return;}
 if(d.type==='left'){
  quitting=false;stopVoice(false);voiceMembers.clear();room='';token='';you=null;state=null;pendingRoom='';pendingName='';history=[];chat=[];lastSequence=0;unread=0;
  localStorage.removeItem('bascule_session');const url=new URL(location.href);url.searchParams.delete('room');historyReplace(url);
  closeDrawer();$('auctionModal').classList.add('hidden');render();return;
 }
 wasReceive(d);
 if(d.type==='state'){
  const updated=new Set(d.voiceMembers||[]);
  if(updated.size||voiceMembers.size)receive({type:'voice-members',members:[...updated]});
 }
};
const wasRender=render;
render=function(){wasRender();const active=!!state&&state.phase!=='entry';$('quitBtn').classList.toggle('hidden',!active);$('quitBtn').title=t('quitGame')};
const wasOpenDrawer=openDrawer;
openDrawer=function(mode){wasOpenDrawer(mode);if(mode==='chat')requestAnimationFrame(()=>$('drawerChatInput')?.focus());};
const wasMenuDrawer=renderMenuDrawer;
renderMenuDrawer=function(){wasMenuDrawer();$('drawerBody').insertAdjacentHTML('beforeend',`<div class="drawerGroup"><button class="btn" data-quit>↩ ${t('quitGame')}</button></div>`);};
const wasMakePeer=makePeer;
makePeer=function(id){const entry=wasMakePeer(id);entry.pc.ontrack=ev=>{
 entry.audio.srcObject=ev.streams[0]||new MediaStream([ev.track]);
 entry.audio.play().then(()=>audioBlocked=false).catch(()=>{audioBlocked=true;toast(t('voiceBlocked'));if(drawerMode==='voice')renderVoiceDrawer()});
};entry.pc.onconnectionstatechange=()=>{if(drawerMode==='voice')renderVoiceDrawer();if(entry.pc.connectionState==='failed')toast(t('voiceNetwork'))};return entry;};
const wasVoiceDrawer=renderVoiceDrawer;
renderVoiceDrawer=function(){wasVoiceDrawer();if(drawerMode!=='voice')return;
 const isConnected=[...voices.values()].some(x=>x.pc.connectionState==='connected');
 $('drawerBody').insertAdjacentHTML('beforeend',`<div class="drawerGroup"><small>${voiceJoined?(isConnected?'🔊 '+t('voiceLive'):voiceMembers.size<2?t('voiceNoTurn'):t('voiceConnecting')):''}</small>${voiceJoined?`<p class="mutedNote">${t('voiceNetwork')}</p><button class="btn" data-retry-voice>↻ ${t('voiceRetry')}</button>${audioBlocked?`<button class="btn btnPrimary" data-audio-unlock>🔊 ${t('voiceBlocked')}</button>`:''}`:''}</div>`);
};
$('quitBtn').onclick=quitGame;
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-quit'))quitGame();
 if(b.hasAttribute('data-audio-unlock')){Promise.all([...voices.values()].map(x=>x.audio.play().catch(()=>{}))).then(()=>{audioBlocked=false;renderVoiceDrawer()})}
 if(b.hasAttribute('data-retry-voice')&&voiceJoined){stopVoice(true);toggleVoice();}
});
document.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
 const tag=e.target?.tagName?.toLowerCase();if(e.target?.isContentEditable||['input','textarea','select','button'].includes(tag)||!room||!$('auctionModal').classList.contains('hidden')||!$('helpModal').classList.contains('hidden'))return;
 e.preventDefault();if(state?.phase==='lobby')$('lobbyChatInput').focus();else if(['playing','finished'].includes(state?.phase))openDrawer('chat');
});
