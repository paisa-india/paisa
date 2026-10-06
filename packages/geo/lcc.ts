/**
 * Lambert Conformal Conic (WGS84 ellipsoid, Snyder 1987) with the same parameters used to build the India map:
 * +proj=lcc +lat_1=12 +lat_2=30 +lat_0=22 +lon_0=82. Returns projected metres.
 */
const A=6378137,E=0.0818191908426215;const rad=(d:number)=>d*Math.PI/180;
const m=(p:number)=>Math.cos(p)/Math.sqrt(1-E*E*Math.sin(p)**2);
const t=(p:number)=>Math.tan(Math.PI/4-p/2)/((1-E*Math.sin(p))/(1+E*Math.sin(p)))**(E/2);
const p1=rad(12),p2=rad(30),p0=rad(22),l0=rad(82);
const n=(Math.log(m(p1))-Math.log(m(p2)))/(Math.log(t(p1))-Math.log(t(p2)));const F=m(p1)/(n*t(p1)**n);const rho0=A*F*t(p0)**n;
export function lcc(lat:number,lng:number){const rho=A*F*t(rad(lat))**n,theta=n*(rad(lng)-l0);return {x:rho*Math.sin(theta),y:rho0-rho*Math.cos(theta)};}
/** Map SVG coordinates from lat/lng, given the affine fit stored with the map (uniform scale, y flipped). */
export function toMap(lat:number,lng:number,fit:{s:number;tx:number;ty:number}){const p=lcc(lat,lng);return {x:fit.s*p.x+fit.tx,y:-fit.s*p.y+fit.ty};}
