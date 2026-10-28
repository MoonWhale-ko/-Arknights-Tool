// Reference-price total only: the account does not expose purchase history.
export function collectionOriginiteCost(catalog,owned){
 let total=0,count=0;const seen=new Set();
 for(const skin of catalog||[]){if(seen.has(skin.id)||skin.basic||!owned?.has(skin.id))continue;seen.add(skin.id);const price=skin.price;if(price?.currency!=='순오리지늄'||!Number.isFinite(price.amount)||price.amount<=0)continue;total+=price.amount;count++;}
 return {total,count};
}

export function originiteCashEquivalent(total){const cash=total*119000/185;return {won:Math.round(cash),hours:Math.round(cash/10320*10)/10};}
