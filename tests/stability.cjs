const assert=require('node:assert/strict'),{renderSize}=require('../dist/presentation.js');
for(const [w,h,dpr] of [[1920,1080,1],[3840,2160,2],[7680,4320,3],[5120,1440,2],[0,0,0],[NaN,Infinity,NaN]]){const s=renderSize(w,h,dpr,true);assert(Number.isFinite(s.width)&&Number.isFinite(s.height));assert(s.width>0&&s.height>0);assert(s.width<=4096&&s.height<=4096);assert(s.width*s.height<=4194304);}
assert.deepEqual(renderSize(3840,2160,3,false),{width:1200,height:900});console.log('Fullscreen backing buffer capped at 4 megapixels/4096px; window resolution unchanged');
