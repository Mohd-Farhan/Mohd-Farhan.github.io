import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// ==========================================================
// CENTRAL LINK CONFIGURATION
// ==========================================================
const SITE_CONFIG = {
  // Contact & Socials
  email: "mailto:mohd.farhan.eng@gmail.com",
  linkedin: "https://linkedin.com/in/mohd-farhan-siddiqui-54433a235",
  github: "https://github.com/Mohd-Farhan",
  leetcode: "https://leetcode.com/mohammadfarhan3255/",
  resume: "/src/resume.pdf", // Make sure this matches the filename in your public/ folder
  
  // Project Links
  tixLive: "https://tix-manager.onrender.com/",
  tixGithub: "https://github.com/Mohd-Farhan/tix-manager",
  weListenGithub: "https://github.com/Mohd-Farhan/WeListen"
};

// Automatically inject links into the HTML
Object.keys(SITE_CONFIG).forEach(key => {
  const elements = document.querySelectorAll(`[data-link="${key}"]`);
  elements.forEach(el => {
    el.href = SITE_CONFIG[key];
    // If it's the email link, auto-fill the visible text as well
    if (key === 'email') {
      el.textContent = SITE_CONFIG[key].replace('mailto:', '');
    }
  });
});

// ==========================================================
// 1. SMOOTH SCROLL (LENIS)
// ==========================================================
const lenis = new Lenis({
  duration: 1.5,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ==========================================================
// 2. THREE.JS NODE GRAPH (BACKEND/MICROSERVICES THEME)
// ==========================================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const systemNetwork = new THREE.Group();
scene.add(systemNetwork);

// Core API / Database
const coreGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const coreMat = new THREE.MeshPhysicalMaterial({
  color: 0x0ea5e9, // Tech Blue to match CSS accent
  metalness: 0.9,
  roughness: 0.2,
  wireframe: true,
  emissive: 0x0284c7,
});
const coreNode = new THREE.Mesh(coreGeo, coreMat);
systemNetwork.add(coreNode);

// Microservices Nodes
const nodeCount = 8;
const satellites = [];
const lines = [];
const lineMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.4 });

for (let i = 0; i < nodeCount; i++) {
  const satGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const satMat = new THREE.MeshStandardMaterial({
    color: i % 2 === 0 ? 0xffffff : 0xaaaaaa,
    emissive: i % 2 === 0 ? 0x222222 : 0x000000,
  });
  const satNode = new THREE.Mesh(satGeo, satMat);
  
  const phi = Math.acos(-1 + (2 * i) / nodeCount);
  const theta = Math.sqrt(nodeCount * Math.PI) * phi;
  const radius = 3.5;
  
  satNode.position.set(
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi)
  );
  
  satNode.userData = { 
    basePos: satNode.position.clone(),
    speed: Math.random() * 0.5 + 0.5 
  };
  
  systemNetwork.add(satNode);
  satellites.push(satNode);

  const points = [new THREE.Vector3(0,0,0), satNode.position];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(lineGeo, lineMat);
  systemNetwork.add(line);
  lines.push({ mesh: line, target: satNode });
}

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 15);
spotLight.position.set(5, 5, 5);
scene.add(spotLight);

// ==========================================================
// 3. GSAP SCROLL ANIMATIONS
// ==========================================================

// Smoothly fade out hero section on scroll to prevent merging issues
gsap.to('.hero-layout', {
  opacity: 0,
  y: 50,
  ease: "none",
  scrollTrigger: {
    trigger: '.hero-section',
    start: "top top",
    end: "bottom center",
    scrub: true
  }
});

// Marquee loop
gsap.to('.marquee-track', {
  xPercent: -50,
  ease: "none",
  duration: 15,
  repeat: -1
});

// Move 3D Network down slightly as you scroll
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '#smooth-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1
  }
});

tl.to(systemNetwork.rotation, { x: Math.PI * 2, y: Math.PI * 2, ease: "none" })
  .to(systemNetwork.position, { x: 3, y: -2, z: -2, ease: "none" }, 0);

// Reveal elements safely as you scroll down
gsap.utils.toArray('.timeline-item, .project-card, .skill-category').forEach((elem) => {
  gsap.fromTo(elem, 
    { opacity: 0, y: 50 },
    {
      opacity: 1, y: 0,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: elem,
        start: "top 85%",
      }
    }
  );
});

// ==========================================================
// 4. RENDER LOOP
// ==========================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();

  satellites.forEach((sat, index) => {
    const { basePos, speed } = sat.userData;
    sat.position.y = basePos.y + Math.sin(elapsedTime * speed) * 0.3;
    sat.position.x = basePos.x + Math.cos(elapsedTime * speed) * 0.3;
    
    const positions = lines[index].mesh.geometry.attributes.position.array;
    positions[3] = sat.position.x;
    positions[4] = sat.position.y;
    positions[5] = sat.position.z;
    lines[index].mesh.geometry.attributes.position.needsUpdate = true;
  });

  systemNetwork.rotation.y += 0.001;
  coreNode.rotation.x += 0.005;
  coreNode.rotation.y += 0.005;

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();