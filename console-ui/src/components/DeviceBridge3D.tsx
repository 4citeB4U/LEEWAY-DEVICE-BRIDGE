import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { DeviceGroupKey, HealthStatus, PlatformKey } from '../data/bridgeData';

export type CameraPreset = 'overview' | 'core' | 'desktop-lane' | 'mobile-lane';
export type BridgeMotionMode = 'live' | 'inspect' | 'paused';

interface DeviceBridge3DProps {
  selectedGroup: DeviceGroupKey | 'all';
  selectedPlatform: PlatformKey | 'all';
  onSelectGroup: (group: DeviceGroupKey | 'all') => void;
  unverifiedPosture: boolean;
  syncPulseNonce: number;
  avgLatencyMs: number;
}

interface NodeDescriptor {
  group: DeviceGroupKey;
  label: string;
  platforms: PlatformKey[];
  status: HealthStatus;
  position: [number, number, number];
  accentHex: number;
}

const NODE_DESCRIPTORS: NodeDescriptor[] = [
  {
    group: 'desktop',
    label: 'Desktop',
    platforms: ['windows'],
    status: 'unverified',
    position: [-5.1, 0, -2.5],
    accentHex: 0x38bdf8,
  },
  {
    group: 'laptop',
    label: 'Laptop',
    platforms: ['apple'],
    status: 'verified',
    position: [-5.5, 0, 0.2],
    accentHex: 0x10b981,
  },
  {
    group: 'mobile',
    label: 'Mobile',
    platforms: ['apple', 'android'],
    status: 'verified',
    position: [-4.6, 0, 2.8],
    accentHex: 0x22d3ee,
  },
  {
    group: 'iot',
    label: 'IoT / Edge',
    platforms: ['linux'],
    status: 'warning',
    position: [5.1, 0, -2.5],
    accentHex: 0xf59e0b,
  },
  {
    group: 'servers',
    label: 'Servers',
    platforms: ['linux'],
    status: 'verified',
    position: [5.5, 0, 0.2],
    accentHex: 0x10b981,
  },
  {
    group: 'tablet',
    label: 'Tablet',
    platforms: ['apple', 'android'],
    status: 'verified',
    position: [4.6, 0, 2.8],
    accentHex: 0x22d3ee,
  },
];

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  overview: { pos: [0, 6.4, 11.4], target: [0, 0.65, 0], label: 'Bridge Overview' },
  core: { pos: [2.8, 3.2, 4.9], target: [0, 0.9, 0], label: 'Nexus Core' },
  'desktop-lane': { pos: [-8.2, 3.6, 5.2], target: [-4.6, 0.5, 0], label: 'Desktop Wing' },
  'mobile-lane': { pos: [8.2, 3.6, 5.2], target: [4.6, 0.5, 0], label: 'Edge Wing' },
};

