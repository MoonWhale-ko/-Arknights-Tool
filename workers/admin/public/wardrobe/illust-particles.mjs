const clamp=v=>Math.max(0,Math.min(1,v));
// Native unweighted Unity AnimationCurve segments use cubic Hermite interpolation.
export function nativeCurve(curve,t){
 const keys=curve?.m_Curve||[];if(!keys.length)return 0;if(t<=keys[0].time)return keys[0].value;
 for(let i=1;i<keys.length;i++)if(t<=keys[i].time){const a=keys[i-1],b=keys[i],d=b.time-a.time,u=(t-a.time)/d,u2=u*u,u3=u2*u;if(!Number.isFinite(a.outSlope))return a.value;return (2*u3-3*u2+1)*a.value+(u3-2*u2+u)*d*a.outSlope+(-2*u3+3*u2)*b.value+(u3-u2)*d*b.inSlope;}
 return keys.at(-1).value;
}
export function nativeScalar(v,t=0,r=.5){
 if(!v)return 0;switch(v.minMaxState){case 1:return v.scalar*nativeCurve(v.maxCurve,t);case 2:return v.scalar*(nativeCurve(v.minCurve,t)*(1-r)+nativeCurve(v.maxCurve,t)*r);case 3:return v.minScalar+(v.scalar-v.minScalar)*r;default:return v.scalar;}
}
const rgba=c=>[c.r,c.g,c.b,c.a];
export function nativeGradient(g,t){
 const channel=(prefix,n,c)=>{if(!n)return 1;const times=Array.from({length:n},(_,i)=>g[prefix+i]/65535);if(t<=times[0])return g.key0[c];for(let i=1;i<n;i++)if(t<=times[i]){const a=g['key'+(i-1)][c],b=g['key'+i][c];return g.m_Mode===1?a:a+(b-a)*(t-times[i-1])/(times[i]-times[i-1]||1);}return g['key'+(n-1)][c];};
 return ['r','g','b'].map(c=>channel('ctime',g.m_NumColorKeys,c)).concat(channel('atime',g.m_NumAlphaKeys,'a'));
}
export function nativeColor(v,t=0,r=.5){
 if(v.minMaxState===1)return nativeGradient(v.maxGradient,t);
 if(v.minMaxState===2){const a=rgba(v.minColor),b=rgba(v.maxColor);return a.map((x,i)=>x+(b[i]-x)*r);}
 if(v.minMaxState===3){const a=nativeGradient(v.minGradient,t),b=nativeGradient(v.maxGradient,t);return a.map((x,i)=>x+(b[i]-x)*r);}
 return rgba(v.maxColor);
}
/** Native point/box billboards with action gates and delayed, non-looping bursts. */
export function createNativeEmitter(P,source,texture,random=Math.random){
 const box=new P.Container(),particles=[],initial=source.initial,m=source.matrix,units=source.units;
 let remainder=0,time=0,playing=!source.action;const looping=source.looping!==false,delay=source.delay||0;const rate=nativeScalar(source.emission.rateOverTime),limit=initial.maxNumParticles;
 const spawn=()=>{if(particles.length>=limit)return;const r=random(),shape=source.shape;let x=0,y=0,z=0;if(shape.enabled){const s=shape.m_Scale,p=shape.m_Position;x=(random()-.5)*s.x+p.x;y=(random()-.5)*s.y+p.y;z=(random()-.5)*s.z+p.z;}
  const lifetime=nativeScalar(initial.startLifetime,0,r);if(lifetime<=0)return;const sprite=new P.Sprite(texture);sprite.anchor.set(.5);sprite.blendMode=P.BLEND_MODES.ADD;box.addChild(sprite);
  particles.push({sprite,age:0,lifetime,r,x,y,z,speed:nativeScalar(initial.startSpeed,0,random()),size:nativeScalar(initial.startSize,0,random()),rotation:nativeScalar(initial.startRotation,0,random()),color:nativeColor(initial.startColor,0,random())});
 };
 const bursts=(from,to)=>{if(!playing)return;for(const b of source.emission.bursts||[]){const first=delay+b.time;if(!looping){if(from<first&&to>=first)for(let n=0;n<nativeScalar(b.countCurve);n++)spawn();continue;}const start=Math.max(0,Math.floor((from-first)/source.duration)+1),end=Math.floor((to-first)/source.duration);for(let cycle=start;cycle<=end;cycle++)for(let n=0;n<nativeScalar(b.countCurve);n++)spawn();}};
 const reset=()=>{for(const p of particles)p.sprite.destroy();particles.length=0;remainder=0;time=0;bursts(-Number.EPSILON,0);};
 reset();
 const step=dt=>{const previous=time;time+=dt;for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.lifetime){p.sprite.destroy();particles.splice(i,1);}}
  bursts(previous,time);
  if(playing){const emitted=Math.max(0,Math.min(time,looping?Infinity:delay+source.duration)-Math.max(previous,delay));remainder+=emitted*rate;while(remainder>=1){spawn();remainder--;}}
  for(const p of particles){const t=p.age/p.lifetime,z=p.z+p.speed*p.age;p.sprite.position.set((m[0][0]*p.x+m[0][1]*p.y+m[0][2]*z+m[0][3])*units,-(m[1][0]*p.x+m[1][1]*p.y+m[1][2]*z+m[1][3])*units);
   const size=p.size*(source.size.enabled?nativeScalar(source.size.curve,t,p.r):1)*units;p.sprite.scale.set(size/texture.orig.width,-size/texture.orig.height);p.sprite.rotation=-p.rotation;
   const color=source.color.enabled?nativeColor(source.color.gradient,t,p.r):[1,1,1,1],c=color.map((v,i)=>clamp(v*p.color[i]));p.sprite.tint=(Math.round(c[0]*255)<<16)|(Math.round(c[1]*255)<<8)|Math.round(c[2]*255);p.sprite.alpha=c[3];}
 };
 const update=delta=>{let dt=delta*source.simulationSpeed;while(dt>0){const d=Math.min(dt,1/30);step(d);dt-=d;}};
 if(source.prewarm&&playing)update(source.duration);
 return {box,update,setPlaying(value){if(value&&!playing){playing=true;reset();}else playing=value;}};
}
