import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// ============================================================================
// 1. ACCESSIBILITY & MOTION PREFERENCE CHECK
// ============================================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================================
// 2. LENIS SMOOTH SCROLL INITIALIZATION & GSAP SYNC
// ============================================================================
const lenis = new Lenis({
  duration: prefersReducedMotion ? 0 : 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !prefersReducedMotion,
});

// Synchronize Lenis scroll events with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// Drive Lenis from GSAP's unified ticker for zero-jitter frame sync
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Smooth Anchor Navigation via GSAP ScrollToPlugin
document.querySelectorAll('.hud-nav a').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = `#${anchor.dataset.scroll}`;
    gsap.to(window, {
      duration: prefersReducedMotion ? 0 : 1.4,
      scrollTo: { y: targetId, autoKill: false },
      ease: 'power3.inOut',
    });
  });
});

// ============================================================================
// 3. THREE.JS SCENE, CAMERA & STUDIO 3-POINT LIGHTING
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// Subtle exponential fog for atmospheric depth
scene.fog = new THREE.FogExp2(0x060609, 0.085);

const getResponsiveFOV = () => (window.innerWidth < 768 ? 65 : 45);

const camera = new THREE.PerspectiveCamera(
  getResponsiveFOV(),
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Cap pixel ratio at 2 to prevent GPU overload on 3x/4x Retina screens
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// --- Studio 3-Point Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

// 1. Key Light (Warm White/Cyan tint)
const keyLight = new THREE.DirectionalLight(0xe0faff, 3.2);
keyLight.position.set(5, 5, 5);
scene.add(keyLight);

// 2. Fill Light (Deep Violet contrast)
const fillLight = new THREE.DirectionalLight(0x7000ff, 2.0);
fillLight.position.set(-5, -2, 3);
scene.add(fillLight);

// 3. Rim / Back Light (Sharp Cyan edge highlight)
const rimLight = new THREE.SpotLight(0x00f0ff, 4.5);
rimLight.position.set(0, 6, -5);
scene.add(rimLight);

// ============================================================================
// 4. CENTRAL 3D ARTIFACT (COMPOSITE METALLIC CORE + WIREFRAME CAGE)
// ============================================================================
const artifactGroup = new THREE.Group();
scene.add(artifactGroup);

// Primary Inner Mesh: High-detail Metallic TorusKnot
const coreGeometry = new THREE.TorusKnotGeometry(1.05, 0.32, 180, 32, 2, 3);
const coreMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x161824,
  metalness: 0.88,
  roughness: 0.16,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  emissive: 0x001a22,
  emissiveIntensity: 0.4,
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
artifactGroup.add(coreMesh);

// Secondary Outer Mesh: Geodesic Wireframe Lattice (creates parallax depth)
const cageGeometry = new THREE.IcosahedronGeometry(1.85, 1);
const cageMaterial = new THREE.MeshStandardMaterial({
  color: 0x00f0ff,
  wireframe: true,
  transparent: true,
  opacity: 0.22,
});
const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
artifactGroup.add(cageMesh);

// Ambient surrounding data particles
const particleCount = 350;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 18;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0x00f0ff,
  size: 0.025,
  transparent: true,
  opacity: 0.45,
});
const particleField = new THREE.Points(particleGeo, particleMat);
scene.add(particleField);

// ============================================================================
// 5. GSAP SCROLLTRIGGER -> THREE.JS CHOREOGRAPHY
// ============================================================================
/*
 * HOW THE GSAP-TO-THREE.JS BRIDGE WORKS:
 * Three.js Object3D properties (`position`, `rotation`, `scale`) and Material
 * properties (`color`, `opacity`) are standard JavaScript objects with numeric
 * keys (`x`, `y`, `z`, `r`, `g`, `b`).
 *
 * By passing `artifactGroup.position` or `artifactGroup.rotation` directly as the
 * target of a `gsap.timeline({ scrollTrigger: { scrub: 1.2 } })`, GSAP interpolates
 * those floats on every scroll tick, and the `requestAnimationFrame` loop renders
 * the updated matrix on the next display refresh.
 */

// Initial entrance animation on page load
gsap.from(artifactGroup.scale, {
  x: 0.01,
  y: 0.01,
  z: 0.01,
  duration: prefersReducedMotion ? 0 : 1.8,
  ease: 'expo.out',
});

// Scroll Progress HUD indicator
gsap.to('.scroll-progress-fill', {
  height: '100%',
  ease: 'none',
  scrollTrigger: {
    trigger: '#smooth-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.2,
  },
});

