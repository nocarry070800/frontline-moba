const assert=require('node:assert/strict'),{Game,B}=require('../dist/engine.js'),wire=require('../dist/transport.js');
const g=new Game({requireSelection:true,random:()=>.5});assert(g.chooseVehicle(0,'artillery'));g.confirmVehicle(0);const p=g.players[0];g.covers=[];g.units=[];g.structures=[];p.tank.x=500;p.tank.y=700;p.tank.turret=0;p.skillState.still=2;p.weapon='AP';
g.command(0,{type:'elevation',delta:1});assert(Math.abs(p.elevation-(15+10/1.5))<1e-8);g.smoke(p,true);assert.equal(g.smokes.length,0);
// Direct method must also reject smoke; command already rejects it.
p.elevation=15;g.fire(p.tank,{x:510,y:700,kind:'ground'});const shot=g.shots[0];assert(shot.artillery);assert.equal(shot.life,null);assert.equal(shot.effectiveRange,null);const encoded=wire.decode(wire.encode(g.snapshot(0)).packet);assert(encoded.shots[0].artillery);
const start=shot.x;for(let i=0;i<400&&g.shots.length;i++)g.projectiles(.05);assert(!g.shots.length);assert(Math.abs(shot.idealX-start-30*B.mapScale.unitsPerMeter*B.statProgression.initial)<15);assert(shot.height<1e-8);
for(const kind of ['tower','turret']){const u={id:999,kind,team:1,hp:1000,max:1000,armor:0,r:22,x:1000,y:700};g.damage({artillery:true,kind:'AP',ammo:'AP',team:0,vx:1,vy:0},u,100);const v={...u,hp:1000};g.damage({kind:'AP',ammo:'AP',team:0,vx:1,vy:0},v,100);assert(Math.abs((1000-u.hp)/(1000-v.hp)-B.artillery.ballistics.structureDamageMultiplier)<1e-9);}
g.gain(p,1e9);assert.equal(p.pending.length,30);console.log('Artillery selection/elevation, independent ballistic range/landing, network fields, no smoke and configured structure damage passed');






