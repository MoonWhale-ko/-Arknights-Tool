// UICharacterDynIllust: INIT=[3,9), RESUME=[10,24).
// INIT shifts by rounded Idle duration only when it is shorter than 9 seconds.
export function specialDelay(initial,idleDuration=0,random=Math.random){
 const floor=Math.floor(idleDuration),duration=idleDuration-floor===.5?(floor%2?floor+1:floor):Math.round(idleDuration),shift=initial&&duration<9?duration:0;
 return (initial?3:10)+shift+Math.floor(random()*(initial?6:14));
}
export function motionNames(animations){
 const moving=animations.filter(a=>a.duration>0);
 return {idle:moving.find(a=>/^Idle$/i.test(a.name))||moving.find(a=>/^Idle/i.test(a.name)),special:moving.filter(a=>/^Special/i.test(a.name)),interact:moving.filter(a=>/^Interact/i.test(a.name))};
}
