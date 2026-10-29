// Convex outline in the source texture, including its transparent padding.
export function medalOutline(data,width,height){
 const points=[];
 for(let y=0;y<height;y++){let left=-1,right=-1;for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=128){if(left<0)left=x;right=x;}if(left>=0){points.push([left,y],[right+1,y],[left,y+1],[right+1,y+1]);}}
 if(points.length<3)return null;
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}out.pop();return out;};
 const hull=[...half(points),...half([...points].reverse())];
 // object-fit:contain positions the source texture centrally in the square art box.
 const size=Math.max(width,height),dx=(size-width)/2,dy=(size-height)/2;
 return 'polygon('+hull.map(([x,y])=>((x+dx)/size*100).toFixed(3)+'% '+((y+dy)/size*100).toFixed(3)+'%').join(',')+')';
}
const outlines=new Map();
export function fitMedalBacking(img,box){
 if(!img.naturalWidth)return;
 let outline=outlines.get(img.src);
 if(outline===undefined){try{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);outline=medalOutline(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);}catch{outline=null;}outlines.set(img.src,outline);}
 if(outline){box.style.setProperty('--medal-outline',outline);box.dataset.fitted='true';}
}
