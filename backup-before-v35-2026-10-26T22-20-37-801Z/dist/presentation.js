/* Pure presentation helpers. Server state remains authoritative. */
(function(root){'use strict';
const decodePacket=typeof module!=='undefined'&&module.exports?require('./transport.js').decode:root.FrontlineTransport.decode;
const armorTier=n=>['0','I','II','III'][n]??String(n);
function structureLabel(u,name){return name(u.team)+' · '+(u.kind==='base'?'БАЗА':u.kind==='tower'?u.number:'ТУРЕЛЬ')+' · '+armorTier(u.armor);}
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function blend(a,b,t){if(!a||a.id!==b.id||Math.hypot(b.x-a.x,b.y-a.y)>160||a.hp<=0||b.hp<=0)return b;const out={...b};for(const k of ['x','y'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=a[k]+(b[k]-a[k])*t;for(const k of ['angle','turret'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=angle(a[k],b[k],t);if(b.guns)out.guns=b.guns.map((g,i)=>({...g,angle:a.guns?.[i]?angle(a.guns[i].angle,g.angle,t):g.angle}));return out;}
// Visual geometry only: authoritative visibility remains in the shared game engine.
const sightRays=Array.from({length:181},(_,i)=>({x:Math.cos(i/180*Math.PI*2),y:Math.sin(i/180*Math.PI*2)}));
class VisionMeshes {
 constructor(){this.cache=new Map();this.revision='';this.epoch=null;}
 polygons(state,now,viewport){
  const epoch=state.me.team+':'+state.me.tank.id;
  if(this.epoch!==epoch||state.time<this.time){this.cache.clear();this.epoch=epoch;}
  this.time=state.time;
  const blockers=[...(state.covers||[]),...state.smokes.filter(f=>f.density*Math.min(f.age/2,1)>=(f.threshold??1.2))];
  const revision=blockers.map(b=>b.x+','+b.y+','+b.r).join(';');
  // A new smoke screen or a different map must not retain the old open mask.
  if(revision!==this.revision){this.cache.clear();this.revision=revision;}
  const result=[],alive=new Set();
  for(const u of state.vision||[]){
   alive.add(u.id);
   if(viewport&&(u.x+u.vision<viewport.x||u.x-u.vision>viewport.right||u.y+u.vision<viewport.y||u.y-u.vision>viewport.bottom))continue;
   let entry=this.cache.get(u.id);
   const fresh=!entry||entry.vision!==u.vision||entry.r!==u.r||Math.hypot(u.x-entry.x,u.y-entry.y)>120||now-entry.lastFrame>250;
   if(fresh)entry={x:u.x,y:u.y,vision:u.vision,r:u.r,at:-Infinity,lastFrame:now,circle:true};
   const moved=entry.x!==u.x||entry.y!==u.y;
   if(fresh||(moved&&(u.id===state.me.tank.id||now-entry.at>=50))){
    const near=blockers.filter(b=>{const x=b.x-u.x,y=b.y-u.y,r=u.vision+b.r;return x*x+y*y<=r*r;});
    const target=near.length?sightRays.map(d=>{
     let ray=u.vision;
     for(const f of near){
      const ox=u.x-f.x,oy=u.y-f.y,C=ox*ox+oy*oy-f.r*f.r;
      if(C<=0){ray=Math.min(ray,u.r+5);continue;}
      const B=ox*d.x+oy*d.y,disc=B*B-C;
      if(disc>=0){const t=-B-Math.sqrt(disc);if(t>=0)ray=Math.min(ray,t);}
     }
     return ray;
    }):null;
    entry.targetCircle=!target;
    if(target||!entry.circle){
     entry.target=target||sightRays.map(()=>u.vision);
     if(fresh)entry.shown=entry.target.slice();
     else if(entry.circle)entry.shown=sightRays.map(()=>u.vision);
     entry.points=entry.points||sightRays.map(()=>({x:0,y:0}));
     entry.circle=false;entry.settled=false;
    }
    entry.x=u.x;entry.y=u.y;entry.at=now;
   }
   const elapsed=Math.max(0,Math.min(50,now-entry.lastFrame)),blend=1-Math.exp(-elapsed/65);
   entry.lastFrame=now;
   if(!entry.circle&&!entry.settled){
    let settled=true;
    for(let i=0;i<sightRays.length;i++){
     const difference=entry.target[i]-entry.shown[i];
     if(Math.abs(difference)>.02){entry.shown[i]+=difference*blend;settled=false;}else entry.shown[i]=entry.target[i];
     entry.points[i].x=sightRays[i].x*entry.shown[i];entry.points[i].y=sightRays[i].y*entry.shown[i];
    }
    entry.settled=settled;
    if(entry.targetCircle&&settled){entry.circle=true;entry.target=null;entry.shown=null;entry.points=null;}
   }
   this.cache.set(u.id,entry);
   result.push(entry.circle?{x:u.x,y:u.y,radius:u.vision}:{x:u.x,y:u.y,points:entry.points});
  }
  for(const id of this.cache.keys())if(!alive.has(id))this.cache.delete(id);
  return result;
 }
}
class TowCamera{
 constructor(){this.owner=null;this.following=false;this.returning=false;this.center=null;}
 update(state,dt){const owner=state.me.tank.id,tank=state.me.tank;if(this.owner!==owner||state.selection?.active){this.owner=owner;this.following=false;this.returning=false;this.center={x:tank.x,y:tank.y};}const missile=state.shots.find(s=>s.ammo==='TOW'&&s.owner===owner&&!s.pending&&s.guiding!==false);if(missile){this.center={x:missile.x,y:missile.y};this.following=true;this.returning=false;}else if(this.following){this.following=false;this.returning=true;}if(this.returning){const k=1-Math.exp(-5*Math.min(.1,Math.max(0,dt)));this.center.x+=(tank.x-this.center.x)*k;this.center.y+=(tank.y-this.center.y)*k;if(Math.hypot(tank.x-this.center.x,tank.y-this.center.y)<1)this.returning=false;}if(!missile&&!this.returning)this.center={x:tank.x,y:tank.y};return {...this.center,locked:!!missile||this.returning};}
}
class NetworkView{
 constructor({delay=0.1}={}){this.delay=delay;this.frames=[];this.latest=null;this.renderTime=null;}
 reset(state,now){this.frames=[];this.latest=null;this.renderTime=null;this.push(state,now);}
 push(packet,now){const state={...this.latest,...decodePacket(packet,this.latest)};if(!Number.isFinite(state.time))return;if(this.latest&&(state.time<this.latest.time||state.me.tank.id!==this.latest.me.tank.id||!!state.over!==!!this.latest.over)){this.frames=[];this.renderTime=null;}this.latest=state;const frame={state,received:now,entities:new Map(state.entities.map(u=>[u.id,u])),shots:new Map(state.shots.map(u=>[u.id,u]))};if(this.frames.at(-1)?.state.time===state.time)this.frames[this.frames.length-1]=frame;else this.frames.push(frame);while(this.frames.length>32)this.frames.shift();}
 sample(now){const latest=this.latest;if(!latest||latest.paused||latest.over||this.frames.length<2)return latest;const last=this.frames.at(-1),time=Math.min(last.state.time,last.state.time+Math.max(0,now-last.received)/1000-this.delay);this.renderTime=Math.min(last.state.time,Math.max(this.renderTime??time,time));const renderTime=this.renderTime;let a=this.frames[0],b=a;for(const f of this.frames){if(f.state.time<=renderTime)a=f;if(f.state.time>=renderTime){b=f;break;}b=f;}
 const t=a===b?1:Math.max(0,Math.min(1,(renderTime-a.state.time)/(b.state.time-a.state.time))),before=a.entities,after=b.entities;
 const entities=latest.entities.map(u=>{const v=after.get(u.id);if(!v)return u;const g=blend(before.get(u.id),v,t);return {...u,x:g.x,y:g.y,angle:g.angle,turret:g.turret,guns:u.guns?.map((gun,i)=>({...gun,angle:g.guns?.[i]?.angle??gun.angle}))};});
 const shotsBefore=a.shots,shotsAfter=b.shots;const shots=latest.shots.filter(u=>u.createdAt===undefined||u.createdAt<=renderTime).map(u=>shotsAfter.has(u.id)?blend(shotsBefore.get(u.id),shotsAfter.get(u.id),t):u);
 const positions=new Map(entities.map(u=>[u.id,u])),tank=positions.get(latest.me.tank.id)||latest.me.tank;
 const vision=latest.vision.map(v=>{const p=positions.get(v.id);return p?{...v,x:p.x,y:p.y}:v;});
 return {...latest,entities,shots,vision,me:{...latest.me,tank:{...latest.me.tank,x:tank.x,y:tank.y,angle:tank.angle,turret:tank.turret}}};
 }
}
function announcementText(e,viewer,name){const own=e.team===viewer;switch(e.kind){case 'level':return 'НОВЫЙ УРОВЕНЬ — '+e.level;case 'centralSpawn':return 'НЕЙТРАЛЬНАЯ ТУРЕЛЬ FIA ПОЯВИЛАСЬ';case 'centralDestroyed':return e.team===-1?'НЕЙТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':own?'ВАША ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':'ВРАЖЕСКАЯ ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА';case 'centralCaptured':return (own?'ВАША КОМАНДА':'КОМАНДА '+name(e.team))+' ЗАХВАТИЛА ЦЕНТР';case 'towerDestroyed':return (own?'СОЮЗНАЯ':'ВРАЖЕСКАЯ')+' БАШНЯ '+e.number+' УНИЧТОЖЕНА · '+(e.lane?'НИЖНЯЯ':'ВЕРХНЯЯ')+' ЛИНИЯ';case 'tankKill':return own?'ВРАЖЕСКИЙ ТАНК УНИЧТОЖЕН · +'+e.reward+' XP':'ВАШ ТАНК УНИЧТОЖЕН';default:return '';}}
function captureRadius(progress,duration,radius){return radius*Math.sqrt(Math.max(0,Math.min(1,progress/duration)));}
function repairProgress(r,time){if(!r)return 0;const clamp=v=>Math.max(0,Math.min(1,v)),warmup=Math.max(.001,r.warmup??5);if(r.cancelAt!==null&&r.cancelAt!==undefined){const start=r.cancelStarted??r.cancelAt-2,from=r.cancelProgress??clamp((start-r.started)/warmup),duration=r.cancelAt-start;return duration<=0?0:from*clamp((r.cancelAt-time)/duration);}return clamp((time-r.started)/warmup);}
const api={VisionMeshes,TowCamera,repairProgress,announcementText,captureRadius,armorTier,structureLabel,NetworkView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontlinePresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
