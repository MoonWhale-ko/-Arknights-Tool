/** Native BoneFollower, restricted to a direct child of the main Spine renderer.
 * Vertices are already converted from Unity y-up into Spine/Pixi y-down units.
 */
export function applyBoneFollower(mesh,bone,binding,skeleton){
 const m=bone.matrix;
 mesh.position.set(m.tx,m.ty);
 mesh.rotation=binding.followBoneRotation?Math.atan2(m.b,m.a)+(binding.followLocalScale&&bone.scaleX<0?Math.PI:0):0;
 const sx=binding.followLocalScale?bone.scaleX:1;
 let sy=binding.followLocalScale?bone.scaleY:1;
 if(binding.followSkeletonFlip)sy*=Math.sign(skeleton.scaleX*skeleton.scaleY)||1;
 mesh.scale.set(sx,sy);
}

/** Unity transparent renderers sort by explicit order before camera depth. */
export function effectIsBehind(layer,spineSortingOrder=0){
 return layer.sortingOrder!==spineSortingOrder?layer.sortingOrder<spineSortingOrder:layer.depth>=0;
}
