import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import GUI from "lil-gui";

/**
 * Create a reflective water surface.
 * Requires a tiling normal map (e.g., /static/textures/water/waternormals.jpg)
 * and a scene.environment HDR for nice reflections.
 */
export default function createWater({
  size = 200, // plane size
  texturePath = "/textures/water/waterNormal.jpg",
  sunDirection = new THREE.Vector3(1, 1, 1), // rough “sun” direction for highlights
  sunColor = 0xffffff,
  waterColor = 0x001e0f,
  distortionScale = 3.7,
  fog = true,
} = {}) {
  // Geometry
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

  // Tiling normal map
  const waterNormals = new THREE.TextureLoader().load(
    texturePath,
    (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
  );
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

  // Water mesh
  const water = new Water(geometry, {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals,
    sunDirection: sunDirection.clone().normalize(),
    sunColor,
    waterColor,
    distortionScale,
    fog,
  });

  //gui

  //water position
  water.position.set(0, -8, 0);

  // Lay it flat
  water.rotation.x = -Math.PI / 2;

  // Animate shader time uniform
  water.tick = (t /* seconds */) => {
    water.material.uniforms.time.value = t;
  };

  // Cleanup
  water.dispose = () => {
    water.geometry?.dispose();
    water.material?.dispose();
    waterNormals?.dispose();
  };

  return water;
}
