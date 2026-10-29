const assert=require('node:assert/strict');
const {Game,distance}=require('../dist/engine.js');
for(const soloTeam of [0,1]){
 const g=new Game({singlePlayer:true,soloTeam,random:()=>.5}),p=g.players[1-soloTeam],t=p.tank,start={...t};
 for(let i=0;i<250;i++)g.tick(.1);
 assert(distance(t,start)>200,'Bot must leave spawn and navigate past base');
 assert(p.bot,'Solo opponent has a controller');assert(!g.players[soloTeam].bot,'Human is not controlled');
 const h=g.players[soloTeam];g.units=[];g.structures=[];g.covers=[];g.nextWave=Infinity;
 t.x=1200;t.y=700;t.angle=t.turret=0;h.tank.x=1380;h.tank.y=700;h.tank.hp=h.tank.max;
 p.bot=null;p.weapon='AP';p.cannon={loaded:'AP',target:null,left:0,total:0};t.cd=0;
 let fired=false;for(let i=0;i<30;i++){g.tick(.1);if(g.shots.some(s=>s.owner===t.id)||h.tank.hp<h.tank.max)fired=true;}
 assert(fired,'Bot fires at visible enemy tank');assert.equal(p.weapon,'AP');
 h.tank.x=2300;h.tank.y=1300;g.tick(.4);for(let i=0;i<5;i++)g.tick(.1);assert.equal(p.bot.target,null,'No hidden target tracking');
 t.hp=t.max*.2;g.tick(.1);for(let i=0;i<5;i++)g.tick(.1);assert(p.bot.retreat,'Low health retreats');
 t.hp=0;p.respawn=.1;g.tick(.1);assert(t.hp>0,'Bot respawns');g.tick(.1);assert(p.bot,'Bot resumes after respawn');
}
const online=new Game({multiplayer:true});online.tick(.1);assert(online.players.every(p=>!p.bot));
const selection=new Game({singlePlayer:true,requireSelection:true});selection.tick(.1);assert(!selection.players[1].bot);
const nav=new Game({singlePlayer:true});const bp=nav.players[1];bp.tank.x=1200;bp.tank.y=700;bp.bot={path:[],nextPath:0};nav.structures=[];nav.covers=[{x:1100,y:700,r:45}];const wp=nav.botWaypoint(bp,{x:900,y:700});assert(Math.abs(wp.y-700)>5,'Path goes around blocker');nav.covers=[];nav.units=[nav.entity({kind:'infantry',role:'rifle',team:0,x:1080,y:700,hp:100})];nav.players[0].tank.x=100;nav.players[0].tank.y=100;nav.time=1;bp.bot=null;nav.updateBot(bp,.1);assert.equal(bp.weapon,'HE','Uses HE against infantry');
console.log('Solo bot: navigation, visible combat, retreat, respawn, human/network isolation passed');


