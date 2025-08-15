import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import createWater from "./objects/water.js";
import audioInit, { analyser, frequency } from "./audio.js";
import { makeRippleSphere } from "./objects/makeRippleSphere.js";
import GUI from "lil-gui";

function init() {
  // create a scene, that will hold all our elements such as objects, cameras and lights.
  const scene = new THREE.Scene();

  // setting up environment map
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load("/textures/4k.hdr", (environmentMap) => {
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = environmentMap;
    scene.environment = environmentMap;
  });

  // create a camera, which defines where we're looking at
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  // tell the camera where to look
  camera.position.set(0, 0, 30);
  // create a render and set the size
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  camera.far = 1000; // render farther out
  camera.near = 0.5; // keep as large as you can for precision
  camera.updateProjectionMatrix();

  //setting up lighting
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // shadows setup
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;

  const shadowCam = directionalLight.shadow.camera;
  shadowCam.left = -150;
  shadowCam.right = 150;
  shadowCam.top = 150;
  shadowCam.bottom = -150;
  shadowCam.near = 1;
  shadowCam.far = 400;
  shadowCam.updateProjectionMatrix();

  //**objects */

  const water = createWater({
    size: 2000,
    texturePath: "/static/textures/water/waterNormal.jpg",
  });
  water.receiveShadow = true;

  const sphere = makeRippleSphere(7, 128, 64);

  scene.add(water, sphere);

  //helpers
  //directional light helper
  const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
  lightHelper.visible = false;
  const camHelper = new THREE.CameraHelper(shadowCam);
  camHelper.visible = false;
  scene.add(lightHelper, camHelper);

  //resize
  window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(sizes.width, sizes.height);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // add the output of the render function to the HTML
  document.body.appendChild(renderer.domElement);

  //orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  //audio
  audioInit();

  // function for re-rendering/animating the scene

  const clock = new THREE.Clock();

  let sphereLevel = 0;
  const mat = sphere.material;

  function tick() {
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    analyser.getByteFrequencyData(frequency);

    const n = frequency.length;
    let bassSum = 0;
    const bassEnd = Math.max(1, Math.floor(n * 0.12)); // ~lowest 12% = bass

    //bass loop
    for (let i = 0; i < bassEnd; i++) bassSum += frequency[i];
    const bass = bassSum / bassEnd; // 0..255

    const k = 0.5; // higher = snappier
    sphereLevel += (bass - sphereLevel) * k;

    const s = 1.0 + (sphereLevel / 255) * 0.7; // 1.0..1.7
    sphere.scale.set(s, s, s);

    //mids
    const midsEnd = Math.max(bassEnd + 1, Math.floor(n * 0.5));

    let midsSum = 0;
    for (let i = bassEnd; i < midsEnd; i++) midsSum += frequency[i];
    const mids = midsSum / Math.max(1, midsEnd - bassEnd);

    // smooth
    sphere.userData.mS ??= 0;
    sphere.userData.mS += (mids - sphere.userData.mS) * 0.2;

    // map 0..255 -> amplitude (world units)
    const amp = (sphere.userData.mS / 255) * 5;

    mat.uniforms.uTime.value += dt;
    mat.uniforms.uAmp.value = amp;

    sphere.position.y = 5 + Math.sin(t);

    water.tick?.(t);
    camHelper.update();
    lightHelper.update();
    controls.update();
    requestAnimationFrame(tick);
    renderer.render(scene, camera);
  }
  tick();

  //gui
  const gui = new GUI();
  // gui.add(directionalLight.position, "x").min(-50).max(50).step(0.001);
  // gui.add(directionalLight.position, "y").min(-50).max(50).step(0.001);
  // gui.add(directionalLight.position, "z").min(-50).max(50).step(0.001);
  gui.add(mat.uniforms.uFreq, "value", 0.2, 3.0, 0.01).name("Noise Freq");
  gui.add(mat.uniforms.uSpeed, "value", 0.2, 3.0, 0.01).name("Noise Speed");
}

init();
