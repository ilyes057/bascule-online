'use strict';
// BASCULE Online: zero-dependency HTTP + WebSocket server (RFC 6455 text frames).
// Playable MVP, not a production hardened multi-tenant service.
const http=require('node:http');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {createEngine}=require('./src/engine');
const cloud=require('./src/cloud-store');
const PORT=Number(process.env.PORT||3000);
const DIR=path.resolve(__dirname,'public');
const STORE=path.resolve(process.env.DATA_FILE||path.join(__dirname,'.data','rooms.json'));
const rooms=new Map();
const clients=new Set();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const hex=()=>crypto.randomBytes(18).toString('hex');
function roomCode(){let code;do{code=crypto.randomBytes(4).toString('base64url').replace(/[-_]/g,'').toUpperCase().slice(0,6)}while(rooms.has(code));return code;}
function clean(v,max=64){return String(v||'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,max);}
function send(c,msg){if(c.socket.destroyed)return;let payload=Buffer.from(JSON.stringify(msg));let len=payload.length;let head;if(len<126){head=Buffer.from([0x81,len])}else if(len<65536){head=Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(len,2)}else{head=Buffer.alloc(10);head[0]=0x81;head[1]=127;head.writeBigUInt64BE(BigInt(len),2)}c.socket.write(Buffer.concat([head,payload]));}
function control(c,opcode,data=Buffer.alloc(0)){if(c.socket.destroyed)return;c.socket.write(Buffer.concat([Buffer.from([0x80|opcode,data.length]),data]));}
function broadcast(room,msg){for(const c of clients)if(c.code===room.code&&c.playerId!==null)send(c,msg);}
function current(room){return room.engine?room.engine.state():null;}
function playerView(room,id){const game=current(room);return {type:'state',code:room.code,phase:game?(game.over?'finished':game.pendingAuction?'auction':'playing'):'lobby',you:id,host:room.host,players:room.players.map((p,i)=>({id:i,name:p.name,online:!!p.online,host:i===room.host})),game:game?{...game,auctionBids:game.pendingAuction?Object.keys(game.auctionBids||{}).map(Number):[]}:null,chat:room.chat.slice(-35),voiceMembers:[...(room.voiceMembers||[])],events:(room.events||[]).slice(-45)};}
function broadcastVoice(room){broadcast(room,{type:'voice-members',members:[...(room.voiceMembers||[])]});}
function sync(room){room.touched=Date.now();for(const c of clients)if(c.code===room.code&&c.playerId!==null)send(c,playerView(room,c.playerId));scheduleSave();}
function emitEvent(room,event){if(!event)return;room.eventId++;room.events=room.events||[];room.events.push({id:room.eventId,event});if(room.events.length>55)room.events.shift();broadcast(room,{type:'event',id:room.eventId,event});room.touched=Date.now();scheduleSave();}
function snapshot(game){return game?.players?.map(p=>({id:p.id,r:{...p.r},inf:p.inf,vp:p.vp,machines:p.machines.length}))||[];}
function impact(before,game){return snapshot(game).map(p=>{const b=before.find(x=>x.id===p.id);if(!b)return null;const r=Object.fromEntries(['m','e','c','v'].map(k=>[k,(p.r[k]||0)-(b.r[k]||0)]).filter(([k,v])=>v));const inf=p.inf-b.inf,vp=p.vp-b.vp,machines=p.machines-b.machines;if(!Object.keys(r).length&&!inf&&!vp&&!machines)return null;return {player:p.id,r,inf,vp,machines};}).filter(Boolean);} 
function attach(c,room,id,token){for(const other of clients)if(other!==c&&other.code===room.code&&other.playerId===id){send(other,{type:'replaced'});other.socket.end();other.code=null;other.playerId=null;}
 c.code=room.code;c.playerId=id;c.token=token;room.players[id].online=true;room.voiceMembers?.delete(id);broadcastVoice(room);send(c,{type:'joined',code:room.code,token,playerId:id});sync(room);
}
function error(c,message){send(c,{type:'error',message});}
function handle(c,msg){if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
 const type=msg.type;
 if(type==='heartbeat')return;
 if(type==='create'){
  if(c.code!==null)return error(c,'Already in a room');
  const code=roomCode(),token=hex(),name=clean(msg.name,22)||'Joueur 1';
  const room={code,players:[{name,token,online:true}],host:0,engine:null,chat:[],voiceMembers:new Set(),events:[],eventId:0,touched:Date.now()};
  rooms.set(code,room);attach(c,room,0,token);return;
 }
 if(type==='join'){
  if(c.code!==null)return error(c,'Already in a room');
  const code=clean(msg.code,10).toUpperCase();const room=rooms.get(code);if(!room)return error(c,'Room not found');
  const prior=room.players.findIndex(p=>p.token===msg.token);
  if(prior>=0){attach(c,room,prior,msg.token);return;}
  if(room.engine)return error(c,'Game already started. Rejoin with your saved token.');
  if(room.players.length>=4)return error(c,'Room full (4 players maximum)');
  const token=hex(),id=room.players.length,name=clean(msg.name,22)||`Joueur ${id+1}`;
  room.players.push({name,token,online:true});attach(c,room,id,token);return;
 }
 if(c.code===null||c.playerId===null)return error(c,'Join a room first');
 const room=rooms.get(c.code);if(!room)return error(c,'Room expired');room.touched=Date.now();
 if(type==='start'){
  if(room.host!==c.playerId||room.engine||room.players.length<2||room.players.some(p=>!p.online))return error(c,'Need 2–4 players and the host to start');
  const eng=createEngine();eng.create(room.players.map(p=>p.name));room.engine=eng;
  emitEvent(room,{kind:'start',actor:c.playerId,round:1,info:{}});sync(room);return;
 }
 if(type==='action'){
  if(!room.engine)return error(c,'Game has not started');
  const game=current(room);if(game.over)return error(c,'Game is finished');
  // Move executed only by the server, for the player whose turn it is.
  const action=typeof msg.action==='string'?msg.action.slice(0,24):'';
  const allowed=new Set(['gather','network','build','activate','contract','contribute','connect','borrow','expand','flip','steer','swap','tune','scout']);
  if(!allowed.has(action))return error(c,'Unknown action');
  const info=msg.info&&typeof msg.info==='object'&&!Array.isArray(msg.info)?msg.info:{};
  const before=snapshot(game);const event=room.engine.move(c.playerId,action,info);
  if(!event)return error(c,'Action not allowed or insufficient resources');
  event.impact=impact(before,current(room));emitEvent(room,event);sync(room);return;
 }
 if(type==='pass'){
  if(!room.engine)return error(c,'Game has not started');
  const before=snapshot(current(room));const event=room.engine.pass(c.playerId);if(!event)return error(c,'Not your turn');event.impact=impact(before,current(room));emitEvent(room,event);sync(room);return;
 }
 if(type==='bid'){
  if(!room.engine)return error(c,'Game has not started');
  const before=snapshot(current(room));const event=room.engine.bid(c.playerId,msg.amount);if(!event)return error(c,'Invalid bid');event.impact=impact(before,current(room));emitEvent(room,event);sync(room);return;
 }
 if(type==='leave'){
  // A voluntary departure releases the lobby seat or retires the game seat.
  room.voiceMembers?.delete(c.playerId);broadcastVoice(room);
  const oldId=c.playerId;
  if(room.engine){
   const ev=room.engine.resign(oldId);if(ev)emitEvent(room,ev);
   room.players[oldId].online=false;
  }else{
   room.players.splice(oldId,1);
   if(room.players.length){
    room.host=room.host===oldId?0:room.host>oldId?room.host-1:room.host;
    for(const peer of clients)if(peer!==c&&peer.code===room.code&&peer.playerId!==null){
     if(peer.playerId>oldId){peer.playerId--;send(peer,{type:'seat',playerId:peer.playerId});}
    }
    room.voiceMembers=new Set([...room.voiceMembers||[]].filter(id=>id!==oldId).map(id=>id>oldId?id-1:id));
   }
  }
  c.code=null;c.playerId=null;c.token=null;
  send(c,{type:'left'});
  if(!room.players.length)rooms.delete(room.code);
  else{broadcastVoice(room);sync(room);}
  return;
 }
 if(type==='chat'){
  const now=Date.now();if(now-(c.lastChat||0)<650)return error(c,'Please slow down');
  const body=clean(msg.body,350);if(!body)return;c.lastChat=now;
  const item={id:hex().slice(0,10),player:c.playerId,body,time:now};room.chat.push(item);if(room.chat.length>70)room.chat.shift();broadcast(room,{type:'chat',chat:item});scheduleSave();return;
 }
 if(type==='signal'){
  // WebRTC voice signaling only, no server audio processing.
  const id=msg.to;if(!Number.isInteger(id)||id<0||id>=room.players.length||id===c.playerId)return;
  const signal=msg.signal;if(!signal||typeof signal!=='object'||JSON.stringify(signal).length>12000)return;
  for(const t of clients)if(t.code===room.code&&t.playerId===id)send(t,{type:'signal',from:c.playerId,signal});return;
 }
 if(type==='voice-presence'){
  if(!room.voiceMembers)room.voiceMembers=new Set();
  if(msg.enabled)room.voiceMembers.add(c.playerId);else room.voiceMembers.delete(c.playerId);
  broadcastVoice(room);return;
 }
}
function disconnect(c){clients.delete(c);if(!c.code||c.playerId===null)return;const room=rooms.get(c.code);if(!room)return;const still=[...clients].some(x=>x.code===room.code&&x.playerId===c.playerId);if(!still){room.players[c.playerId].online=false;room.voiceMembers?.delete(c.playerId);broadcastVoice(room);sync(room);}}
function consume(c,buf){c.buffer=Buffer.concat([c.buffer,buf]);while(c.buffer.length>=2){const b=c.buffer;const op=b[0]&15;let n=b[1]&127;const masked=!!(b[1]&128);if(!masked){c.socket.destroy();return;}let off=2;if(n===126){if(b.length<4)return;n=b.readUInt16BE(2);off=4}else if(n===127){if(b.length<10)return;const big=b.readBigUInt64BE(2);if(big>65536n){c.socket.destroy();return;}n=Number(big);off=10;}if(n>65536){c.socket.destroy();return;}if(b.length<off+4+n)return;const mask=b.subarray(off,off+4),data=Buffer.from(b.subarray(off+4,off+4+n));for(let i=0;i<n;i++)data[i]^=mask[i%4];c.buffer=b.subarray(off+4+n);if(op===8){c.socket.end();return;}if(op===9){control(c,10,data);continue;}if(op===10){c.pong=Date.now();continue;}if(op!==1){c.socket.destroy();return;}let obj;try{obj=JSON.parse(data.toString('utf8'))}catch{error(c,'Invalid JSON');continue;}try{handle(c,obj)}catch(err){console.error('action error',err);error(c,'Server error')}}}
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400).end();return;}
 if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'}).end('{"ok":true}');return;}
 const requestFile=url.pathname==='/'?'/index.html':url.pathname;
 const file=path.resolve(DIR,'.'+decodeURIComponent(requestFile));if(!file.startsWith(DIR+path.sep)){res.writeHead(403).end('Forbidden');return;}
 fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404).end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.html')?'no-store':'public, max-age=86400','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
 if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
 });
});
server.on('upgrade',(req,socket,head)=>{
 let u;try{u=new URL(req.url,'http://localhost')}catch{socket.destroy();return;}
 if(u.pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return;}
 const origin=req.headers.origin; // check same-origin in production; host based, supports reverse proxy forwarded host
 if(origin){try{const from=new URL(origin),host=req.headers['x-forwarded-host']||req.headers.host;if(from.host!==host){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}}catch{socket.destroy();return;}}
 const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const c={socket,code:null,playerId:null,token:null,buffer:Buffer.alloc(0),pong:Date.now()};clients.add(c);
 socket.on('data',data=>consume(c,data));socket.on('error',()=>{});socket.on('close',()=>disconnect(c));if(head.length)consume(c,head);
});
// Free platform disks may be ephemeral; local persistence is best-effort only.
function snapshots(){return [...rooms.values()].map(r=>({code:r.code,host:r.host,players:r.players.map(p=>({...p,online:false})),chat:r.chat,events:r.events||[],touched:r.touched,eventId:r.eventId,state:current(r)}));}
function save(){try{fs.mkdirSync(path.dirname(STORE),{recursive:true});const data=snapshots();fs.writeFileSync(STORE+'.tmp',JSON.stringify(data));fs.renameSync(STORE+'.tmp',STORE);if(cloud.enabled)cloud.save(data).catch(e=>console.error('cloud save:',e.message))}catch(e){console.error('save:',e.message)}}
let saveTimer=null;
function scheduleSave(){if(saveTimer)return;saveTimer=setTimeout(()=>{saveTimer=null;save()},2600);saveTimer.unref();}
try{const restored=JSON.parse(fs.readFileSync(STORE,'utf8'));for(const r of restored){const eng=r.state?createEngine(r.state):null;rooms.set(r.code,{code:r.code,host:r.host,players:r.players,chat:r.chat||[],eventId:r.eventId||0,events:r.events||[],touched:r.touched,engine:eng,voiceMembers:new Set()});}console.log(`restored ${rooms.size} rooms`);}catch{}
setInterval(()=>{const now=Date.now();for(const [code,r] of rooms)if(now-r.touched>24*3600*1000&&!r.players.some(p=>p.online))rooms.delete(code);save();for(const c of clients){if(now-c.pong>85000){c.socket.destroy();continue;}control(c,9,Buffer.from('ping'));}},30000).unref();
(async()=>{if(cloud.enabled){try{const saved=await cloud.load();for(const r of saved||[]){if(Date.now()-(r.touched||0)>24*3600*1000)continue;const prior=rooms.get(r.code);if(prior&&(prior.touched||0)>=(r.touched||0))continue;const engine=r.state?createEngine(r.state):null;rooms.set(r.code,{code:r.code,host:r.host,players:r.players.map(p=>({...p,online:false})),chat:r.chat||[],eventId:r.eventId||0,events:r.events||[],touched:r.touched,engine,voiceMembers:new Set()});}console.log(`Cloud persistence: restored ${saved?.length||0} rooms`)}catch(err){console.error('Cloud persistence unavailable:',err.message)}}
 server.listen(PORT,'0.0.0.0',()=>console.log(`BASCULE Online listening at http://localhost:${PORT}`));})();
function shutdown(){save();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1200).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
