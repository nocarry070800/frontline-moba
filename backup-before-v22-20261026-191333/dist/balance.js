// БАЛАНС FRONTLINE: меняйте числа, сохраняйте, обновляйте страницу.
// В сети перезапустите START-SERVER.cmd. Секунды, единицы карты/с, градусы/с.
// Дроби пишите через точку. armor: 0–3. Множитель 0.75 = 75%.
(function(root){const balance={
firstUpgradeLevel:2,
levels:[0,1200,2400,4800,7000,11800,18800,30600,39400,70000],
wave:{interval:20,regular:['rifle','HAT','rifle','sniper'],bonusRifle:1,bonusSniper:1,bonusHAT:1,extraHATPerCycle:1},
projectiles:{speedMultiplier:0.375,lifetimeAtOriginalSpeed:2.6,heRadius:40},
tank:{hp:700,armor:3,radius:31,vision:330,range:240,speed:125,reverseFactor:0.5,hullTurnDegrees:55,turretTurnDegrees:60,moveConeDegrees:30,settleSeconds:0.15,respawnSeconds:10},
weapons:{AP:{damage:192,interval:2.4,speed:580},HE:{damage:72,interval:2.4,speed:460},MG:{damage:10,interval:0.12,speed:760},Smoke:{damage:0,interval:0,speed:0}},
infantry:{
rifle:{hp:200,armor:0,radius:9,moveRadius:6,vision:150,range:135,speed:38,damage:9,interval:1.05,bulletSpeed:450,xpWeight:2},
HAT:{hp:200,armor:0,radius:9,moveRadius:6,vision:150,range:135,speed:38,damage:9,interval:1.05,bulletSpeed:450,xpWeight:2.3,AP:{damage:192,interval:2.4,speed:330}},
sniper:{hp:130,armor:0,radius:9,moveRadius:6,vision:170,range:170,speed:38,damage:24,interval:1.5,bulletSpeed:850,xpWeight:3,retreatRange:105},sovietDamageMultiplier:1.5},
structures:{
tower1:{hp:1500,armor:2,radius:22,vision:340,range:300,turnDegrees:60,AP:{damage:288,interval:3.2,speed:550},MG:{damage:7,interval:0.22,speed:700}},
tower2:{hp:2000,armor:3,radius:22,vision:340,range:300,turnDegrees:60,AP:{damage:384,interval:2.4,speed:550},MG:{damage:7,interval:0.22,speed:700}},
base:{hp:2000,armor:3,radius:32,vision:300,range:260,turnDegrees:60,AP:{damage:600,interval:1.8,speed:580},MG:{damage:7,interval:0.2,speed:720}},
central:{hp:650,armor:3,radius:22,vision:300,range:300,turnDegrees:60,AP:{damage:10,interval:0.1,speed:600},initialSpawnSeconds:180,captureSeconds:25,captureRadius:95,respawnSeconds:180,hpPerCycle:0.5,damagePerCycle:0.1}},
armor:{HE:[1,0.5,0.25,0.1],AP:[1,1,0.75,0.5],MG:[1,0.75,0.5,0.25],front:0.5,side:0.75,rear:1,dodgeAP:0.5,dodgeMG:0.1},
recovery:{passiveDelay:10,passiveHP:1,repairWarmup:5,repairHP:20,baseZoneHP:50,baseZoneRadius:46,baseZoneOffset:85,cancelSeconds:2,hitStunSeconds:3},
smoke:{capacity:100,drainPerSecond:10,regenPerSecond:2,threshold:1.2},reload:{switchSeconds:1,shellSwapIntervals:2},terrain:{main:1,dirt:0.85,grass:0.7,crowd:0.7},
xp:{damage:2,kill:30,centralKill:400,tankKill:3000,friendlyDamagePenalty:1,friendlyKillPenalty:100},
upgrades:{he:1.6,ap:1.1,frontArmor:0.1,sideArmor:0.04,rearArmor:0.02,range:1.1,vision:1.1,bulletSpeed:1.25,moveSpeed:1.1,attackSpeed:1.25,turretTurn:1.5,hullTurn:1.25,smokeThreshold:0.75,repairWarmup:3,switchSeconds:0,swapIntervals:1,lateBulletSpeed:2,reverseFactor:2}
};if(typeof module!=='undefined'&&module.exports)module.exports=balance;else root.FRONTLINE_BALANCE=balance;})(typeof globalThis!=='undefined'?globalThis:this);



