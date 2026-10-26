/* Pure presentation helpers. Server state remains authoritative. */
(function(root){'use strict';
const armorTier=n=>['0','I','II','III'][n]??String(n);
function structureLabel(u,name){return name(u.team)+' · '+(u.kind==='base'?'БАЗА':u.kind==='tower'?u.number:'ТУРЕЛЬ')+' · '+armorTier(u.armor);}
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function blend(a,b,t){if(!a||a.id!==b.id||Math.hypot(b.x-a.x,b.y-a.y)>160||a.hp<=0||b.hp<=0)return b;const out={...b};for(const k of ['x','y'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=a[k]+(b[k]-a[k])*t;for(const k of ['angle','turret'])if(Number.isFinite(a[k])&&Number.isFinite(b[k]))out[k]=angle(a[k],b[k],t);if(b.guns)out.guns=b.guns.map((g,i)=>({...g,angle:a.guns?.[i]?angle(a.guns[i].angle,g.angle,t):g.angle}));return out;}
class NetworkView{
 constructor({delay=0.1}={}){this.delay=delay;this.frames=[];this.latest=null;}
 reset(state,now){this.frames=[];this.latest=null;this.push(state,now);}
 push(packet,now){const state={...this.latest,...packet};if(!Number.isFinite(state.time))return;if(this.latest&&(state.time<this.latest.time||state.me.tank.id!==this.latest.me.tank.id||!!state.over!==!!this.latest.over))this.frames=[];this.latest=state;const frame={state,received:now};if(this.frames.at(-1)?.state.time===state.time)this.frames[this.frames.length-1]=frame;else this.frames.push(frame);while(this.frames.length>32)this.frames.shift();}
 sample(now){const latest=this.latest;if(!latest||latest.paused||latest.over||this.frames.length<2)return latest;const last=this.frames.at(-1),time=Math.min(last.state.time,last.state.time+Math.max(0,now-last.received)/1000-this.delay);let a=this.frames[0],b=a;for(const f of this.frames){if(f.state.time<=time)a=f;if(f.state.time>=time){b=f;break;}b=f;}
 const t=a===b?1:Math.max(0,Math.min(1,(time-a.state.time)/(b.state.time-a.state.time))),before=new Map(a.state.entities.map(u=>[u.id,u])),after=new Map(b.state.entities.map(u=>[u.id,u]));
 const entities=latest.entities.map(u=>{const v=after.get(u.id);if(!v)return u;const g=blend(before.get(u.id),v,t);return {...u,x:g.x,y:g.y,angle:g.angle,turret:g.turret,guns:u.guns?.map((gun,i)=>({...gun,angle:g.guns?.[i]?.angle??gun.angle}))};});
 const shotsBefore=new Map(a.state.shots.map(u=>[u.id,u])),shotsAfter=new Map(b.state.shots.map(u=>[u.id,u]));const shots=latest.shots.filter(u=>u.createdAt===undefined||u.createdAt<=time).map(u=>shotsAfter.has(u.id)?blend(shotsBefore.get(u.id),shotsAfter.get(u.id),t):u);
 const positions=new Map(entities.map(u=>[u.id,u])),tank=positions.get(latest.me.tank.id)||latest.me.tank;
 const vision=latest.vision.map(v=>{const p=positions.get(v.id);return p?{...v,x:p.x,y:p.y}:v;});
 return {...latest,entities,shots,vision,me:{...latest.me,tank:{...latest.me.tank,x:tank.x,y:tank.y,angle:tank.angle,turret:tank.turret}}};
 }
}
function announcementText(e,viewer,name){const own=e.team===viewer;switch(e.kind){case 'level':return 'НОВЫЙ УРОВЕНЬ — '+e.level;case 'centralSpawn':return 'НЕЙТРАЛЬНАЯ ТУРЕЛЬ FIA ПОЯВИЛАСЬ';case 'centralDestroyed':return e.team===-1?'НЕЙТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':own?'ВАША ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА':'ВРАЖЕСКАЯ ЦЕНТРАЛЬНАЯ ТУРЕЛЬ УНИЧТОЖЕНА';case 'centralCaptured':return (own?'ВАША КОМАНДА':'КОМАНДА '+name(e.team))+' ЗАХВАТИЛА ЦЕНТР';case 'towerDestroyed':return (own?'СОЮЗНАЯ':'ВРАЖЕСКАЯ')+' БАШНЯ '+e.number+' УНИЧТОЖЕНА · '+(e.lane?'НИЖНЯЯ':'ВЕРХНЯЯ')+' ЛИНИЯ';case 'tankKill':return own?'ВРАЖЕСКИЙ ТАНК УНИЧТОЖЕН · +'+e.reward+' XP':'ВАШ ТАНК УНИЧТОЖЕН';default:return '';}}
function captureRadius(progress,duration,radius){return radius*Math.sqrt(Math.max(0,Math.min(1,progress/duration)));}
const api={announcementText,captureRadius,armorTier,structureLabel,NetworkView};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontlinePresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
