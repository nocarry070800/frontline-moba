/* Pure presentation helpers. Server state remains authoritative. */
(function(root){'use strict';
const decodePacket=typeof module!=='undefined'&&module.exports?require('./transport.js').decode:root.FrontlineTransport.decode;
const armorTier=n=>['0','I','II','III'][n]??String(n);
function structureLabel(u,name){return name(u.team)+' · '+(u.kind==='base'?'БАЗА':u.kind==='tower'?u.number:'ТУРЕЛЬ')+' · '+armorTier(u.armor);}
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function blend(a,b,t){if(!a||a.id!==b.id||Math.hypot(b.x-a.x,b.y-a.y)>160||a.hp<=0||b.hp<=0)return b;const out={...b};for(const k of ['x','y','bank','pitch','travelled'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=a[k]+(b[k]-a[k])*t;for(const k of ['angle','turret'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=angle(a[k],b[k],t);if(b.guns)out.guns=b.guns.map((g,i)=>({...g,angle:a.guns?.[i]?angle(a.guns[i].angle,g.angle,t):g.angle}));return out;}
// Visual geometry only: authoritative visibility remains in the shared game engine.
const sightRays=Array.from({length:181},(_,i)=>({x:Math.cos(i/180*Math.PI*2),y:Math.sin(i/180*Math.PI*2)}));
class VisionMeshes {
 constructor(){this.cache=new Map();this.revision='';this.epoch=null;}
 polygons(state,now,viewport){
  const epoch=state.me.team+':'+state.me.tank.id;
  if(this.epoch!==epoch||state.time<this.time){this.cache.clear();this.epoch=epoch;}
  this.time=state.time;
  const denseSmoke=state.smokes.filter(f=>(f.charge?f.density:f.density*Math.min(f.age/2,1))>=(f.threshold??1.2)),blockers=[...(state.covers||[]),...denseSmoke];
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
    const near=(['apache','littlebird'].includes(u.vehicle)?denseSmoke:blockers).filter(b=>{const x=b.x-u.x,y=b.y-u.y,r=u.vision+b.r;return x*x+y*y<=r*r;});
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
 update(state,dt){const tank=state.me.tank;return {x:tank.x,y:tank.y,locked:false};}
}
class NetworkView{
 constructor({delay=0.1}={}){this.delay=delay;this.frames=[];this.latest=null;this.renderTime=null;}
 reset(state,now){this.frames=[];this.latest=null;this.renderTime=null;this.push(state,now);}
 push(packet,now){const state={...this.latest,...decodePacket(packet,this.latest)};if(!Number.isFinite(state.time))return;if(this.latest&&(state.time<this.latest.time||state.me.tank.id!==this.latest.me.tank.id||state.me.team!==this.latest.me.team||!!state.over!==!!this.latest.over)){this.frames=[];this.renderTime=null;}this.latest=state;const frame={state,received:now,entities:new Map(state.entities.map(u=>[u.id,u])),shots:new Map(state.shots.map(u=>[u.id,u]))};if(this.frames.at(-1)?.state.time===state.time)this.frames[this.frames.length-1]=frame;else this.frames.push(frame);while(this.frames.length>32)this.frames.shift();}
 sample(now){const latest=this.latest;if(!latest||latest.paused||latest.over||this.frames.length<2)return latest;const last=this.frames.at(-1),time=Math.min(last.state.time,last.state.time+Math.max(0,now-last.received)/1000-this.delay);this.renderTime=Math.min(last.state.time,Math.max(this.renderTime??time,time));const renderTime=this.renderTime;let a=this.frames[0],b=a;for(const f of this.frames){if(f.state.time<=renderTime)a=f;if(f.state.time>=renderTime){b=f;break;}b=f;}
 const t=a===b?1:Math.max(0,Math.min(1,(renderTime-a.state.time)/(b.state.time-a.state.time))),before=a.entities,after=b.entities;
 const entities=latest.entities.map(u=>{const v=after.get(u.id);if(!v)return u;const g=blend(before.get(u.id),v,t);const stamp=(renderTime>=b.state.time?v:before.get(u.id))||v;return {...u,x:g.x,y:g.y,angle:g.angle,turret:g.turret,bank:g.bank,pitch:g.pitch,fireTime:stamp.fireTime,fireAmmo:stamp.fireAmmo,fireAngle:stamp.fireAngle,fireSide:stamp.fireSide,guns:u.guns?.map((gun,i)=>({...gun,...stamp.guns?.[i],angle:g.guns?.[i]?.angle??gun.angle}))};});
 const shotsBefore=a.shots,shotsAfter=b.shots,available=new Map([...shotsBefore,...shotsAfter,...latest.shots.map(u=>[u.id,u])]);const shots=[...available.values()].filter(u=>(u.createdAt===undefined||u.createdAt<=renderTime)&&(shotsBefore.has(u.id)||shotsAfter.has(u.id))).map(u=>{const v=shotsAfter.get(u.id)||shotsBefore.get(u.id),g=blend(shotsBefore.get(u.id),v,t);if(g.artillery||g.ammo==='TOW'||g.ammo==='AirMissiles'||!Number.isFinite(g.muzzleX))return g;const back=Math.min(Math.max(0,g.travelled??0),(g.rangeSpeed??g.speed)*.05)*g.speed/(g.rangeSpeed??g.speed)*Math.max(0,1-Math.max(0,renderTime-(g.createdAt??renderTime))/.05),x=g.x-g.vx*back,y=g.y-g.vy*back;return {...g,x,y};});
 const positions=new Map(entities.map(u=>[u.id,u])),tank=positions.get(latest.me.tank.id)||latest.me.tank;
 const vision=latest.vision.map(v=>{const p=positions.get(v.id);return p?{...v,x:p.x,y:p.y}:v;});
 return {...latest,time:renderTime,entities,shots,vision,me:{...latest.me,tank:{...latest.me.tank,x:tank.x,y:tank.y,angle:tank.angle,turret:tank.turret}}};
 }
}
// Local presentation only. Damage, ammunition and collision damage remain server-owned.
class VehiclePrediction{
 constructor(Game){this.Game=Game;this.input=null;this.clear();}
 setInput(cmd,now,id){const old=this.input,changed=!old||old.id!==id||old.dx!==cmd.dx||old.dy!==cmd.dy||Math.abs(Math.atan2(Math.sin((old.changedAngle??old.aimAngle??0)-(cmd.aimAngle??0)),Math.cos((old.aimAngle??0)-(cmd.aimAngle??0))))>.04;this.input={...cmd,now,id,changedSeq:changed?cmd.inputSeq:old.changedSeq,changedAngle:changed?cmd.aimAngle:old.changedAngle};}
 clear(){this.player=null;this.lastNow=null;this.epoch=null;this.flashAt=-Infinity;this.nextFlashAt=0;this.miniAt=null;this.localShotsUsed=false;this.shotSim=null;this.visualVolley=null;this.visualBulletCount=null;this.visualShotId=0;}
 clone(p){return {...p,tank:{...p.tank},skills:{...p.skills},skillState:{...p.skillState},statRanks:{...p.statRanks},stocks:Object.fromEntries(Object.entries(p.stocks||{}).map(([k,v])=>[k,{...v}])),cannon:p.cannon?{...p.cannon}:null,manual:p.manual?{...p.manual}:null,repair:p.repair?{...p.repair}:null};}
 world(sim,p,state){sim.airCollision=()=>{};sim.damage=()=>{};sim.damageCore=()=>{};sim.players=[p,...state.entities.filter(u=>u.kind==='tank'&&u.id!==p.tank.id).map(u=>({id:-u.id,tank:{...u},vehicle:u.vehicle,team:u.team,enabled:true,sideChosen:true,skills:{},skillState:{},weapon:'AP'}))];sim.units=state.entities.filter(u=>u.kind==='infantry').map(u=>({...u}));sim.covers=(state.covers||[]).map(u=>({...u}));sim.structures=state.entities.filter(u=>['tower','turret','base'].includes(u.kind)).map(u=>({...u,guns:u.guns?.map(g=>({...g}))}));sim.bushes=state.bushes||[];sim.smokes=state.smokes||[];sim.time=state.time;sim.over=null;}
 move(p,input,dt,state){if(!(dt>0))return;const sim=this.sim||(this.sim=new this.Game({requireSelection:true}));this.world(sim,p,state);sim.shots=state.shots.map(s=>({...s}));const steps=Math.max(1,Math.ceil(dt/.016));for(let i=0;i<steps;i++){sim.time+=dt/steps;p.manual={...input,fire:false,at:sim.time};const speed=p.tank.speed;if(p.lbEscapeUntil>sim.time)p.tank.speed*=1+(p.skills?.lbEscape?.percent??0)/100;sim.updateManual(p,dt/steps);p.tank.speed=speed;}}
 ready(auth,input,state){if(!input.fire||auth.stunnedUntil>state.time||auth.repair||auth.barrage||auth.switchLeft>0)return false;const w=auth.weapon;if(auth.vehicle==='artillery'&&['AP','HE'].includes(w)&&(auth.moving||(auth.skillState?.still??0)<(auth.skills?.arPrepare?.seconds??state.balance.artillery.ballistics.prepareSeconds)))return false;if(['AP','HE'].includes(w)&&auth.cannon?.loaded!==w)return false;if(auth.vehicle==='bradley'&&w==='HE'&&auth.heFuel<(state.balance.bradley.heReserve.costPerShot))return false;if(auth.vehicle==='littlebird'&&w==='ChainGun'&&auth.minigunFuel<state.balance.littlebird.minigunReserve.costPerShot*(1-(auth.skills?.lbEconomy?.percent??0)/100))return false;return !['TOW','AirMissiles','Smoke'].includes(w);}
 miniguns(state,auth,visual,input,now,dt,fresh){const enabled=auth.vehicle==='littlebird',active=enabled&&auth.weapon==='ChainGun'&&fresh&&this.ready(auth,input,state);if(!enabled)return null;const p=this.clone(auth);p.tank={...visual,cd:0};p.manual={...input,fire:false,at:state.time};const sim=this.shotSim||(active?(this.shotSim=new this.Game({requireSelection:true})):null);if(!sim)return null;this.world(sim,p,state);for(const e of sim.effects)e.life-=dt;sim.effects=sim.effects.filter(e=>e.life>0);if(dt>0)sim.projectiles(dt);
 if(active){const interval=state.balance.littlebird.weapons.ChainGun.interval/Math.max(.01,auth.attackSpeed)*1000;if(this.miniAt===null)this.miniAt=now;let count=0;while(now+1e-6>=this.miniAt&&count++<8){p.minigunVolley=this.visualVolley??auth.minigunVolley??0;p.lbBulletCount=this.visualBulletCount??auth.lbBulletCount??0;p.tank.cd=0;p.fireOvershoot=0;const n=sim.shots.length;this.Game.prototype.fire.call(sim,p.tank,{kind:'ground',team:1-p.team,armor:0,x:p.tank.x+Math.cos(p.tank.angle)*1000,y:p.tank.y+Math.sin(p.tank.angle)*1000});if(sim.shots.length===n){this.miniAt=now+interval;break;}this.visualVolley=p.minigunVolley;this.visualBulletCount=p.lbBulletCount;for(const shot of sim.shots.slice(n))shot.id=-(++this.visualShotId);this.localShotsUsed=true;this.flashAt=now;this.flashAmmo='ChainGun';this.miniAt+=interval;} }else{if(this.miniAt!==null)this.miniAt=Math.max(this.miniAt,now);}
 return {shots:sim.shots.map(s=>({...s,localVisual:true})),effects:sim.effects.filter(e=>e.kind==='bulletDirt').map(e=>({...e,localVisual:true}))};}
 apply(state,net,now,rtt=0){const latest=net.latest;if(!latest||!['tank','bradley','artillery','littlebird','apache'].includes(latest.me.vehicle)||latest.selection?.active||latest.spectator||latest.paused||latest.over||latest.me.tank.hp<=0||latest.me.dead){this.clear();return state;}const auth=latest.me,epoch=auth.id+':'+auth.tank.id+':'+auth.team,received=net.frames.at(-1)?.received??now,fresh=now-received<400,input=this.input?.id===auth.tank.id&&now-this.input.now<400?this.input:auth.manual||{dx:0,dy:0,aimAngle:auth.tank.turret??auth.tank.angle,aimDistance:300};let dt=this.lastNow===null?0:Math.min(.05,Math.max(0,(now-this.lastNow)/1000));this.lastNow=now;
 if(this.epoch!==epoch||!this.player){this.clear();this.player=this.clone(auth);this.epoch=epoch;this.lastNow=now;dt=0;}const p=this.player,old={...p.tank};Object.assign(p,{...auth,tank:p.tank,manual:p.manual,skillState:p.skillState});Object.assign(p.tank,{...auth.tank,x:old.x,y:old.y,angle:old.angle,turret:old.turret,airVelocityX:old.airVelocityX,airVelocityY:old.airVelocityY,airSpeed:old.airSpeed,airTravelAngle:old.airTravelAngle});
 if(fresh&&auth.stunnedUntil<=latest.time&&!auth.repair)this.move(p,input,dt,latest);
 const canCorrect=!this.input||this.input.id!==auth.tank.id||(auth.controlSeq??0)>=(input.changedSeq??input.inputSeq??0),lead=Math.min(.12,Math.max(0,(now-received)/1000)+Math.max(0,rtt)/2000),goal=this.clone(auth);if(canCorrect&&fresh){if(!auth.repair&&auth.stunnedUntil<=latest.time)this.move(goal,input,lead,latest);const dx=goal.tank.x-p.tank.x,dy=goal.tank.y-p.tank.y;if(Math.hypot(dx,dy)>120){Object.assign(p.tank,goal.tank);}else{const factor=1-Math.exp(-dt/.12),x=p.tank.x+dx*factor,y=p.tank.y+dy*factor;if(this.sim?.free(p.tank,x,y)){p.tank.x=x;p.tank.y=y;}p.tank.angle=angle(p.tank.angle,goal.tank.angle,factor);p.tank.turret=angle(p.tank.turret,goal.tank.turret,factor);}}
 const visual={...p.tank},weapon=auth.weapon,cfg=auth.vehicle==='tank'?state.balance.weapons?.[weapon]:state.balance[auth.vehicle]?.weapons?.[weapon],local=this.miniguns(latest,auth,visual,input,now,dt,fresh);
 if(!(auth.vehicle==='littlebird'&&weapon==='ChainGun')&&cfg&&fresh&&this.ready(auth,input,latest)){const interval=cfg.interval/Math.max(.01,auth.attackSpeed)*1000;if(now>=this.nextFlashAt){this.flashAt=now;this.flashAmmo=weapon;this.nextFlashAt=now+interval;}}if(now-this.flashAt<200){visual.fireTime=state.time-(now-this.flashAt)/1000;visual.fireAmmo=this.flashAmmo;visual.fireAngle=visual.turret;}
 const ownedMini=s=>s.owner===visual.id&&s.ammo==='ChainGun'&&auth.vehicle==='littlebird';const shots=state.shots.filter(s=>!this.localShotsUsed||!ownedMini(s));if(local&&this.localShotsUsed)shots.push(...local.shots);const effects=state.effects.filter(e=>!(this.localShotsUsed&&e.owner===visual.id&&e.kind==='bulletDirt'));if(local&&this.localShotsUsed)effects.push(...local.effects);
 return {...state,shots,effects,entities:state.entities.map(u=>u.id===visual.id?{...u,...visual}:u),me:{...state.me,tank:{...state.me.tank,...visual}}};
 }
}
const HelicopterPrediction=VehiclePrediction;

function announcementText(e,viewer,name,playerId){const own=e.team===viewer;switch(e.kind){case 'level':return 'НОВЫЙ УРОВЕНЬ — '+e.level;case 'centralSpawn':return 'НЕЙТРАЛЬНАЯ ТУРЕЛЬ FIA ПОЯВИЛАСЬ';case 'sideTurretCaptured':return (own?'ТУРЕЛЬ ЗАХВАЧЕНА':'ПРОТИВНИК ЗАХВАТИЛ ТУРЕЛЬ')+' · БОНУС К ВОЛНАМ '+e.count+'/2';case 'sideTurretSpawn':return 'НЕЙТРАЛЬНАЯ ТУРЕЛЬ ВОЗРОДИЛАСЬ';case 'sideTurretDestroyed':return e.team===-1?'НЕЙТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':own?'ВАША ТУРЕЛЬ УНИЧТОЖЕНА':'ВРАЖЕСКАЯ ТУРЕЛЬ УНИЧТОЖЕНА';case 'centralDestroyed':return e.team===-1?'НЕЙТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':own?'ВАША ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':'ВРАЖЕСКАЯ ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА';case 'pointAvailable':return 'ЦЕНТРАЛЬНАЯ ТОЧКА ДОСТУПНА';case 'pointCaptured':return (own?'ЦЕНТР ЗАХВАЧЕН':'ПРОТИВНИК ЗАХВАТИЛ ЦЕНТР')+' · '+(own?'+'+e.reward+' XP · ':'')+'ОБЗОР ЦЕНТРА КАРТЫ НА 60 С';case 'centralCaptured':return (own?'ВАША КОМАНДА':'КОМАНДА '+name(e.team))+' ЗАХВАТИЛА ЦЕНТР';case 'towerDestroyed':return (own?'СОЮЗНАЯ':'ВРАЖЕСКАЯ')+' БАШНЯ '+e.number+' УНИЧТОЖЕНА · '+(e.lane?'НИЖНЯЯ':'ВЕРХНЯЯ')+' ЛИНИЯ';case 'tankKill':return own?'ВРАЖЕСКАЯ ТЕХНИКА УНИЧТОЖЕНА · +'+(e.killer===undefined||playerId===undefined||e.killer===playerId?e.reward:e.sharedReward??e.reward)+' XP':'ВАШ ТАНК УНИЧТОЖЕН';default:return '';}}
function captureRadius(progress,duration,radius){return radius*Math.sqrt(Math.max(0,Math.min(1,progress/duration)));}
function repairProgress(r,time){if(!r)return 0;const clamp=v=>Math.max(0,Math.min(1,v)),warmup=Math.max(.001,r.warmup??5);if(r.cancelAt!==null&&r.cancelAt!==undefined){const start=r.cancelStarted??r.cancelAt-2,from=r.cancelProgress??clamp((start-r.started)/warmup),duration=r.cancelAt-start;return duration<=0?0:from*clamp((r.cancelAt-time)/duration);}return clamp((time-r.started)/warmup);}
// Pure visual impulse: no displacement of simulation units or collision shapes.
function artilleryBarrelRecoil(u,time,config={}){if(u.vehicle!=='artillery'||!['AP','HE'].includes(u.fireAmmo))return 0;const age=time-u.fireTime,kick=config.kickSeconds??.04,restore=config.returnSeconds??.65;if(!Number.isFinite(age)||age<0||age>kick+restore)return 0;const amount=age<kick?age/Math.max(.001,kick):(1-(age-kick)/Math.max(.001,restore))**2;return (config.distance??24)*amount;}
function recoilPose(u,time){
 const age=time-u.fireTime,rocket=['Missiles','AirMissiles','Barrage'].includes(u.fireAmmo);
 if(!Number.isFinite(age)||age<0||age>.8||u.hp<=0||u.fireAmmo==='TOW'||(['apache','littlebird'].includes(u.vehicle)&&!rocket))return {x:0,y:0,barrel:0,pitch:0};
 const kick=age<.035?age/.035:Math.exp(-(age-.035)/.13),angle=u.fireAngle??u.turret??u.angle;
 const body=u.fireAmmo==='MG'?0:['apache','littlebird'].includes(u.vehicle)?4.5:u.vehicle==='bradley'?0:.8;
 return {x:-Math.cos(angle)*body*kick,y:-Math.sin(angle)*body*kick,barrel:u.fireAmmo==='MG'?0:(u.vehicle==='bradley'?3:11)*kick,mgBarrel:u.fireAmmo==='MG'?kick:0,pitch:['apache','littlebird'].includes(u.vehicle)?-.35*kick:0};
}
function screenShake(events,time,duration=.28){let x=0,y=0;if(!Number.isFinite(time))return {x:0,y:0};for(const e of Array.isArray(events)?events:[]){if(!e||typeof e!=='object')continue;const life=e.duration??duration;if(!Number.isFinite(e.time)||!Number.isFinite(e.strength)||!Number.isFinite(life)||life<=0)continue;const age=time-e.time;if(age<0||age>=life)continue;const strength=Math.max(0,Math.min(20,e.strength))*(1-age/life)**2,phase=((Number.isFinite(e.id)?e.id:0)%97)*1.7;x+=Math.cos(age*115+phase)*strength;y+=Math.sin(age*139+phase)*strength*.65;}const cap=4;return {x:Math.max(-cap,Math.min(cap,x)),y:Math.max(-cap,Math.min(cap,y))};}

function renderSize(width,height,dpr=1,fullscreen=false){if(!fullscreen)return {width:1200,height:900};const w=Math.max(1,Number.isFinite(width)?width:1200),h=Math.max(1,Number.isFinite(height)?height:900),density=Math.min(2,Math.max(1,Number.isFinite(dpr)?dpr:1)),scale=Math.min(density,4096/w,4096/h,Math.sqrt(4194304/(w*h)));return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale))};}
const api={artilleryBarrelRecoil,renderSize,screenShake,recoilPose,VisionMeshes,TowCamera,repairProgress,announcementText,captureRadius,armorTier,structureLabel,NetworkView,HelicopterPrediction,VehiclePrediction};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontlinePresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
