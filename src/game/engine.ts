/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraViewMode,
  HighwayMode,
  IndicatorState,
  TrafficEntity,
  VehicleArchetype,
  BusLivery,
  GameScoreState,
  WeatherMode,
} from './types';
import {
  getLaneConfiguration,
  getRoadBounds,
  isInCounterLane,
  getEntityAABB,
  checkAABBCollision,
  checkNearMiss,
  calculateOvertakeBonus,
  msToKmh,
  kmhToMs,
  getArchetypeSpecs,
  LaneInfo,
  isLaneClear,
  isLaneChangeSafe,
  resolveVehicleOverlaps,
  calculateRealisticPlayerSpeedStep,
  SPEED_WORLD_SCALE,
  evaluateHornYield,
} from './trafficRules';
import {
  BUS_LIVERIES,
} from './proceduralTextures';
import {
  createBusMesh,
  createTruckMesh,
  createCNGMesh,
  createLegunaMesh,
  createMicrobusMesh,
  createRoadSegment,
  createHighwayGantry,
  VehicleMeshObject,
} from './models';
import { audioManager } from './audio';
import { MirrorManager } from './mirrors';

export interface GameEngineCallbacks {
  onScoreUpdate: (scoreState: GameScoreState) => void;
  onGameOver: (finalStats: GameScoreState) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  // Three.js Core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private isSoftwareGl: boolean;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Environment & Weather
  private weatherMode: WeatherMode = 'day';
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private playerHeadlightL!: THREE.SpotLight;
  private playerHeadlightR!: THREE.SpotLight;
  private headlightTargetL!: THREE.Object3D;
  private headlightTargetR!: THREE.Object3D;
  private headlightConeL!: THREE.Mesh;
  private headlightConeR!: THREE.Mesh;
  private mirrorManager: MirrorManager;

  // Road Chunks System
  private highwayMode: HighwayMode = 'divided_4lane';
  private lanes: LaneInfo[] = [];
  private roadSegments: THREE.Group[] = [];
  private readonly SEGMENT_LENGTH = 120;
  private readonly NUM_SEGMENTS = 4;
  private nextSegmentZ = 0;

  // Player Bus
  private playerBusMesh: VehicleMeshObject;
  private playerLivery: BusLivery = BUS_LIVERIES[0];
  private playerX = 4.5;
  private playerY = 0;
  private playerZ = 0;
  private playerSpeed = 0; // m/s
  private playerMaxSpeed = kmhToMs(134); // 134 km/h theoretical terminal speed (130 km/h is tough to meet)
  private playerSteerAngle = 0;
  private playerSteerSpeed = 12.0;
  private playerIndicator: IndicatorState = 'none';
  private indicatorBlinkTimer = 0;
  private indicatorBlinkState = false;

  // Cameras
  private cameraMode: CameraViewMode = 'chase';
  private cameraShake = 0;

  // Traffic System
  private trafficEntities: TrafficEntity[] = [];
  private trafficMeshMap = new Map<number, VehicleMeshObject>();
  private nextTrafficId = 1;
  private maxTrafficCount = 14;
  private spawnCooldown = 0;

  // Scoring & Stats
  private distanceTraveled = 0;
  private score = 0;
  private takaEarned = 0;
  private nearMissCount = 0;
  private counterLaneMeters = 0;
  private maxSpeedKmh = 0;
  private nearMissAwardedSet = new Set<number>();
  private closeOvertakeNotification: GameScoreState['closeOvertakeNotification'] = null;