if (!prefersReducedMotion) {
  // Master Scroll Timeline synced to the full height of <main id="smooth-content">
  const masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#smooth-content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // 1.2s smoothing creates a weighty, fluid parallax feel
    },
  });

  // STAGE 1: Intro (#intro) -> Architecture & Telemetry (#about)
  // Shift artifact to the left so the right-aligned HTML card has breathing room
  masterTimeline
    .to(artifactGroup.position, { x: -1.8, y: 0.2, z: -0.5, ease: 'power2.inOut' }, 'stage1')
    .to(artifactGroup.rotation, { x: Math.PI * 0.5, y: Math.PI * 0.75, ease: 'power2.inOut' }, 'stage1')
    .to(artifactGroup.scale, { x: 0.85, y: 0.85, z: 0.85, ease: 'power2.inOut' }, 'stage1')
    .to(cageMesh.scale, { x: 1.25, y: 1.25, z: 1.25, ease: 'power2.inOut' }, 'stage1')

    // STAGE 2: Architecture (#about) -> Experience (#experience - TCS & Emeis)
    // Shift artifact to the right and expand wireframe lattice
    .to(artifactGroup.position, { x: 1.9, y: -0.1, z: 0.4, ease: 'power2.inOut' }, 'stage2')
    .to(artifactGroup.rotation, { x: Math.PI * 1.2, y: Math.PI * 1.6, ease: 'power2.inOut' }, 'stage2')
    .to(coreMaterial.color, { r: 0.05, g: 0.22, b: 0.32, ease: 'none' }, 'stage2')

    // STAGE 3: Experience -> Project 01 (#project-tix - TixManager)
    // Shift left, zoom in closer, heighten metallic emissive glow
    .to(artifactGroup.position, { x: -1.9, y: 0.1, z: 1.1, ease: 'power2.inOut' }, 'stage3')
    .to(artifactGroup.rotation, { x: Math.PI * 2.0, y: Math.PI * 2.4, z: Math.PI * 0.5, ease: 'power2.inOut' }, 'stage3')
    .to(cageMesh.scale, { x: 0.65, y: 0.65, z: 0.65, ease: 'power2.inOut' }, 'stage3')
    .to(cageMaterial, { opacity: 0.5, ease: 'none' }, 'stage3')

    // STAGE 4: Project 01 -> Project 02 (#project-welisten - WeListen)
    // Shift right, elongate scale slightly to create a geometric morph illusion
    .to(artifactGroup.position, { x: 1.8, y: 0.3, z: 0.2, ease: 'power2.inOut' }, 'stage4')
    .to(artifactGroup.rotation, { x: Math.PI * 2.7, y: Math.PI * 3.2, ease: 'power2.inOut' }, 'stage4')
    .to(artifactGroup.scale, { x: 1.1, y: 0.75, z: 1.1, ease: 'power2.inOut' }, 'stage4')
    .to(cageMesh.scale, { x: 1.4, y: 1.4, z: 1.4, ease: 'power2.inOut' }, 'stage4')

    // STAGE 5: Project 02 -> Contact (#contact)
    // Center the artifact behind the contact card and pull camera distance back
    .to(artifactGroup.position, { x: 0, y: 0, z: -1.2, ease: 'power2.inOut' }, 'stage5')
    .to(artifactGroup.rotation, { x: Math.PI * 3.5, y: Math.PI * 4.0, z: 0, ease: 'power2.inOut' }, 'stage5')
    .to(artifactGroup.scale, { x: 1.25, y: 1.25, z: 1.25, ease: 'power2.inOut' }, 'stage5')
    .to(cageMaterial, { opacity: 0.15, ease: 'none' }, 'stage5');
}

// ============================================================================
// 6. HTML SECTION OVERLAY ENTRANCE / EXIT ANIMATIONS
// ============================================================================
document.querySelectorAll('.story-section').forEach((section) => {
  const card = section.querySelector('.section-inner');

  gsap.fromTo(
    card,
    {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 70,
    },
    {
      opacity: 1,
      y: 0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'top 35%',
        scrub: prefersReducedMotion ? false : 0.8,
        toggleActions: 'play none none reverse',
      },
    }
  );
});

// ============================================================================
// 7. WINDOW RESIZE & MOBILE FOV ADAPTATION
// ============================================================================
window.addEventListener('resize', () => {
  camera.fov = getResponsiveFOV();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ============================================================================
// 8. RENDER LOOP (requestAnimationFrame)
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // Continuous subtle idle rotation layered on top of scroll-driven transforms
  if (!prefersReducedMotion) {
    coreMesh.rotation.z = elapsedTime * 0.15;
    cageMesh.rotation.y = -elapsedTime * 0.1;
    particleField.rotation.y = elapsedTime * 0.03;
  }

  renderer.render(scene, camera);
}

animate();