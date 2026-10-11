'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os');const path=require('node:path');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
class Peer{
 constructor(url){this.ws=new WebSocket(url);this.messages=[];this.waiters=[];this.ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);this.messages.push(msg);for(const w of [...this.waiters])if(w.filter(msg)){clearTimeout(w.timer);this.waiters.splice(this.waiters.indexOf(w),1);w.resolve(msg)}})}
 async ready(){if(this.ws.readyState===WebSocket.OPEN)return;await new Promise((ok,no)=>{this.ws.addEventListener('open',ok,{once:true});this.ws.addEventListener('error',no,{once:true})})}
 send(msg){this.ws.send(JSON.stringify(msg))}
 wait(filter,timeout=3300){const m=this.messages.find(filter);if(m)return Promise.resolve(m);return new Promise((resolve,reject)=>{const w={filter,resolve,timer:null};w.timer=setTimeout(()=>{this.waiters.splice(this.waiters.indexOf(w),1);reject(new Error('WebSocket message timeout'))},timeout);this.waiters.push(w)})}
 close(){this.ws.close()}
}
test('two browsers: create, join, chat, move sync, reject illegal move and reconnect',async()=>{
 const port=38000+Math.floor(Math.random()*2000),folder=mkdtempSync(path.join(os.tmpdir(),'bascule-test-'));
 const proc=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_FILE:path.join(folder,'rooms.json')},stdio:'ignore'});
 let a,b,rejoined;
 try{
  for(let j=0;j<50;j++){try{const r=await fetch(`http://127.0.0.1:${port}/healthz`);if(r.ok)break}catch{}await delay(90)}
  assert((await fetch(`http://127.0.0.1:${port}/healthz`)).ok);
  a=new Peer(`ws://127.0.0.1:${port}/ws`);await a.ready();a.send({type:'create',name:'Alice'});
  const joinedA=await a.wait(m=>m.type==='joined');assert.equal(joinedA.playerId,0);const room=joinedA.code;
  b=new Peer(`ws://127.0.0.1:${port}/ws`);await b.ready();b.send({type:'join',code:room,name:'Bob'});
  assert.equal((await b.wait(m=>m.type==='joined')).playerId,1);
  const inLobby=await a.wait(m=>m.type==='state'&&m.players.length===2);assert.equal(inLobby.players[1].name,'Bob');
  a.send({type:'start'});const began=await b.wait(m=>m.type==='state'&&m.phase==='playing');assert.equal(began.game.round,1);
  b.send({type:'action',action:'gather',info:{k:'m'}});
  assert.match((await b.wait(m=>m.type==='error')).message,/not allowed/i);
  a.send({type:'action',action:'gather',info:{k:'m'}});
  const update=await b.wait(m=>m.type==='state'&&m.phase==='playing'&&m.game.players[0].r.m>3);
  assert.equal(update.game.players[0].actions,2);
  const event=await b.wait(m=>m.type==='event'&&m.event.kind==='gather');assert(event.event.impact.some(d=>d.player===0&&d.r.m>0));
  a.send({type:'chat',body:'Bonjour Bob 🌿'});
  assert.equal((await b.wait(m=>m.type==='chat')).chat.body,'Bonjour Bob 🌿');
  b.send({type:'signal',to:0,signal:{kind:'voice-ready'}});
  assert.equal((await a.wait(m=>m.type==='signal')).signal.kind,'voice-ready');
  a.close();await delay(110);
  rejoined=new Peer(`ws://127.0.0.1:${port}/ws`);await rejoined.ready();rejoined.send({type:'join',code:room,token:joinedA.token});
  assert.equal((await rejoined.wait(m=>m.type==='joined')).playerId,0);
  const restored=await rejoined.wait(m=>m.type==='state'&&m.phase==='playing');
  assert.equal(restored.game.players[0].r.m,update.game.players[0].r.m);
  assert(restored.events.some(e=>e.event.kind==='gather'));
 }finally{a?.close();b?.close();rejoined?.close();proc.kill('SIGTERM');await delay(150);rmSync(folder,{recursive:true,force:true})}
});
test('voluntary leave: lobby seat released, player seat shifted, voice presence synchronized',async()=>{
 const port=39700+Math.floor(Math.random()*200),folder=mkdtempSync(path.join(os.tmpdir(),'bascule-leave-'));
 const proc=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_FILE:path.join(folder,'rooms.json')},stdio:'ignore'});
 let a,b,c;
 try{
  for(let j=0;j<40;j++){try{if((await fetch(`http://127.0.0.1:${port}/healthz`)).ok)break}catch{}await delay(70)}
  a=new Peer(`ws://127.0.0.1:${port}/ws`);await a.ready();a.send({type:'create',name:'Alice'});const join=await a.wait(m=>m.type==='joined');
  b=new Peer(`ws://127.0.0.1:${port}/ws`);await b.ready();b.send({type:'join',name:'Bob',code:join.code});await b.wait(m=>m.type==='joined');
  c=new Peer(`ws://127.0.0.1:${port}/ws`);await c.ready();c.send({type:'join',name:'Cara',code:join.code});await c.wait(m=>m.type==='joined');
  a.send({type:'voice-presence',enabled:true});b.send({type:'voice-presence',enabled:true});
  const members=await c.wait(m=>m.type==='voice-members'&&m.members.length===2);assert.deepEqual(members.members.sort(),[0,1]);
  b.send({type:'leave'});await b.wait(m=>m.type==='left');
  const shifted=await c.wait(m=>m.type==='seat'&&m.playerId===1);assert.equal(shifted.playerId,1);
  const reduced=await a.wait(m=>m.type==='state'&&m.players.length===2&&m.players[1].name==='Cara');assert.equal(reduced.players[1].name,'Cara');
  assert.deepEqual((await a.wait(m=>m.type==='voice-members'&&m.members.length===1)).members,[0]);
  a.send({type:'start'});assert.equal((await c.wait(m=>m.type==='state'&&m.phase==='playing')).game.players.length,2);
 }finally{a?.close();b?.close();c?.close();proc.kill('SIGTERM');await delay(110);rmSync(folder,{recursive:true,force:true})}
});