  // Controls input state
  private input = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    horn: false,
  };

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    (window as unknown as { __ENGINE__?: GameEngine }).__ENGINE__ = this;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera Setup
    this.scene = new THREE.Scene();
    const skyColor = 0x87ceeb;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.2,
      600
    );

    this.clock = new THREE.Clock();

    // 4. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Setup (Deliberate warm sun + cool hemisphere contrast)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.sunLight.position.set(40, 80, -20);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x166534, 1.1);
    this.scene.add(this.hemiLight);

    // Projector Headlight Spotlights on the Bus (Left + Right)
    this.playerHeadlightL = new THREE.SpotLight(0xfffaed, 0.5, 120, 0.42, 0.6, 1.2);
    this.playerHeadlightL.castShadow = !this.isSoftwareGl;
    this.playerHeadlightR = new THREE.SpotLight(0xfffaed, 0.5, 120, 0.42, 0.6, 1.2);
    this.playerHeadlightR.castShadow = !this.isSoftwareGl;

    this.headlightTargetL = new THREE.Object3D();
    this.headlightTargetR = new THREE.Object3D();
    this.scene.add(this.headlightTargetL);
    this.scene.add(this.headlightTargetR);
    this.playerHeadlightL.target = this.headlightTargetL;
    this.playerHeadlightR.target = this.headlightTargetR;

    this.scene.add(this.playerHeadlightL);
    this.scene.add(this.playerHeadlightR);

    // Volumetric Light Cones for Night and Winter Fog
    const coneGeo = new THREE.ConeGeometry(3.5, 38, 16, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 19);
    const coneMatL = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coneMatR = coneMatL.clone();

    this.headlightConeL = new THREE.Mesh(coneGeo, coneMatL);
    this.headlightConeR = new THREE.Mesh(coneGeo, coneMatR);
    this.headlightConeL.visible = false;
    this.headlightConeR.visible = false;
    this.scene.add(this.headlightConeL);
    this.scene.add(this.headlightConeR);

    // 6. Mirror Manager
    this.mirrorManager = new MirrorManager();

    // 7. Player Bus Creation
    this.playerBusMesh = createBusMesh(this.playerLivery, true);
    this.mirrorManager.attachToBus(this.playerBusMesh);
    this.scene.add(this.playerBusMesh);

    // 8. Build Road Network
    this.initRoad();

    // 9. Initial Camera Staging (Showcases hero bus on the highway on Title Screen)
    this.camera.position.set(this.playerX - 2.5, 4.2, this.playerZ - 12.0);
    this.camera.lookAt(this.playerX, 2.0, this.playerZ + 15);
    this.playerBusMesh.position.set(this.playerX, 0, this.playerZ);

    // Initial render
    this.renderer.render(this.scene, this.camera);

    // 10. Resize Listener
    window.addEventListener('resize', this.onWindowResize);

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public setHighwayMode(mode: HighwayMode) {
    if (this.highwayMode === mode) return;
    this.highwayMode = mode;
    this.lanes = getLaneConfiguration(mode);

    // Reset road segments
    this.roadSegments.forEach((segment) => this.scene.remove(segment));
    this.roadSegments = [];
    this.initRoad();

    // Re-position player on forward slow lane
    const forwardSlowLane = this.lanes.find((l) => !l.isOncoming);
    if (forwardSlowLane) {
      this.playerX = forwardSlowLane.centerX;
    }
  }

  public setLivery(livery: BusLivery) {
    this.playerLivery = livery;
    const oldMesh = this.playerBusMesh;
    this.scene.remove(oldMesh);

    this.playerBusMesh = createBusMesh(livery, true);
    this.playerBusMesh.position.set(this.playerX, this.playerY, this.playerZ);
    this.mirrorManager.attachToBus(this.playerBusMesh);
    this.scene.add(this.playerBusMesh);
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraViewMode {
    return this.cameraMode;
  }

  public toggleCameraMode(): CameraViewMode {
    if (this.cameraMode === 'chase') this.setCameraMode('cockpit');
    else if (this.cameraMode === 'cockpit') this.setCameraMode('hood');
    else this.setCameraMode('chase');
    return this.cameraMode;
  }

  public setWeatherMode(mode: WeatherMode) {
    this.weatherMode = mode;
    if (mode === 'day') {
      const sky = new THREE.Color(0x87ceeb);
      this.scene.background = sky;
      this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.007);
      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = 2.2;
      this.hemiLight.color.setHex(0xb1e1ff);
      this.hemiLight.groundColor.setHex(0x166534);
      this.hemiLight.intensity = 1.1;

      this.playerHeadlightL.intensity = 0.5;
      this.playerHeadlightR.intensity = 0.5;
      this.headlightConeL.visible = false;
      this.headlightConeR.visible = false;
    } else if (mode === 'night') {
      const nightSky = new THREE.Color(0x060913);
      this.scene.background = nightSky;
      this.scene.fog = new THREE.FogExp2(0x060913, 0.012);
      this.sunLight.color.setHex(0x38bdf8);
      this.sunLight.intensity = 0.35;
      this.hemiLight.color.setHex(0x0f172a);
      this.hemiLight.groundColor.setHex(0x022c22);
      this.hemiLight.intensity = 0.28;

      this.playerHeadlightL.color.setHex(0xfffaed);
      this.playerHeadlightR.color.setHex(0xfffaed);
      this.playerHeadlightL.intensity = 8.5;
      this.playerHeadlightR.intensity = 8.5;

      (this.headlightConeL.material as THREE.MeshBasicMaterial).color.setHex(0xfffbeb);
      (this.headlightConeL.material as THREE.MeshBasicMaterial).opacity = 0.16;
      (this.headlightConeR.material as THREE.MeshBasicMaterial).color.setHex(0xfffbeb);
      (this.headlightConeR.material as THREE.MeshBasicMaterial).opacity = 0.16;
      this.headlightConeL.visible = true;
      this.headlightConeR.visible = true;
    } else if (mode === 'fog') {
      // Signature Bangladeshi winter river-basin morning fog
      const fogSky = new THREE.Color(0x94a3b8);
      this.scene.background = fogSky;
      this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.024);
      this.sunLight.color.setHex(0xfef08a);
      this.sunLight.intensity = 0.85;
      this.hemiLight.color.setHex(0x94a3b8);
      this.hemiLight.groundColor.setHex(0x334155);
      this.hemiLight.intensity = 0.65;

      // Piercing warm amber fog lights
      this.playerHeadlightL.color.setHex(0xfbbf24);
      this.playerHeadlightR.color.setHex(0xfbbf24);
      this.playerHeadlightL.intensity = 7.0;
      this.playerHeadlightR.intensity = 7.0;

      (this.headlightConeL.material as THREE.MeshBasicMaterial).color.setHex(0xfbbf24);
      (this.headlightConeL.material as THREE.MeshBasicMaterial).opacity = 0.22;
      (this.headlightConeR.material as THREE.MeshBasicMaterial).color.setHex(0xfbbf24);
      (this.headlightConeR.material as THREE.MeshBasicMaterial).opacity = 0.22;
      this.headlightConeL.visible = true;
      this.headlightConeR.visible = true;
    }
  }

  public getWeatherMode(): WeatherMode {
    return this.weatherMode;
  }

  public toggleWeatherMode(): WeatherMode {
    if (this.weatherMode === 'day') this.setWeatherMode('night');
    else if (this.weatherMode === 'night') this.setWeatherMode('fog');
    else this.setWeatherMode('day');
    return this.weatherMode;
  }

  public setIndicator(indicator: IndicatorState) {
    if (this.playerIndicator === indicator) {
      this.playerIndicator = 'none'; // toggle off if already active
    } else {
      this.playerIndicator = indicator;
      audioManager.playIndicatorTick(false);
    }
  }

  public getIndicator(): IndicatorState {
    return this.playerIndicator;
  }

  public blastAirHorn() {
    audioManager.playBanglaAirHorn();

    // Only the vehicle directly in front of the player (in player's lane) gives side,
    // and ONLY if there is enough space available! Vehicles in other lanes NEVER react.
    const evalResult = evaluateHornYield(
      this.playerX,
      this.playerZ,
      this.trafficEntities,
      this.highwayMode
    );

    if (evalResult.shouldYield && evalResult.targetNpcId && evalResult.targetYieldX !== undefined) {
      const npc = this.trafficEntities.find((e) => e.id === evalResult.targetNpcId);
      if (npc) {
        const specs = getArchetypeSpecs(npc.archetype);
        if (Math.random() <= specs.honkYieldProbability) {
          npc.honkedReactionTimer = 4.0;
          npc.yieldTargetX = evalResult.targetYieldX;
          npc.indicator = 'left';
          npc.indicatorTimer = 4.0;
        }
      }
    }
  }

  public setInput(inputKey: keyof typeof this.input, value: boolean) {
    this.input[inputKey] = value;
    if (inputKey === 'horn' && value) {
      this.blastAirHorn();
    }
    if (inputKey === 'brake' && value && this.playerSpeed > kmhToMs(20)) {
      audioManager.playAirBrakeHiss();
    }
  }

  public getTrafficEntities(): TrafficEntity[] {
    return this.trafficEntities;
  }

  public getPlayerSpeedMs(): number {
    return this.playerSpeed;
  }

  private initRoad() {
    this.lanes = getLaneConfiguration(this.highwayMode);
    // In Bangladeshi LHT, forward lanes are on the Left (+X)
    const forwardLanes = this.lanes.filter((l) => !l.isOncoming);
    this.playerX = forwardLanes[0] ? forwardLanes[0].centerX : 4.5;
    this.playerZ = 0;
    this.nextSegmentZ = -this.SEGMENT_LENGTH;

    for (let i = 0; i < this.NUM_SEGMENTS; i++) {
      const segment = createRoadSegment(this.highwayMode, this.SEGMENT_LENGTH);
      segment.position.z = this.nextSegmentZ;
      this.scene.add(segment);
      this.roadSegments.push(segment);

      // Add overhead gantry sign every 3 segments
      if (i % 3 === 0) {
        const gantry = createHighwayGantry(30);
        gantry.position.set(0, 0, this.nextSegmentZ + 20);
        this.scene.add(gantry);
      }

      this.nextSegmentZ += this.SEGMENT_LENGTH;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    audioManager.startEngine();

    const tick = () => {
      if (!this.isRunning) return;

      const delta = Math.min(this.clock.getDelta(), 0.1);

      if (!this.isPaused) {
        this.updateSimulation(delta);
      }

      // Render Mirrors ONLY when in Cockpit mode
      if (this.cameraMode === 'cockpit') {
        this.mirrorManager.renderMirror(
          this.renderer,
          this.scene,
          this.playerBusMesh,
          true,
          this.isSoftwareGl
        );
      }

      // Render primary camera
      this.renderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  public pause() {
    this.isPaused = true;
    audioManager.stopEngine();
  }

  public resume() {
    this.isPaused = false;
    this.clock.start();
    audioManager.startEngine();
  }

  public reset() {
    this.playerSpeed = 0;
    this.playerZ = 0;
    const forwardLanes = this.lanes.filter((l) => !l.isOncoming);
    this.playerX = forwardLanes[0] ? forwardLanes[0].centerX : 4.5;
    this.playerSteerAngle = 0;
    this.distanceTraveled = 0;
    this.score = 0;
    this.takaEarned = 0;
    this.nearMissCount = 0;
    this.counterLaneMeters = 0;
    this.maxSpeedKmh = 0;
    this.nearMissAwardedSet.clear();
    this.closeOvertakeNotification = null;

    // Clear traffic
    this.trafficEntities.forEach((npc) => {
      const mesh = this.trafficMeshMap.get(npc.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.trafficEntities = [];
    this.trafficMeshMap.clear();

    // Reset road segments
    this.roadSegments.forEach((seg, idx) => {
      seg.position.z = (idx - 1) * this.SEGMENT_LENGTH;
    });
    this.nextSegmentZ = (this.NUM_SEGMENTS - 1) * this.SEGMENT_LENGTH;

    this.playerBusMesh.position.set(this.playerX, 0, this.playerZ);
    this.playerBusMesh.rotation.set(0, 0, 0);

    audioManager.startEngine();
  }

  private updateSimulation(dt: number) {
    // 1. Heavy Bus Powertrain Dynamics & Aerodynamics
    // Reaching 130 km/h is tough and requires sustained uninterrupted full-throttle driving
    this.playerSpeed = calculateRealisticPlayerSpeedStep(
      this.playerSpeed,
      this.input.accelerate,
      this.input.brake,
      dt,
      134
    );

    // 2. Heavy Bus Steering Physics
    // In driver's +Z perspective, Left is +X and Right is -X
    let targetSteer = 0;
    if (this.input.steerLeft) targetSteer += 1.0;  // Increases X -> Steers Left
    if (this.input.steerRight) targetSteer -= 1.0; // Decreases X -> Steers Right

    // Exponential damping on steering
    this.playerSteerAngle = THREE.MathUtils.damp(
      this.playerSteerAngle,
      targetSteer,
      this.playerSteerSpeed,
      dt
    );

    // Lateral displacement scaled by speed (steering has no effect when stationary)
    const speedRatio = this.playerSpeed / this.playerMaxSpeed;
    const lateralSpeed = 7.5 * this.playerSteerAngle * Math.min(speedRatio * 1.5, 1.0);
    this.playerX += lateralSpeed * dt;

    // Road Bounds Enforcing
    const bounds = getRoadBounds(this.highwayMode);
    this.playerX = THREE.MathUtils.clamp(
      this.playerX,
      bounds.minX + 1.3,
      bounds.maxX - 1.3
    );

    // Advance longitudinal player position with calibrated optical world speed
    this.playerZ += this.playerSpeed * SPEED_WORLD_SCALE * dt;
    this.distanceTraveled += this.playerSpeed * dt;

    const currentSpeedKmh = msToKmh(this.playerSpeed);
    if (currentSpeedKmh > this.maxSpeedKmh) {
      this.maxSpeedKmh = currentSpeedKmh;
    }

    // Check Counter-Lane Intrusion
    const inCounterLane = isInCounterLane(this.playerX, this.highwayMode);
    if (inCounterLane && this.playerSpeed > kmhToMs(50)) {
      this.counterLaneMeters += this.playerSpeed * dt;
      // Continuous high-risk counter-lane score multiplier
      this.score += Math.floor(dt * currentSpeedKmh * 1.8);
      this.takaEarned += Math.floor(dt * 20);
    } else {
      this.score += Math.floor(dt * currentSpeedKmh * 0.5);
    }

    // 3. Heavy Vehicle Body Roll and Steering Animation
    // Visual suspension roll on rapid lane changes
    const bodyRoll = this.playerSteerAngle * 0.08 * speedRatio;
    this.playerBusMesh.rotation.z = bodyRoll;
    this.playerBusMesh.rotation.y = this.playerSteerAngle * 0.04;
    this.playerBusMesh.position.set(this.playerX, 0, this.playerZ);

    // Update Projector Headlights and Volumetric Cones
    const frontZ = this.playerZ + 5.8;
    this.playerHeadlightL.position.set(this.playerX + 0.95, 0.82, frontZ);
    this.headlightTargetL.position.set(this.playerX + 0.95 + this.playerSteerAngle * 1.5, 0.1, frontZ + 55);

    this.playerHeadlightR.position.set(this.playerX - 0.95, 0.82, frontZ);
    this.headlightTargetR.position.set(this.playerX - 0.95 + this.playerSteerAngle * 1.5, 0.1, frontZ + 55);

    if (this.headlightConeL.visible) {
      this.headlightConeL.position.set(this.playerX + 0.95, 0.82, frontZ);
      this.headlightConeL.rotation.y = this.playerSteerAngle * 0.05;
      this.headlightConeR.position.set(this.playerX - 0.95, 0.82, frontZ);
      this.headlightConeR.rotation.y = this.playerSteerAngle * 0.05;
    }

    // Rotate driver's steering wheel in cockpit
    if (this.playerBusMesh.steeringWheel) {
      this.playerBusMesh.steeringWheel.rotation.z = this.playerSteerAngle * 1.8;
    }

    // Rotate tires with speed
    const wheelCircumference = Math.PI * 1.1; // 1.1m diameter
    const wheelRotDelta = (this.playerSpeed * SPEED_WORLD_SCALE * dt) / wheelCircumference;
    if (this.playerBusMesh.wheels) {
      this.playerBusMesh.wheels.forEach((wheel, idx) => {
        wheel.rotation.x += wheelRotDelta * Math.PI * 2;
        // Turn front wheels with steering
        if (idx < 2) {
          wheel.rotation.y = this.playerSteerAngle * 0.35;
        }
      });
    }

    // 4. Update Audio Engine
    audioManager.updateEngine(
      currentSpeedKmh,
      this.input.accelerate ? 1.0 : this.input.brake ? 0 : 0.2
    );

    // 5. Update Indicators Blinking
    this.indicatorBlinkTimer += dt;
    if (this.indicatorBlinkTimer >= 0.35) {
      this.indicatorBlinkTimer = 0;
      this.indicatorBlinkState = !this.indicatorBlinkState;
      if (this.playerIndicator !== 'none') {
        audioManager.playIndicatorTick(this.indicatorBlinkState);
      }
    }
    this.updateBlinkingIndicators();

    // 6. Update Scrolling Road Network
    this.updateRoadSegments();

    // 7. Update Traffic AI & Collisions
    this.updateTraffic(dt);

    // 8. Update Camera Rig
    this.updateCamera(dt);

    // 9. Close Overtake Notification Timer
    if (this.closeOvertakeNotification && Date.now() - this.closeOvertakeNotification.timestamp > 1800) {
      this.closeOvertakeNotification = null;
    }

    // 10. Notify React HUD
    this.callbacks.onScoreUpdate({
      distanceTraveledMeters: Math.round(this.distanceTraveled),
      currentSpeedKmh,
      score: this.score,
      takaEarned: this.takaEarned,
      nearMissCount: this.nearMissCount,
      counterLaneMeters: Math.round(this.counterLaneMeters),
      maxSpeedKmh: this.maxSpeedKmh,
      closeOvertakeNotification: this.closeOvertakeNotification,
    });
  }

  private updateBlinkingIndicators() {
    const isLeftOn =
      (this.playerIndicator === 'left' || this.playerIndicator === 'hazard') &&
      this.indicatorBlinkState;
    const isRightOn =
      (this.playerIndicator === 'right' || this.playerIndicator === 'hazard') &&
      this.indicatorBlinkState;

    if (this.playerBusMesh.indicatorLeftMesh) {
      this.playerBusMesh.indicatorLeftMesh.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isLeftOn ? 0xff7700 : 0x000000);
      });
    }

    if (this.playerBusMesh.indicatorRightMesh) {
      this.playerBusMesh.indicatorRightMesh.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isRightOn ? 0xff7700 : 0x000000);
      });
    }

    // Brake lights
    const isBraking = this.input.brake;
    if (this.playerBusMesh.brakeLightsMesh) {
      this.playerBusMesh.brakeLightsMesh.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBraking ? 0xff0000 : 0x330000);
      });
    }
  }

  private updateRoadSegments() {
    // Keep sun shadow frustum centered near player
    this.sunLight.position.set(
      this.playerX + 40,
      80,
      this.playerZ - 20
    );
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ + 40);
    this.sunLight.target.updateMatrixWorld();

    // Check if player has passed the oldest road segment
    this.roadSegments.forEach((segment) => {
      if (segment.position.z + this.SEGMENT_LENGTH < this.playerZ - 60) {
        segment.position.z = this.nextSegmentZ;
        this.nextSegmentZ += this.SEGMENT_LENGTH;
      }
    });
  }

  private spawnTraffic() {
    if (this.trafficEntities.length >= this.maxTrafficCount) return;

    // Archetype selection based on Bangladeshi highway distribution:
    // 35% Intercity express coach (90-112 km/h)
    // 24% Heavy overloaded Tata/Bedford truck (46-62 km/h)
    // 17% Toyota HiAce / Noah express microbus (78-95 km/h)
    // 12% Green 3-wheeler auto-rickshaw (36-48 km/h)
    // 12% Human hauler Leguna (56-70 km/h)
    const rand = Math.random();
    let archetype: VehicleArchetype;
    if (rand < 0.35) archetype = 'bus';
    else if (rand < 0.59) archetype = 'truck';
    else if (rand < 0.76) archetype = 'microbus';
    else if (rand < 0.88) archetype = 'cng';
    else archetype = 'leguna';

    // Realistic lane assignment with speed-based lane discipline:
    // Slower vehicles (CNG, overloaded trucks) heavily prefer outer slow lanes (Lane 0 / Lane 3)
    let randomLane: LaneInfo;
    if (this.highwayMode === 'divided_4lane') {
      if (archetype === 'cng' || archetype === 'truck') {
        if (Math.random() < 0.85) {
          const slowLanes = this.lanes.filter((l) => l.index === 0 || l.index === 3);
          randomLane = slowLanes.length > 0 ? slowLanes[Math.floor(Math.random() * slowLanes.length)] : this.lanes[0];
        } else {
          randomLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        }
      } else {
        randomLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
      }
    } else {
      randomLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
    }

    const specs = getArchetypeSpecs(archetype);
    // Draw individual cruising speed with unique driver variation
    const speedKmh = THREE.MathUtils.randFloat(specs.minSpeedKmh, specs.maxSpeedKmh);
    const speedMs = kmhToMs(speedKmh);

    // Spawn either ahead or behind
    let spawnZ: number;
    if (randomLane.isOncoming) {
      // Oncoming traffic spawns far ahead and drives toward player (-Z)
      spawnZ = this.playerZ + THREE.MathUtils.randFloat(180, 260);
    } else {
      // Forward traffic spawns either far ahead (slower) or behind (faster)
      const spawnAhead = Math.random() < 0.8;
      spawnZ = spawnAhead
        ? this.playerZ + THREE.MathUtils.randFloat(70, 180)
        : this.playerZ - THREE.MathUtils.randFloat(40, 90);
    }

    // Check if spawn position overlaps existing entity using isLaneClear
    const isClear = isLaneClear(
      randomLane.centerX,
      spawnZ,
      specs.length,
      this.trafficEntities,
      -1,
      35,
      28
    );
    if (!isClear) return;

    // Strict clearance check with player bus
    const playerDist = Math.abs(spawnZ - this.playerZ);
    const sameLaneAsPlayer = Math.abs(randomLane.centerX - this.playerX) < 2.5;
    if (sameLaneAsPlayer && playerDist < 35) return;
    if (playerDist < 18) return;

    const id = this.nextTrafficId++;
    let livery: BusLivery | undefined;
    if (archetype === 'bus') {
      const otherLiveries = BUS_LIVERIES.filter((l) => l.id !== this.playerLivery.id);
      livery = otherLiveries[Math.floor(Math.random() * otherLiveries.length)];
    }

    const entity: TrafficEntity = {
      id,
      archetype,
      livery,
      x: randomLane.centerX,
      y: 0,
      z: spawnZ,
      speed: speedMs,
      targetSpeed: speedMs, // Retain individual cruising speed target
      width: specs.width,
      length: specs.length,
      height: specs.height,
      currentLane: randomLane.index,
      targetLane: randomLane.index,
      isLaneChanging: false,
      laneChangeProgress: 0,
      indicator: 'none',
      indicatorTimer: 0,
      isOncoming: randomLane.isOncoming,
      isOvertakingCounterLane: false,
      counterLaneTimer: 0,
      honkedReactionTimer: 0,
    };

    // Create 3D Mesh
    let mesh: VehicleMeshObject;
    if (archetype === 'bus') {
      mesh = createBusMesh(livery);
    } else if (archetype === 'truck') {
      mesh = createTruckMesh();
    } else if (archetype === 'cng') {
      mesh = createCNGMesh();
    } else if (archetype === 'microbus') {
      mesh = createMicrobusMesh();
    } else {
      mesh = createLegunaMesh();
    }

    // If oncoming, rotate 180 degrees to face player
    if (randomLane.isOncoming) {
      mesh.rotation.y = Math.PI;
    }

    mesh.position.set(entity.x, entity.y, entity.z);
    this.scene.add(mesh);

    this.trafficEntities.push(entity);
    this.trafficMeshMap.set(id, mesh);
  }

  private updateTraffic(dt: number) {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnTraffic();
      this.spawnCooldown = THREE.MathUtils.randFloat(1.2, 2.5);
    }

    const playerBox = getEntityAABB(
      this.playerX,
      this.playerY,
      this.playerZ,
      2.6,
      3.4,
      11.5
    );
    const playerSpeedKmh = msToKmh(this.playerSpeed);

    // 1. Advance positions and run AI decision loops
    for (let i = 0; i < this.trafficEntities.length; i++) {
      const npc = this.trafficEntities[i];
      const dir = npc.isOncoming ? -1 : 1;
      npc.z += npc.speed * SPEED_WORLD_SCALE * dir * dt;

      // AI Decision Loop: Front Raycast, Braking & Lane Change Signaling
      this.updateNPCAI(npc, dt);
    }

    // 2. Strict Physics Separation: Prevent any vehicle overlap or clipping
    resolveVehicleOverlaps(
      this.trafficEntities,
      {
        x: this.playerX,
        z: this.playerZ,
        width: 2.6,
        length: 11.5,
      },
      this.highwayMode
    );

    // 3. Update mesh positions, lighting, collisions, and scoring
    for (let i = this.trafficEntities.length - 1; i >= 0; i--) {
      const npc = this.trafficEntities[i];
      const mesh = this.trafficMeshMap.get(npc.id);
      if (!mesh) continue;

      mesh.position.set(npc.x, npc.y, npc.z);

      // Rotate wheels if available
      if (mesh.wheels) {
        const wheelRotDelta = (npc.speed * SPEED_WORLD_SCALE * dt) / 1.1;
        mesh.wheels.forEach((w) => {
          w.rotation.x += wheelRotDelta * Math.PI * 2;
        });
      }

      const isNpcIndLeft =
        (npc.indicator === 'left' || npc.indicator === 'hazard') && this.indicatorBlinkState;
      const isNpcIndRight =
        (npc.indicator === 'right' || npc.indicator === 'hazard') && this.indicatorBlinkState;

      if (mesh.indicatorLeftMesh) {
        mesh.indicatorLeftMesh.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(
            isNpcIndLeft ? 0xff7700 : 0x000000
          );
        });
      }
      if (mesh.indicatorRightMesh) {
        mesh.indicatorRightMesh.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(
            isNpcIndRight ? 0xff7700 : 0x000000
          );
        });
      }

      // 4. Collision Detection (AABB) with Player
      const npcBox = getEntityAABB(
        npc.x,
        npc.y,
        npc.z,
        npc.width,
        npc.height,
        npc.length
      );

      if (checkAABBCollision(playerBox, npcBox)) {
        this.triggerCrash(npc);
        return;
      }

      // 5. Near-Miss Overtake Detection
      if (!this.nearMissAwardedSet.has(npc.id)) {
        if (checkNearMiss(playerBox, npcBox, playerSpeedKmh, false)) {
          this.nearMissAwardedSet.add(npc.id);
          this.nearMissCount++;

          const inCounterLane = isInCounterLane(this.playerX, this.highwayMode);
          const bonus = calculateOvertakeBonus(playerSpeedKmh, inCounterLane);
          this.score += bonus;
          this.takaEarned += Math.floor(bonus / 2);

          audioManager.playNearMissWhoosh();
          this.cameraShake = 0.25;

          const specs = getArchetypeSpecs(npc.archetype);
          const npcSpeedKmh = msToKmh(npc.speed);
          const vehicleLabel = npc.livery ? npc.livery.name : specs.bengaliName;

          this.closeOvertakeNotification = {
            text: inCounterLane
              ? `🔥 কাউন্টার ওভারটেক: ${vehicleLabel} (${npcSpeedKmh} কি.মি./ঘণ্টা) +৳${Math.floor(bonus / 2)}`
              : `⚡ ক্লোজ ওভারটেক: ${vehicleLabel} (${npcSpeedKmh} কি.মি./ঘণ্টা) +৳${Math.floor(bonus / 2)}`,
            points: bonus,
            timestamp: Date.now(),
          };
        }
      }

      // 6. Cull entities far behind or far ahead
      const distanceToPlayer = npc.z - this.playerZ;
      if (distanceToPlayer < -90 || distanceToPlayer > 300) {
        this.scene.remove(mesh);
        this.trafficMeshMap.delete(npc.id);
        this.trafficEntities.splice(i, 1);
        this.nearMissAwardedSet.delete(npc.id);
      }
    }
  }

  /**
   * AI behavior logic for NPCs:
   * - Scans ahead for slower traffic (or player) in the same lane
   * - Smoothly and safely decelerates to prevent rear-end collisions
   * - Flashes indicators for 1.5 - 2.0 seconds BEFORE initiating lane change
   * - Checks that the target lane is clear using isLaneClear before switching
   * - In 2-lane mode, aggressive buses overtake via the counter-lane!
   * - Reacts to player's air horn by yielding to the shoulder.
   */
  private updateNPCAI(npc: TrafficEntity, dt: number) {
    // 1. Honk Reaction: Only the vehicle directly in front of player with verified space gives side!
    if (npc.honkedReactionTimer > 0 && npc.yieldTargetX !== undefined) {
      npc.honkedReactionTimer -= dt;
      // Smoothly slide over to the clear side position
      npc.x = THREE.MathUtils.damp(npc.x, npc.yieldTargetX, 2.6, dt);

      // Once the player bus passes this NPC, cancel reaction and return to normal lane
      if (this.playerZ > npc.z + npc.length / 2 + 2.0) {
        npc.honkedReactionTimer = 0;
        npc.indicator = 'none';
        npc.yieldTargetX = undefined;
      }
      return;
    } else if (npc.honkedReactionTimer <= 0 && npc.yieldTargetX !== undefined) {
      // Reaction timer elapsed: turn off indicator and return to lane
      npc.indicator = 'none';
      npc.yieldTargetX = undefined;
    }

    // 2. Active Lane Change in progress
    if (npc.isLaneChanging) {
      // Continuous spatial check: If another vehicle encroaches into the lane transition corridor, abort immediately!
      const isSafe = isLaneChangeSafe(npc, this.trafficEntities, {
        x: this.playerX,
        z: this.playerZ,
        width: 2.6,
        length: 11.5,
      });

      if (!isSafe) {
        // Abort lane change! Return to original lane immediately
        npc.isLaneChanging = false;
        npc.targetLane = npc.currentLane;
        npc.indicator = 'none';
        npc.laneChangeProgress = 0;
        const currentLaneInfo = this.lanes.find((l) => l.index === npc.currentLane);
        if (currentLaneInfo) {
          npc.x = THREE.MathUtils.damp(npc.x, currentLaneInfo.centerX, 5.0, dt);
        }
        return;
      }

      npc.laneChangeProgress += dt * 0.75; // ~1.3s to complete lane change
      const targetLaneInfo = this.lanes.find((l) => l.index === npc.targetLane);
      if (targetLaneInfo) {
        npc.x = THREE.MathUtils.damp(npc.x, targetLaneInfo.centerX, 4.5, dt);
      }

      if (npc.laneChangeProgress >= 1.0) {
        npc.isLaneChanging = false;
        npc.currentLane = npc.targetLane;
        npc.indicator = 'none';
        npc.laneChangeProgress = 0;
      }
      return;
    }

    // 3. Indicator Signaling Phase (1.5-2.0 seconds BEFORE lane change)
    if (npc.indicatorTimer > 0) {
      npc.indicatorTimer -= dt;
      if (npc.indicatorTimer <= 0) {
        // Signaling period finished -> Double check target lane is still clear with generous gaps!
        const targetLaneInfo = this.lanes.find((l) => l.index === npc.targetLane);
        const clear =
          targetLaneInfo &&
          isLaneClear(
            targetLaneInfo.centerX,
            npc.z,
            npc.length,
            this.trafficEntities,
            npc.id,
            32,
            26
          );

        // Ensure no other entity is currently targeting the same lane slot
        const noConflict = !this.trafficEntities.some(
          (other) =>
            other.id !== npc.id &&
            other.targetLane === npc.targetLane &&
            Math.abs(other.z - npc.z) < 32
        );

        if (clear && noConflict) {
          npc.isLaneChanging = true;
          npc.laneChangeProgress = 0;
        } else {
          // Target lane blocked: cancel lane change and stay safely in lane
          npc.indicator = 'none';
          npc.targetLane = npc.currentLane;
        }
      }
      return;
    }

    // 4. Scanning Ahead: Find vehicle (or player) in front in same lane
    let frontDistance = 999;
    let frontSpeed = kmhToMs(80);
    let frontFound = false;

    // Check traffic entities ahead
    for (const other of this.trafficEntities) {
      if (other.id === npc.id || other.isOncoming !== npc.isOncoming) continue;
      const isSameLane = Math.abs(other.x - npc.x) < 2.0;
      const zDiff = npc.isOncoming ? npc.z - other.z : other.z - npc.z;
      if (isSameLane && zDiff > 0 && zDiff < 38 && zDiff < frontDistance) {
        frontDistance = zDiff;
        frontSpeed = other.speed;
        frontFound = true;
      }
    }

    // Also check if player bus is ahead of NPC in same lane
    if (!npc.isOncoming) {
      const isSameLaneAsPlayer = Math.abs(this.playerX - npc.x) < 2.2;
      const zDiffToPlayer = this.playerZ - npc.z;
      if (isSameLaneAsPlayer && zDiffToPlayer > 0 && zDiffToPlayer < 38 && zDiffToPlayer < frontDistance) {
        frontDistance = zDiffToPlayer;
        frontSpeed = this.playerSpeed;
        frontFound = true;
      }
    }

    if (frontFound) {
      // Progressive Braking to prevent any rear-end collision
      if (frontDistance < 15) {
        // Emergency hard brake
        npc.speed = Math.max(frontSpeed - 3.0, 0);
      } else if (frontDistance < 24) {
        // Firm deceleration
        npc.speed = Math.min(npc.speed, frontSpeed * 0.85);
      } else {
        // Match speed of vehicle ahead
        npc.speed = Math.min(npc.speed, frontSpeed * 0.95);
      }

      // AI Overtaking Decision for faster vehicles (Buses & Microbuses)
      if (npc.archetype === 'bus' || npc.archetype === 'microbus') {
        if (this.highwayMode === 'divided_4lane') {
          // In divided 4-lane LHT:
          // Lane 0: Outer Left (Slow, X ~ +6.4)
          // Lane 1: Inner Left (Fast, X ~ +2.8)
          if (npc.currentLane === 0) {
            const lane1 = this.lanes.find((l) => l.index === 1);
            if (
              lane1 &&
              isLaneClear(lane1.centerX, npc.z, npc.length, this.trafficEntities, npc.id, 34, 26)
            ) {
              npc.targetLane = 1;
              npc.indicator = 'right';
              npc.indicatorTimer = THREE.MathUtils.randFloat(1.5, 2.0);
            }
          }
        } else {
          // 2-Lane Undivided: Counter-Lane Overtaking Maneuver!
          // Forward lane is Lane 0 (+X), Counter-lane is Lane 1 (-X)
          if (npc.currentLane === 0 && !npc.isOvertakingCounterLane) {
            const counterLane = this.lanes.find((l) => l.index === 1);
            // Require 85m clearance in counter lane because of closing speed
            if (
              counterLane &&
              isLaneClear(counterLane.centerX, npc.z, npc.length, this.trafficEntities, npc.id, 85, 35)
            ) {
              npc.targetLane = 1;
              npc.indicator = 'right';
              npc.indicatorTimer = THREE.MathUtils.randFloat(1.5, 2.0);
              npc.isOvertakingCounterLane = true;
            }
          }
        }
      }
    } else {
      // Free lane ahead: accelerate back to this individual vehicle's cruising speed
      const specs = getArchetypeSpecs(npc.archetype);
      npc.speed = THREE.MathUtils.damp(npc.speed, npc.targetSpeed, specs.accelRate, dt);

      // In 4-lane mode: if cruising in fast lane (Lane 1) with clear slow lane (Lane 0), return to Lane 0
      if (
        this.highwayMode === 'divided_4lane' &&
        npc.currentLane === 1 &&
        !npc.isLaneChanging &&
        npc.indicatorTimer <= 0
      ) {
        const lane0 = this.lanes.find((l) => l.index === 0);
        if (
          lane0 &&
          Math.random() < 0.015 &&
          isLaneClear(lane0.centerX, npc.z, npc.length, this.trafficEntities, npc.id, 32, 26)
        ) {
          npc.targetLane = 0;
          npc.indicator = 'left';
          npc.indicatorTimer = 1.8;
        }
      }

      // In 2-lane mode: monitor oncoming traffic while overtaking in counter-lane!
      if (npc.isOvertakingCounterLane && npc.currentLane === 1) {
        // Continuous check for oncoming vehicle in counter-lane
        const oncomingThreat = this.trafficEntities.find(
          (other) => other.isOncoming && Math.abs(other.x - npc.x) < 2.5 && other.z > npc.z && other.z - npc.z < 85
        );
        if (oncomingThreat) {
          // Emergency return to Lane 0
          const lane0 = this.lanes.find((l) => l.index === 0);
          if (lane0) {
            npc.targetLane = 0;
            npc.indicator = 'left';
            npc.isLaneChanging = true;
            npc.isOvertakingCounterLane = false;
            npc.speed = Math.max(0, npc.speed - 3.0);
            return;
          }
        }

        const lane0 = this.lanes.find((l) => l.index === 0);
        if (
          lane0 &&
          isLaneClear(lane0.centerX, npc.z, npc.length, this.trafficEntities, npc.id, 28, 22)
        ) {
          npc.targetLane = 0;
          npc.indicator = 'left';
          npc.indicatorTimer = 1.6;
          npc.isOvertakingCounterLane = false;
        }
      }
    }
  }

  private updateCamera(dt: number) {
    // Decaying camera trauma shake on near-miss or crash
    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * this.cameraShake;
      shakeY = (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    }

    const speedRatio = Math.min(this.playerSpeed / kmhToMs(130), 1.0);

    if (this.cameraMode === 'chase') {
      // Dynamic Speed FOV: 60° at standstill expanding to 74° at high speed for authentic highway rush
      const targetFov = 60 + speedRatio * 14;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.1);
      this.camera.updateProjectionMatrix();

      // Third-Person Chase Camera: Elevated view behind and above bus
      const camDistBack = 13.5 + speedRatio * 1.5;
      const camHeight = 4.6 + speedRatio * 0.6;
      const targetCamPos = new THREE.Vector3(
        this.playerX * 0.75 + shakeX,
        this.playerY + camHeight + shakeY,
        this.playerZ - camDistBack
      );
      this.camera.position.lerp(targetCamPos, 0.22);

      const lookTarget = new THREE.Vector3(
        this.playerX + shakeX * 0.5,
        this.playerY + 2.0,
        this.playerZ + 28
      );
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'cockpit') {
      // Interior First-Person Cockpit Camera:
      const targetFov = 72 + speedRatio * 8;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.1);
      this.camera.updateProjectionMatrix();

      // In Bangladesh (LHT), the driver seat is on the RIGHT side of the bus (-X in driver's +Z view)
      const driverSeatX = this.playerX - 0.65;
      const driverEyeY = this.playerY + 2.22 + shakeY;
      const driverEyeZ = this.playerZ + 11.5 / 2 - 1.45;

      this.camera.position.set(driverSeatX + shakeX, driverEyeY, driverEyeZ);

      // Look forward through panoramic front windshield across the road
      const lookTarget = new THREE.Vector3(
        driverSeatX + this.playerSteerAngle * 0.8,
        driverEyeY - 0.05,
        driverEyeZ + 50
      );
      this.camera.lookAt(lookTarget);

    } else {
      // Hood / Front Bumper Cinematic View
      const targetFov = 65 + speedRatio * 12;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.1);
      this.camera.updateProjectionMatrix();

      const bumperZ = this.playerZ + 11.5 / 2 + 0.2;
      this.camera.position.set(this.playerX + shakeX, this.playerY + 1.2 + shakeY, bumperZ);
      this.camera.lookAt(this.playerX, this.playerY + 1.1, bumperZ + 50);
    }
  }

  private triggerCrash(npc: TrafficEntity) {
    this.isRunning = false;
    audioManager.playCrashImpact();
    this.cameraShake = 0.8;

    const finalStats: GameScoreState = {
      distanceTraveledMeters: Math.round(this.distanceTraveled),
      currentSpeedKmh: msToKmh(this.playerSpeed),
      score: this.score,
      takaEarned: this.takaEarned,
      nearMissCount: this.nearMissCount,
      counterLaneMeters: Math.round(this.counterLaneMeters),
      maxSpeedKmh: this.maxSpeedKmh,
      closeOvertakeNotification: null,
    };

    this.callbacks.onGameOver(finalStats);
  }

  private onWindowResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    audioManager.dispose();
    this.mirrorManager.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
