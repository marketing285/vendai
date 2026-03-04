"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Sphere } from "ogl";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const vertex = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uAmplitude;

varying vec3 vNormal;
varying vec3 vPos;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vNormal=normalize(normal);
  vPos=position;
  float n=snoise(position*1.8+uTime*0.45);
  vec3 d=position+normal*n*uAmplitude;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(d,1.0);
}`;

const fragment = /* glsl */ `
precision highp float;

uniform vec3  uColorStart;
uniform vec3  uColorEnd;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPos;

void main(){
  vec3  n      =normalize(vNormal);
  float fresnel=pow(1.0-abs(dot(n,vec3(0.,0.,1.))),2.2);
  vec3  color  =mix(uColorStart,uColorEnd,fresnel+vPos.y*0.35);
  color       +=uColorEnd*fresnel*0.4;
  gl_FragColor =vec4(color,0.9+fresnel*0.1);
}`;

type StateConfig = { cs: [number,number,number]; ce: [number,number,number]; amp: number; speed: number };

const STATE_MAP: Record<OrbState, StateConfig> = {
  idle:      { cs: [0.08,0.07,0.35], ce: [0.42,0.39,1.00], amp: 0.045, speed: 0.45 },
  listening: { cs: [0.18,0.15,0.80], ce: [0.67,0.55,1.00], amp: 0.16,  speed: 0.90 },
  thinking:  { cs: [0.30,0.20,0.90], ce: [0.85,0.65,1.00], amp: 0.10,  speed: 1.40 },
  speaking:  { cs: [0.45,0.20,1.00], ce: [0.90,0.50,1.00], amp: 0.22,  speed: 1.10 },
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpArr(a: number[], b: number[], t: number) { return a.map((v, i) => lerp(v, b[i], t)); }

interface OrbProps {
  state: OrbState;
  size?: number;
}

export default function Orb({ state, size = 260 }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<OrbState>(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer({ canvas, width: size, height: size, alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const geometry = new Sphere(gl, { radius: 1, widthSegments: 64, heightSegments: 64 });
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime:       { value: 0 },
        uAmplitude:  { value: STATE_MAP.idle.amp },
        uColorStart: { value: [...STATE_MAP.idle.cs] },
        uColorEnd:   { value: [...STATE_MAP.idle.ce] },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.scale.set(0.78, 0.78, 0.78);

    let curAmp = STATE_MAP.idle.amp;
    let curCS  = [...STATE_MAP.idle.cs];
    let curCE  = [...STATE_MAP.idle.ce];
    let speed  = STATE_MAP.idle.speed;
    let last   = 0;
    let rafId  = 0;

    function render(t: number) {
      rafId = requestAnimationFrame(render);
      const dt  = Math.min((t - last) / 1000, 0.05);
      last = t;

      const s    = STATE_MAP[stateRef.current];
      const LERP = 1 - Math.pow(0.01, dt * 3);
      speed  = lerp(speed,  s.speed, LERP);
      curAmp = lerp(curAmp, s.amp,   LERP);
      curCS  = lerpArr(curCS, s.cs,  LERP);
      curCE  = lerpArr(curCE, s.ce,  LERP);

      program.uniforms.uTime.value      += dt * speed;
      program.uniforms.uAmplitude.value  = curAmp;
      program.uniforms.uColorStart.value = curCS;
      program.uniforms.uColorEnd.value   = curCE;

      mesh.rotation.y += dt * 0.12;
      mesh.rotation.x  = Math.sin(program.uniforms.uTime.value * 0.3) * 0.12;

      renderer.render({ scene: mesh });
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
