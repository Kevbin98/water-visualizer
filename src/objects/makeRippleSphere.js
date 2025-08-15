import * as THREE from "three";

export function makeRippleSphere(
  radius = 7,
  segW = 150,
  segH = 60,
  color = 0x50afa3
) {
  const geo = new THREE.SphereGeometry(radius, segW, segH);

  const mat = new THREE.ShaderMaterial({
    wireframe: true,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0 }, // drive with audio (0..~0.5)
      uFreq: { value: 0.9 }, // spatial frequency
      uSpeed: { value: 1.1 }, // noise flow speed
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uAmp, uFreq, uSpeed;

      // --- Simplex-ish noise (tiny, good enough) ---
      vec3 hash3(vec3 p){
        p = vec3(dot(p,vec3(127.1,311.7,74.7)),
                 dot(p,vec3(269.5,183.3,246.1)),
                 dot(p,vec3(113.5,271.9,124.6)));
        return -1.0 + 2.0*fract(sin(p)*43758.5453123);
      }
      float noise(vec3 x){
        vec3 i = floor(x);
        vec3 f = fract(x);
        vec3 u = f*f*(3.0-2.0*f);
        return mix(mix(mix( dot( hash3(i+vec3(0,0,0)), f-vec3(0,0,0) ),
                             dot( hash3(i+vec3(1,0,0)), f-vec3(1,0,0) ), u.x),
                        mix( dot( hash3(i+vec3(0,1,0)), f-vec3(0,1,0) ),
                             dot( hash3(i+vec3(1,1,0)), f-vec3(1,1,0) ), u.x), u.y),
                   mix(mix( dot( hash3(i+vec3(0,0,1)), f-vec3(0,0,1) ),
                             dot( hash3(i+vec3(1,0,1)), f-vec3(1,0,1) ), u.x),
                        mix( dot( hash3(i+vec3(0,1,1)), f-vec3(0,1,1) ),
                             dot( hash3(i+vec3(1,1,1)), f-vec3(1,1,1) ), u.x), u.y), u.z);
      }

      varying vec3 vNormalW;

      void main() {
        vNormalW = normal;

        vec3 p = position;
        // sample smooth noise field that “flows” over time
        float n =
          noise(p * uFreq + vec3(0.0, 0.0, uTime * uSpeed)) * 0.6 +
          noise(p * uFreq * 2.0 + vec3(uTime * 0.7)) * 0.4;

        // displace along normal by audio-driven amplitude
        vec3 displaced = p + normal * (n * uAmp);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormalW;
      void main() {
        // simple normal-based shading
        float nd = 0.5 + 0.5 * normalize(vNormalW).z;
        gl_FragColor = vec4(uColor * (0.6 + 0.4 * nd), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