// Reusable scratch math objects outside the animation loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createProceduralGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#070d15';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDeviceArchetype(
  groupKey: DeviceGroupKey,
  metalMat: THREE.Material,
  darkTrimMat: THREE.Material,
  screenMat: THREE.Material,
  accentMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();

  if (groupKey === 'desktop') {
    // Tower + Monitor + Stand + Keyboard
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.65), darkTrimMat);
    tower.position.set(-0.52, 0.45, -0.05);
    tower.castShadow = true;
    const towerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.04), accentMat);
    towerStrip.position.set(-0.33, 0.45, 0.27);
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), metalMat);
    standBase.position.set(0.22, 0.025, -0.05);
    const standNeck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.08), metalMat);
    standNeck.position.set(0.22, 0.24, -0.1);
    const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.64, 0.06), darkTrimMat);
    monitorFrame.position.set(0.22, 0.62, -0.04);
    monitorFrame.castShadow = true;
    const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.54), screenMat);
    monitorScreen.position.set(0.22, 0.62, -0.005);
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.22), metalMat);
    keyboard.position.set(0.22, 0.015, 0.3);
    g.add(tower, towerStrip, standBase, standNeck, monitorFrame, monitorScreen, keyboard);
  } else if (groupKey === 'laptop') {
    // Sleek unibody laptop
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.05, 0.66), metalMat);
    base.position.set(0, 0.025, 0.06);
    base.castShadow = true;
    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.2), darkTrimMat);
    trackpad.position.set(0, 0.052, 0.22);
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.05, -0.26);
    lidGroup.rotation.x = -0.28;
    const lidShell = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.62, 0.04), metalMat);
    lidShell.position.set(0, 0.31, 0);
    lidShell.castShadow = true;
    const lidScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.53), screenMat);
    lidScreen.position.set(0, 0.31, 0.022);
    const cameraDot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.01), accentMat);
    cameraDot.position.set(0, 0.59, 0.022);
    lidGroup.add(lidShell, lidScreen, cameraDot);
    g.add(base, trackpad, lidGroup);
  } else if (groupKey === 'mobile') {
    // Docked smartphone
    const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.08, 24), darkTrimMat);
    cradle.position.set(0, 0.04, 0);
    const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.82, 0.06), metalMat);
    phoneBody.position.set(0, 0.49, 0);
    phoneBody.rotation.x = -0.14;
    phoneBody.castShadow = true;
    const phoneDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.74), screenMat);
    phoneDisplay.position.set(0, 0.49, 0.032);
    phoneDisplay.rotation.x = -0.14;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.015), accentMat);
    topBar.position.set(0, 0.83, -0.01);
    topBar.rotation.x = -0.14;
    g.add(cradle, phoneBody, phoneDisplay, topBar);
  } else if (groupKey === 'tablet') {
    // Angled pro tablet + stylus
    const standFoot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.36), darkTrimMat);
    standFoot.position.set(0, 0.02, -0.08);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.64, 0.05), metalMat);
    slab.position.set(0, 0.36, 0.04);
    slab.rotation.x = -0.34;
    slab.castShadow = true;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.56), screenMat);
    display.position.set(0, 0.36, 0.068);
    display.rotation.x = -0.34;
    const stylus = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 12), accentMat);
    stylus.rotation.z = Math.PI / 2;
    stylus.position.set(0, 0.025, 0.3);
    g.add(standFoot, slab, display, stylus);
  } else if (groupKey === 'servers') {
    // Multi-blade server rack
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.72), darkTrimMat);
    plinth.position.set(0, 0.04, 0);
    const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.05, 0.64), metalMat);
    rackFrame.position.set(0, 0.58, 0);
    rackFrame.castShadow = true;
    g.add(plinth, rackFrame);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.05), darkTrimMat);
      blade.position.set(0, 0.24 + i * 0.22, 0.32);
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), accentMat);
      ledStrip.position.set(-0.14, 0.24 + i * 0.22, 0.35);
      g.add(blade, ledStrip);
    }
  } else {
    // IoT / Edge Gateway
    const baseHex = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.14, 6), darkTrimMat);
    baseHex.position.set(0, 0.07, 0);
    const coreBox = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.34, 6), metalMat);
    coreBox.position.set(0, 0.31, 0);
    coreBox.castShadow = true;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 12, 24), accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.49, 0);
    const antennaL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.52, 10), metalMat);
    antennaL.position.set(-0.2, 0.64, -0.1);
    const antennaR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.44, 10), metalMat);
    antennaR.position.set(0.2, 0.6, -0.1);
    const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), accentMat);
    tipL.position.set(-0.2, 0.9, -0.1);
    g.add(baseHex, coreBox, collar, antennaL, antennaR, tipL);
  }

  return g;
}

