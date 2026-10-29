// Hexagonal backing fitted to source bounds, including transparent padding.
export function medalOutline(data,width,height){
 const points=[];
 for(let y=0;y<height;y++){let left=-1,right=-1;for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=128){if(left<0)left=x;right=x;}if(left>=0){points.push([left,y],[right+1,y],[left,y+1],[right+1,y+1]);}}
 if(points.length<3)return null;
 // Preserve measured bounds, but use six sharp vertices instead of the
 // clipped, antialiased pixel runs at the texture's top and bottom.
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),center=(left+right)/2,quarter=(bottom-top)/4;
 const hull=[[center,top],[right,top+quarter],[right,bottom-quarter],[center,bottom],[left,bottom-quarter],[left,top+quarter]];
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
