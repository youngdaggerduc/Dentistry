import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`
const FRAG = `
  precision highp float; varying vec2 vUv;
  uniform float u_time,u_int; uniform vec2 u_mouse,u_res; uniform vec3 u_deep,u_mid,u_acc;
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1)); vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
  void main(){
    vec2 uv=vUv; float asp=u_res.x/u_res.y; vec2 p=vec2(uv.x*asp,uv.y); vec2 m=vec2(u_mouse.x*asp,u_mouse.y);
    float t=u_time*0.06*u_int;
    vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6+vec2(5.2,1.3)));
    vec2 rr=vec2(fbm(p*1.6+1.8*q+vec2(1.7,9.2)+0.15*t),fbm(p*1.6+1.8*q+vec2(8.3,2.8)-0.12*t));
    float f=fbm(p*1.6+1.8*rr);
    float d=distance(p,m);
    f+=sin(d*16.0-u_time*1.4)*exp(-d*3.0)*0.5*u_int;
    vec3 col=mix(u_deep,u_mid,clamp(f*1.6,0.0,1.0));
    col=mix(col,u_acc,clamp(length(rr)-0.35,0.0,1.0)*0.55);
    col+=u_acc*exp(-d*2.6)*0.35;
    col+=pow(clamp(fbm(p*3.0+rr*2.0+t*2.0),0.0,1.0),3.0)*0.22;
    col=pow(col,vec3(0.92));
    gl_FragColor=vec4(col,1.0);
  }
`

export default function BgCanvas({ palette, mouseRef }) {
  const canvasRef = useRef(null)
  const bgRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(2, devicePixelRatio))

    const scene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const w = palette.water
    const uniforms = {
      u_time:  { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_res:   { value: new THREE.Vector2(1, 1) },
      u_int:   { value: 1 },
      u_deep:  { value: new THREE.Vector3(w.deep[0], w.deep[1], w.deep[2]) },
      u_mid:   { value: new THREE.Vector3(w.mid[0],  w.mid[1],  w.mid[2]) },
      u_acc:   { value: new THREE.Vector3(w.acc[0],  w.acc[1],  w.acc[2]) },
    }

    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))

    const resize = () => {
      const ww = canvas.clientWidth || innerWidth
      const hh = canvas.clientHeight || innerHeight
      renderer.setSize(ww, hh, false)
      uniforms.u_res.value.set(ww, hh)
    }
    resize()
    window.addEventListener('resize', resize)

    bgRef.current = { renderer, scene, cam, uniforms }

    let raf
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const mo = mouseRef?.current || { x: 0.5, y: 0.5 }
      uniforms.u_mouse.value.set(mo.x, mo.y)
      uniforms.u_time.value += 0.016
      renderer.render(scene, cam)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      bgRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!bgRef.current) return
    const { uniforms } = bgRef.current
    const w = palette.water
    uniforms.u_deep.value.set(w.deep[0], w.deep[1], w.deep[2])
    uniforms.u_mid.value.set(w.mid[0],  w.mid[1],  w.mid[2])
    uniforms.u_acc.value.set(w.acc[0],  w.acc[1],  w.acc[2])
  }, [palette])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0 }}
    />
  )
}