export const DeviceBridge3D: React.FC<DeviceBridge3DProps> = ({
  selectedGroup,
  selectedPlatform,
  onSelectGroup,
  unverifiedPosture,
  syncPulseNonce,
  avgLatencyMs,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [motionMode, setMotionMode] = useState<BridgeMotionMode>('live');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Refs read inside the stable WebGL loop so React updates never tear down the scene
  const selectedGroupRef = useRef(selectedGroup);
  const selectedPlatformRef = useRef(selectedPlatform);
  const unverifiedRef = useRef(unverifiedPosture);
  const motionModeRef = useRef(motionMode);
  const avgLatencyRef = useRef(avgLatencyMs);
  const onSelectGroupRef = useRef(onSelectGroup);
  const desiredPresetRef = useRef<CameraPreset | null>(null);
  const burstBoostRef = useRef(0);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    selectedPlatformRef.current = selectedPlatform;
  }, [selectedPlatform]);

  useEffect(() => {
    unverifiedRef.current = unverifiedPosture;
  }, [unverifiedPosture]);

  useEffect(() => {
    motionModeRef.current = motionMode;
  }, [motionMode]);

  useEffect(() => {
    avgLatencyRef.current = avgLatencyMs;
  }, [avgLatencyMs]);

  useEffect(() => {
    onSelectGroupRef.current = onSelectGroup;
  }, [onSelectGroup]);

  useEffect(() => {
    if (syncPulseNonce > 0) {
      burstBoostRef.current = 1.0;
    }
  }, [syncPulseNonce]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    desiredPresetRef.current = preset;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL viewport unavailable on this device.');
      return;
    }

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 560;
    const initialAspect = width / height;
    const getFovForAspect = (aspect: number) =>
      aspect < 0.95 ? 66 : aspect < 1.25 ? 52 : 42;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b11);
    scene.fog = new THREE.FogExp2(0x060b11, 0.036);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      getFovForAspect(initialAspect),
      initialAspect,
      0.1,
      100,
    );
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 18;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.update();

    controls.addEventListener('start', () => {
      desiredPresetRef.current = null;
    });

    // 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x09111c, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 1.9);
    keyLight.position.set(7, 11, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 28;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.15);
    rimLight.position.set(-7, 5, -8);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0x22d3ee, 2.2, 9, 1.6);
    corePointLight.position.set(0, 1.3, 0);
    scene.add(corePointLight);

    // Floor Grid + Contact Shadow Resources
    const gridTex = createProceduralGridTexture();
    gridTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.84,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(new THREE.CircleGeometry(18, 48), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const shadowTex = createRadialShadowTexture();
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    });

    // Shared PBR Materials
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.24,
      clearcoat: 0.25,
    });
    const darkAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x16202e,
      metalness: 0.65,
      roughness: 0.52,
    });
    const screenPanelMat = new THREE.MeshStandardMaterial({
      color: 0x0b1623,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0.15,
    });
    const nexusGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      metalness: 0.05,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 1,
      ior: 1.55,
      thickness: 1.4,
      clearcoat: 1.0,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
    });
    const cyanBridgeAccentMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.4,
    });

    // Central LeeWay Digital Bridge Nexus (Composite Multi-Part Group)
    const nexusGroup = new THREE.Group();
    const nexusBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.2, 8),
      darkAnodizedMat,
    );
    nexusBase.position.y = 0.1;
    nexusBase.receiveShadow = true;

    const nexusRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.045, 12, 48),
      cyanBridgeAccentMat,
    );
    nexusRim.rotation.x = Math.PI / 2;
    nexusRim.position.y = 0.21;

    // Twin precision bridge arches spanning across left/right wings
    const archGeo = new THREE.TorusGeometry(1.18, 0.055, 14, 48, Math.PI);
    const archFront = new THREE.Mesh(archGeo, titaniumMat);
    archFront.position.set(0, 0.2, 0.42);
    const archBack = new THREE.Mesh(archGeo, titaniumMat);
    archBack.position.set(0, 0.2, -0.42);

    // Core Optical Crystal + Gyroscopic Sync Rings
    const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), nexusGlassMat);
    coreCrystal.position.y = 1.05;

    const innerSyncRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.025, 12, 48),
      cyanBridgeAccentMat,
    );
    innerSyncRing.position.y = 1.05;
    innerSyncRing.rotation.x = Math.PI / 2.6;

    const outerSyncRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.02, 12, 56),
      titaniumMat,
    );
    outerSyncRing.position.y = 1.05;
    outerSyncRing.rotation.y = Math.PI / 4;

    // Cloud Workplane Beacon hovered smoothly above Nexus
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(0, 2.75, 0);
    const cloudDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.78, 0.1, 24),
      darkAnodizedMat,
    );
    const cloudRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.025, 10, 40),
      cyanBridgeAccentMat,
    );
    cloudRim.rotation.x = Math.PI / 2;
    const cloudDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      nexusGlassMat,
    );
    cloudDome.position.y = 0.05;
    cloudGroup.add(cloudDisc, cloudRim, cloudDome);

    // Vertical optical spine from Core Crystal to Cloud Workplane
    const spineBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.4, 12),
      cyanBridgeAccentMat,
    );
    spineBeam.position.y = 2.0;

    const nexusShadow = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), contactShadowMat);
    nexusShadow.rotation.x = -Math.PI / 2;
    nexusShadow.position.y = 0.005;

    nexusGroup.add(
      nexusBase,
      nexusRim,
      archFront,
      archBack,
      coreCrystal,
      innerSyncRing,
      outerSyncRing,
      cloudGroup,
      spineBeam,
      nexusShadow,
    );
    scene.add(nexusGroup);

    // Build 6 Device Wing Nodes + Fiber-Optic Bridge Curves
    interface RuntimeNode {
      descriptor: NodeDescriptor;
      rootGroup: THREE.Group;
      modelGroup: THREE.Group;
      ringMat: THREE.MeshStandardMaterial;
      linkMat: THREE.MeshStandardMaterial;
      curve: THREE.CatmullRomCurve3;
      hitProxy: THREE.Mesh;
      baseY: number;
    }

    const runtimeNodes: RuntimeNode[] = [];
    const hitProxies: THREE.Object3D[] = [];

    for (const desc of NODE_DESCRIPTORS) {
      const rootGroup = new THREE.Group();
      rootGroup.position.set(...desc.position);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.96, 0.1, 24),
        darkAnodizedMat,
      );
      pad.position.y = 0.05;
      pad.receiveShadow = true;

      const ringMat = new THREE.MeshStandardMaterial({
        color: desc.accentHex,
        emissive: desc.accentHex,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.4,
      });
      const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.03, 10, 40), ringMat);
      padRing.rotation.x = Math.PI / 2;
      padRing.position.y = 0.105;

      const nodeShadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), contactShadowMat);
      nodeShadow.rotation.x = -Math.PI / 2;
      nodeShadow.position.y = 0.005;

      const modelGroup = buildDeviceArchetype(
        desc.group,
        titaniumMat,
        darkAnodizedMat,
        screenPanelMat,
        ringMat,
      );
      modelGroup.position.y = 0.1;

      // Orient devices subtly toward the central Digital Bridge
      const angleToCenter = Math.atan2(-desc.position[0], -desc.position[2]);
      modelGroup.rotation.y = angleToCenter;

      // Invisible hit proxy box for smooth raycasting
      const hitProxy = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 1.35, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitProxy.position.y = 0.7;
      hitProxy.userData.groupKey = desc.group;
      hitProxy.userData.label = desc.label;
      hitProxies.push(hitProxy);

      rootGroup.add(pad, padRing, nodeShadow, modelGroup, hitProxy);
      scene.add(rootGroup);

      // Curved Fiber-Optic Bridge Conduit from node pad to Central Nexus
      const startPt = new THREE.Vector3(desc.position[0], 0.24, desc.position[2]);
      const midPt = new THREE.Vector3(
        desc.position[0] * 0.52,
        1.25 + Math.abs(desc.position[2]) * 0.08,
        desc.position[2] * 0.52,
      );
      const endPt = new THREE.Vector3(
        Math.sign(desc.position[0]) * 1.15,
        0.92,
        desc.position[2] * 0.16,
      );
      const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);

      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.024, 8, false);
      const linkMat = new THREE.MeshStandardMaterial({
        color: desc.accentHex,
        emissive: desc.accentHex,
        emissiveIntensity: 0.48,
        roughness: 0.3,
        metalness: 0.3,
        transparent: true,
        opacity: 0.82,
      });
      const conduitMesh = new THREE.Mesh(tubeGeo, linkMat);
      scene.add(conduitMesh);

      runtimeNodes.push({
        descriptor: desc,
        rootGroup,
        modelGroup,
        ringMat,
        linkMat,
        curve,
        hitProxy,
        baseY: 0.1,
      });
    }

    // Center nexus hit proxy to clear filter back to 'all'
    const nexusHitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    nexusHitProxy.position.y = 1.1;
    nexusHitProxy.userData.groupKey = 'all';
    nexusHitProxy.userData.label = 'Bridge Core (All Nodes)';
    scene.add(nexusHitProxy);
    hitProxies.push(nexusHitProxy);

    // InstancedMesh Data Pulse Packets flowing bidirectionally across the bridge
    const packetsPerLink = 5;
    const totalPackets = runtimeNodes.length * packetsPerLink;
    const packetGeo = new THREE.SphereGeometry(0.068, 10, 10);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packetInstanced = new THREE.InstancedMesh(packetGeo, packetMat, totalPackets);
    packetInstanced.frustumCulled = false;
    scene.add(packetInstanced);

    // Raycasting for Click & Hover
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverTime = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        setHoveredLabel(hits[0].object.userData.label as string);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredLabel(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drag
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        const gKey = hits[0].object.userData.groupKey as DeviceGroupKey | 'all';
        onSelectGroupRef.current(
          gKey === selectedGroupRef.current ? 'all' : gKey,
        );
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize Observer
    let viewportW = width;
    let viewportH = height;
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 560;
      viewportW = w;
      viewportH = h;
      const aspect = w / h;
      camera.fov = getFovForAspect(aspect);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation Loop with Software-WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let simTime = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const updateProjectedLabel = (key: string, worldX: number, worldY: number, worldZ: number) => {
      const el = labelRefs.current[key];
      if (!el) return;
      _vecB.set(worldX, worldY, worldZ).project(camera);
      if (_vecB.z > 1) {
        el.style.opacity = '0';
        return;
      }
      const x = ((_vecB.x + 1) / 2) * viewportW;
      const y = ((-_vecB.y + 1) / 2) * viewportH;
      el.style.opacity = '1';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    };

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const mode = motionModeRef.current;
      const speedFactor = mode === 'paused' ? 0 : mode === 'inspect' ? 0.55 : 1.0;

      if (burstBoostRef.current > 0) {
        burstBoostRef.current = Math.max(0, burstBoostRef.current - delta * 0.9);
      }
      const pulseMultiplier = 1 + burstBoostRef.current * 1.8;
      simTime += delta * speedFactor * pulseMultiplier;

      // Subtle professional Core Nexus motion
      coreCrystal.rotation.y = simTime * 0.45;
      coreCrystal.position.y = 1.05 + Math.sin(simTime * 1.4) * 0.04;
      innerSyncRing.rotation.z = simTime * 0.55;
      outerSyncRing.rotation.x = Math.sin(simTime * 0.38) * 0.35;
      outerSyncRing.rotation.y = simTime * 0.25;
      cloudGroup.position.y = 2.75 + Math.sin(simTime * 1.1) * 0.035;

      // Smooth Camera Preset Damping
      const presetKey = desiredPresetRef.current;
      if (presetKey) {
        const preset = CAMERA_PRESETS[presetKey];
        const dampLambda = 6.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, preset.pos[0], dampLambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, preset.pos[1], dampLambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, preset.pos[2], dampLambda, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, preset.target[0], dampLambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, preset.target[1], dampLambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, preset.target[2], dampLambda, delta);

        if (
          Math.abs(camera.position.x - preset.pos[0]) < 0.03 &&
          Math.abs(camera.position.y - preset.pos[1]) < 0.03 &&
          Math.abs(camera.position.z - preset.pos[2]) < 0.03
        ) {
          desiredPresetRef.current = null;
        }
      }
      controls.update();

      // Update Device Node Highlights & Packet Instances
      const activeGroup = selectedGroupRef.current;
      const activePlatform = selectedPlatformRef.current;
      const isUnverifiedMode = unverifiedRef.current;

      let instanceIdx = 0;
      const latencySpeedScale = THREE.MathUtils.clamp(14 / Math.max(3, avgLatencyRef.current), 0.65, 1.7);

      for (let nIdx = 0; nIdx < runtimeNodes.length; nIdx++) {
        const node = runtimeNodes[nIdx];
        const matchesGroup = activeGroup === 'all' || activeGroup === node.descriptor.group;
        const matchesPlatform =
          activePlatform === 'all' || node.descriptor.platforms.includes(activePlatform);
        const isHighlighted =
          (activeGroup !== 'all' && activeGroup === node.descriptor.group) ||
          (activePlatform !== 'all' && node.descriptor.platforms.includes(activePlatform));
        const isDimmed = !matchesGroup || !matchesPlatform;

        // Subtle vertical hover when selected
        const targetLift = isHighlighted ? node.baseY + 0.14 : node.baseY;
        node.modelGroup.position.y = THREE.MathUtils.damp(
          node.modelGroup.position.y,
          targetLift,
          7,
          delta,
        );

        const targetHex = isUnverifiedMode
          ? 0xf59e0b
          : isHighlighted
            ? 0x22d3ee
            : node.descriptor.accentHex;
        _color.setHex(targetHex);
        node.ringMat.color.lerp(_color, 0.2);
        node.ringMat.emissive.lerp(_color, 0.2);
        node.ringMat.emissiveIntensity = isDimmed ? 0.22 : isHighlighted ? 1.25 : 0.72;

        node.linkMat.color.lerp(_color, 0.2);
        node.linkMat.emissive.lerp(_color, 0.2);
        node.linkMat.opacity = isDimmed ? 0.2 : isHighlighted ? 0.96 : 0.76;
        node.linkMat.emissiveIntensity = isDimmed ? 0.12 : isHighlighted ? 0.95 : 0.45;

        // Project 3D label below each pedestal
        updateProjectedLabel(
          node.descriptor.group,
          node.descriptor.position[0],
          -0.12,
          node.descriptor.position[2] + 0.95,
        );

        // Animate traveling cross-platform sync packets along each bridge conduit
        for (let p = 0; p < packetsPerLink; p++) {
          const offset = (p / packetsPerLink + nIdx * 0.13) % 1;
          // Alternate forward/reverse to symbolize bidirectional sync
          const dir = p % 2 === 0 ? 1 : -1;
          const rawT =
            dir === 1
              ? (simTime * 0.28 * latencySpeedScale + offset) % 1
              : 1 - ((simTime * 0.24 * latencySpeedScale + offset) % 1);

          node.curve.getPointAt(rawT, _vecA);
          _dummy.position.copy(_vecA);
          const scale = isDimmed ? 0.55 : isHighlighted ? 1.35 : 1.0;
          _dummy.scale.setScalar(scale);
          _dummy.updateMatrix();
          packetInstanced.setMatrixAt(instanceIdx, _dummy.matrix);
          packetInstanced.setColorAt(instanceIdx, _color);
          instanceIdx++;
        }
      }
      packetInstanced.instanceMatrix.needsUpdate = true;
      if (packetInstanced.instanceColor) packetInstanced.instanceColor.needsUpdate = true;

      // Project Cloud Workplane & Bridge Core labels
      updateProjectedLabel('cloud', 0, 3.45, 0);
      updateProjectedLabel('core', 0, -0.22, 1.55);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Render initial frame immediately and start loop
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      gridTex.dispose();
      shadowTex.dispose();
      floorMat.dispose();
      contactShadowMat.dispose();
      titaniumMat.dispose();
      darkAnodizedMat.dispose();
      screenPanelMat.dispose();
      nexusGlassMat.dispose();
      cyanBridgeAccentMat.dispose();
      packetGeo.dispose();
      packetMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="relative w-full h-[390px] sm:h-[460px] lg:h-full lg:min-h-[580px] rounded-xl border border-slate-800/90 bg-[#060B11] overflow-hidden"
      data-testid="device-bridge-3d"
      data-selected-group={selectedGroup}
      data-bridge-mode={motionMode}
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Interactive 3D Digital Bridge showing cross-platform device synchronization"
      />

      {/* Projected 3D-to-2D Hardware Node Labels (Zero React re-renders; positioned via DOM refs) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {NODE_DESCRIPTORS.map((node) => {
          const isActive =
            selectedGroup === node.group ||
            (selectedPlatform !== 'all' && node.platforms.includes(selectedPlatform));
          return (
            <div
              key={node.group}
              ref={(el) => {
                labelRefs.current[node.group] = el;
              }}
              className={`absolute top-0 left-0 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-opacity ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200'
                  : 'bg-[#0B121B]/85 border border-slate-800 text-slate-300'
              }`}
              style={{ opacity: 0 }}
            >
              {node.label}
            </div>
          );
        })}
        <div
          ref={(el) => {
            labelRefs.current.cloud = el;
          }}
          className="absolute top-0 left-0 px-2 py-0.5 rounded bg-[#0B121B]/85 border border-cyan-500/40 text-[10px] font-medium text-cyan-300 whitespace-nowrap"
          style={{ opacity: 0 }}
        >
          Cloud Workplane
        </div>
        <div
          ref={(el) => {
            labelRefs.current.core = el;
          }}
          className="absolute top-0 left-0 px-2.5 py-0.5 rounded bg-[#0B121B]/90 border border-slate-700 text-[10px] font-semibold text-slate-200 whitespace-nowrap"
          style={{ opacity: 0 }}
        >
          LeeWay Digital Bridge
        </div>
      </div>

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#060B11] text-slate-300 text-sm p-6 text-center">
          {webglError}
        </div>
      )}

      {/* Minimal Top-Left Viewport Title (No pill clutter, no backdrop-filter) */}
      <div className="pointer-events-none absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-start justify-between gap-4">
        <div className="bg-[#0B121B]/90 border border-slate-800/90 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2">
          <div className="text-[11px] font-medium text-cyan-400 tracking-wide">
            3D Digital Bridge · Device-Agnostic Mesh
          </div>
          <div className="text-xs text-slate-300 mt-0.5 tabular-nums hidden sm:block">
            {hoveredLabel
              ? `Inspecting: ${hoveredLabel} (click to filter)`
              : selectedGroup === 'all'
                ? 'Drag to orbit · Scroll to zoom · Click any node to isolate lane'
                : `Focused Node: ${selectedGroup.toUpperCase()} · Click center core to reset`}
          </div>
        </div>

        {/* Clean static state label */}
        <div className="bg-[#0B121B]/90 border border-slate-800/90 rounded-lg px-3 py-2 text-right hidden sm:block">
          <div className="text-[11px] text-slate-400">Sync Posture</div>
          <div
            className={`text-xs font-medium mt-0.5 ${
              unverifiedPosture ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {unverifiedPosture ? 'Observed · Unverified' : 'Cross-OS Mesh Active'}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[780px] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0B121B]/95 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
          aria-expanded={!dockCollapsed}
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Bridge Controls (H)' : 'Hide Controls (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full bg-[#0B121B]/95 border border-slate-800 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 shadow-lg overflow-x-auto">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                View
              </span>
              {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyCameraPreset(key)}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    cameraPreset === key
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Motion & Reset Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setMotionMode('live')}
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    motionMode === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setMotionMode('inspect')}
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    motionMode === 'inspect'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Slow
                </button>
                <button
                  type="button"
                  onClick={() => setMotionMode('paused')}
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    motionMode === 'paused'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Pause className="w-3 h-3" />
                  Pause
                </button>
              </div>

              {selectedGroup !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectGroup('all')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  All Nodes
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
