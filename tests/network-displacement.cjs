'use strict';
const assert=require('node:assert/strict'),{Game,movementRadius}=require('../dist/engine.js'),{NetworkView,VehiclePrediction}=require('../dist/presentation.js'),wire=require('../dist/transport.js');
for(const vehicle of ['tank','bradley','artillery','apache','littlebird']){
 const g=new Game({multiplayer:true,requireSelection:true,teamSize:2});g.chooseVehicle(0,vehicle);g.matchStarted=true;g.covers=[];g.units=[];for(const p of g.players)p.enabled=p.id===0;const p=g.players[0];p.sideChosen=true;
 const turret=g.turret;g.structures=[turret];turret.hp=0;turret.x=700;turret.y=700;p.tank.x=700;p.tank.y=700;
 const net=new NetworkView(),prediction=new VehiclePrediction(Game);net.reset(g.snapshot(0),0);prediction.apply(net.sample(0),net,0,180);
 turret.hp=turret.max;turret.team=0;g.separateRespawn(turret);assert(g.free(p.tank,p.tank.x,p.tank.y));assert(Math.hypot(p.tank.x-700,p.tank.y-700)>=movementRadius(p.tank)+movementRadius(turret)+2-1e-6);
 const encoded=wire.encode(g.snapshot(0)),decoded=wire.decode(encoded.packet);assert.equal(decoded.me.tank.positionRevision,1);assert.equal(decoded.entities.find(u=>u.id===p.tank.id).positionRevision,1);
 g.time+=.05;net.push(decoded,50);const shown=prediction.apply(net.sample(50),net,50,180);assert.equal(shown.me.tank.x,p.tank.x);assert.equal(shown.me.tank.y,p.tank.y);assert.equal(prediction.player.tank.airVelocityX,0);
}
// A baseline must remember values, even when the simulation mutates nested objects in place.
const g=new Game({multiplayer:true});let base,previous;for(let i=0;i<100;i++){
 g.time+=.05;g.players[0].skillState.test=i;g.players[0].chosen.push(i);g.players[0].message='message '+i;if(i===20)g.players[0].temporaryValue=5;if(i===40)g.players[0].temporaryValue=undefined;if(i===45)delete g.players[0].temporaryValue;
 g.effects.push({id:10000+i,kind:'AP',x:i,y:i,life:.3});if(g.effects.length>4)g.effects.shift();
 const state=g.snapshot(0),result=wire.encode(state,base);base=result.base;previous=wire.decode(JSON.parse(JSON.stringify(result.packet)),previous);
 const expected=JSON.parse(JSON.stringify(wire.compact(state)));delete expected.vision;const actual=JSON.parse(JSON.stringify(previous));delete actual.vision;assert.deepEqual(actual,expected);
 if(i===50){base=undefined;previous=undefined;}
}
console.log('Forced turret displacement for all five vehicles and 100 wire round trips with mutable talents/effects, deleted fields and reconnect passed');
// Recover the interpolation clock after a long packet gap instead of lagging for seconds.
{const g=new Game(),net=new NetworkView();net.reset(g.snapshot(0),0);g.time=.05;net.push(g.snapshot(0),50);net.sample(50);g.time=1.05;net.push(g.snapshot(0),1050);assert(Math.abs(net.sample(1050).time-.95)<1e-9);}
// Spatial lookup must preserve brute-force neighbor membership and order, including cell crossings.
{const g=new Game(),random=(()=>{let s=77;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);})();g.units=[];for(let i=0;i<320;i++)g.units.push(g.entity({kind:'infantry',x:random()*2400,y:random()*1400,r:9,hp:100,team:i%2}));g.beginInfantryPhase();for(const u of g.units){u.x+=100;u.y-=100;g.updateInfantryCell(u);const r=movementRadius(u)+30,filter=v=>v.id!==u.id&&Math.hypot(v.x-u.x,v.y-u.y)<r+movementRadius(v);assert.deepEqual(g.infantryNeighbors(u,r).filter(filter).map(v=>v.id),[...g.all(),...g.covers].filter(filter).map(v=>v.id));}g._infantryContext=null;}
console.log('Long-gap interpolation recovery and ordered spatial lookup after 320 cell crossings passed');
