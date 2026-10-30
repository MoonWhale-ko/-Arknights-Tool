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
// Deterministic gradient Perlin potential; curl uses spatial derivatives, not frame-random jitter.
const fade=t=>t*t*t*(t*(t*6-15)+10),mix=(a,b,t)=>a+(b-a)*t;
export function perlinNoise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
 const gradient=(a,b,c,dx,dy,dz)=>{let h=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,2147483647);h=Math.imul(h^(h>>>13),1274126177);h=(h^(h>>>16))&15;const u=h<8?dx:dy,v=h<4?dy:h===12||h===14?dx:dz;return ((h&1)?-u:u)+((h&2)?-v:v);};
 const row=(j,k)=>mix(gradient(ix,iy+j,iz+k,fx,fy-j,fz-k),gradient(ix+1,iy+j,iz+k,fx-1,fy-j,fz-k),fade(fx));
 return mix(mix(row(0,0),row(1,0),fade(fy)),mix(row(0,1),row(1,1),fade(fy)),fade(fz));
}
export function nativeNoise(module,position,scroll,t,r=.5){
 if(!module?.enabled)return [0,0,0];const f=Math.max(module.frequency,1e-6),q=module.quality;
 const point=[position[0]*f,position[1]*f,position[2]*f+scroll],eps=.01;
 const potential=(axis,p)=>{let sum=0,amplitude=1,frequency=1;for(let i=0;i<Math.max(1,module.octaves);i++){sum+=amplitude*perlinNoise(p[0]*frequency+axis*19.19,q===0?0:p[1]*frequency+axis*7.73,q===2?p[2]*frequency+axis*31.37:0);amplitude*=module.octaveMultiplier;frequency*=module.octaveScale;}return sum;};
 const derivative=(axis,d)=>{const a=point.slice(),b=point.slice();a[d]+=eps;b[d]-=eps;return (potential(axis,a)-potential(axis,b))/(2*eps);};
 const curl=[derivative(2,1)-derivative(1,2),derivative(0,2)-derivative(2,0),derivative(1,0)-derivative(0,1)];
 // Curl chain rule contributes f; native damping cancels it, preserving field scale.
 return curl.map((n,i)=>{if(module.remapEnabled)n=nativeScalar(i&&module.separateAxes?module[i===1?'remapY':'remapZ']:module.remap,clamp(n*.5+.5),r)*2-1;const strength=module.separateAxes&&i?module[i===1?'strengthY':'strengthZ']:module.strength;return n*(module.damping?1:f)*nativeScalar(strength,t,r);});
}

/** Native point/box billboards with action gates and delayed, non-looping bursts. */
export function createNativeEmitter(P,source,texture,random=Math.random){
 const box=new P.Container(),particles=[],initial=source.initial,m=source.matrix,units=source.units;
 let remainder=0,time=0,playing=!source.action;const looping=source.looping!==false,delay=source.delay||0;const rate=nativeScalar(source.emission.rateOverTime),limit=initial.maxNumParticles;
 const spawn=()=>{if(particles.length>=limit)return;const r=random(),shape=source.shape;let x=0,y=0,z=0;if(shape.enabled){const s=shape.m_Scale,p=shape.m_Position;x=(random()-.5)*s.x+p.x;y=(random()-.5)*s.y+p.y;z=(random()-.5)*s.z+p.z;}
  const lifetime=nativeScalar(initial.startLifetime,0,r);if(lifetime<=0)return;const sprite=new P.Sprite(texture);sprite.anchor.set(.5);sprite.blendMode=P.BLEND_MODES.ADD;box.addChild(sprite);
  particles.push({sprite,age:0,lifetime,r,x,y,z,dx:0,dy:0,dz:0,scroll:0,speed:nativeScalar(initial.startSpeed,0,random()),size:nativeScalar(initial.startSize,0,random()),rotation:nativeScalar(initial.startRotation,0,random()),color:nativeColor(initial.startColor,0,random())});
 };
 const bursts=(from,to)=>{if(!playing)return;for(const b of source.emission.bursts||[]){const first=delay+b.time;if(!looping){if(from<first&&to>=first)for(let n=0;n<nativeScalar(b.countCurve);n++)spawn();continue;}const start=Math.max(0,Math.floor((from-first)/source.duration)+1),end=Math.floor((to-first)/source.duration);for(let cycle=start;cycle<=end;cycle++)for(let n=0;n<nativeScalar(b.countCurve);n++)spawn();}};
 const reset=()=>{for(const p of particles)p.sprite.destroy();particles.length=0;remainder=0;time=0;bursts(-Number.EPSILON,0);};
 reset();
 const step=dt=>{const previous=time;time+=dt;for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.lifetime){p.sprite.destroy();particles.splice(i,1);}}
  bursts(previous,time);
  if(playing){const emitted=Math.max(0,Math.min(time,looping?Infinity:delay+source.duration)-Math.max(previous,delay));remainder+=emitted*rate;while(remainder>=1){spawn();remainder--;}}
  for(const p of particles){const t=p.age/p.lifetime,velocity=source.velocity,noise=source.noise;
   p.scroll+=nativeScalar(noise?.scrollSpeed,t,p.r)*dt;
   const turbulence=nativeNoise(noise,[p.x+p.dx,p.y+p.dy,p.z+p.dz],p.scroll,t,p.r);
   let v=[0,0,p.speed];if(velocity?.enabled){v=v.map((value,i)=>value+nativeScalar(velocity[['x','y','z'][i]],t,p.r));const speed=nativeScalar(velocity.speedModifier,t,p.r);v=v.map(value=>value*speed);}
   const limiter=source.velocityLimit;if(limiter?.enabled){const speed=Math.hypot(...v),limit=Math.max(0,nativeScalar(limiter.magnitude,t,p.r));if(speed>limit){const damping=1-Math.pow(1-clamp(limiter.dampen),dt*30),scale=(speed+(limit-speed)*damping)/speed;v=v.map(value=>value*scale);}}
   const amount=noise?.enabled?nativeScalar(noise.positionAmount,t,p.r):0;
   p.dx+=(v[0]+turbulence[0]*amount)*dt;p.dy+=(v[1]+turbulence[1]*amount)*dt;p.dz+=(v[2]+turbulence[2]*amount)*dt;
   const x=p.x+p.dx,y=p.y+p.dy,z=p.z+p.dz;p.sprite.position.set((m[0][0]*x+m[0][1]*y+m[0][2]*z+m[0][3])*units,-(m[1][0]*x+m[1][1]*y+m[1][2]*z+m[1][3])*units);
   const size=p.size*(source.size.enabled?nativeScalar(source.size.curve,t,p.r):1)*Math.max(0,1+(noise?.enabled?turbulence[1]*nativeScalar(noise.sizeAmount,t,p.r):0))*units;p.sprite.scale.set(size/texture.orig.width,-size/texture.orig.height);p.sprite.rotation=-p.rotation-(noise?.enabled?turbulence[0]*nativeScalar(noise.rotationAmount,t,p.r)*p.age*Math.PI/180:0);
   const color=source.color.enabled?nativeColor(source.color.gradient,t,p.r):[1,1,1,1],c=color.map((v,i)=>clamp(v*p.color[i]));p.sprite.tint=(Math.round(c[0]*255)<<16)|(Math.round(c[1]*255)<<8)|Math.round(c[2]*255);p.sprite.alpha=c[3];}
 };
 const update=delta=>{let dt=delta*source.simulationSpeed;while(dt>0){const d=Math.min(dt,1/30);step(d);dt-=d;}};
 if(source.prewarm&&playing)update(source.duration);
 return {box,update,setPlaying(value){if(value&&!playing){playing=true;reset();}else playing=value;}};
}
