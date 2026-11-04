/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BusLivery, HighwayMode, IndicatorState } from './types';
import { MilestoneDefinition } from './zones';
import {
  BUS_LIVERIES,
  createBusLiveryTexture,
  createBusRearTexture,
  createBusDestinationTexture,
  createTruckArtTexture,
  createCNGTexture,
  createHighwaySignTexture,
  createAsphaltTexture,
  createUnpavedRoadTexture,
  createBridgeDeckTexture,
  createFlyoverDeckTexture,
  createWaterTexture,
  createShopSignTexture,
  createBridgeNameSignTexture,
  createCustomMilestoneTexture,
} from './proceduralTextures';
import { LANE_WIDTH, DIVIDER_WIDTH, SHOULDER_WIDTH } from './trafficRules';

// Shared materials and geometries pool for high performance
const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 18);
tireGeo.rotateZ(Math.PI / 2);

const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.36, 14);
rimGeo.rotateZ(Math.PI / 2);

const rubberMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.9,
  metalness: 0.1,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0xd4d4d8,
  roughness: 0.3,
  metalness: 0.8,
});

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xdbeafe,
  roughness: 0.05,
  metalness: 0.1,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});

const darkTrimMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.8,
  metalness: 0.2,
});

const chromeMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  roughness: 0.15,
  metalness: 0.95,
});

export interface VehicleMeshObject extends THREE.Group {
  indicatorLeftMesh?: THREE.Mesh[];
  indicatorRightMesh?: THREE.Mesh[];
  brakeLightsMesh?: THREE.Mesh[];
  steeringWheel?: THREE.Mesh;
  leftMirrorMesh?: THREE.Mesh;
  rightMirrorMesh?: THREE.Mesh;
  centerMirrorMesh?: THREE.Mesh;
  wheels?: THREE.Group[];
  contactShadow?: THREE.Mesh;
}

/**
 * Creates contact shadow disc underneath vehicles
 */
export function createContactShadow(width: number, length: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width * 1.15, length * 1.05);
  geo.rotateX(-Math.PI / 2);

  // Procedural soft gradient shadow canvas
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.03;
  return mesh;
}

/**
 * Creates a wheel assembly with tire and alloy rim
 */
function createWheel(): THREE.Group {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(tireGeo, rubberMat);
  tire.castShadow = true;
  group.add(tire);

  const rim = new THREE.Mesh(rimGeo, rimMat);
  group.add(rim);

  return group;
}

/**
 * Creates an authentic 3D Bangladeshi Intercity Coach Bus (Volvo/Scania/Hino)
 */
export function createBusMesh(livery: BusLivery = BUS_LIVERIES[0], isPlayer = false): VehicleMeshObject {
  const bus = new THREE.Group() as VehicleMeshObject;
  const indicatorLeftMesh: THREE.Mesh[] = [];
  const indicatorRightMesh: THREE.Mesh[] = [];
  const brakeLightsMesh: THREE.Mesh[] = [];
  const wheels: THREE.Group[] = [];

  const width = 2.6;
  const length = 11.5;
  const height = 3.3;

  // 1. Main Body Hull with High-Gloss Automotive Clearcoat Finish
  const bodyGeo = new THREE.BoxGeometry(width, height - 0.7, length - 0.4);
  const liveryTex = createBusLiveryTexture(livery);
  const rearTex = createBusRearTexture(livery);

  // Materials for 6 faces: Right, Left, Top, Bottom, Front, Back
  const bodyMats = [
    new THREE.MeshPhysicalMaterial({
      map: liveryTex,
      roughness: 0.22,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    }), // Right side (Driver side in Bangladesh)
    new THREE.MeshPhysicalMaterial({
      map: liveryTex,
      roughness: 0.22,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    }), // Left side (Passenger door side in Bangladesh)
    new THREE.MeshPhysicalMaterial({
      color: livery.primaryColor,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.8,
    }), // Roof
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.1,
    }), // Undercarriage
    new THREE.MeshPhysicalMaterial({
      color: livery.secondaryColor,
      roughness: 0.2,
      metalness: 0.25,
      clearcoat: 1.0,
    }), // Front
    new THREE.MeshPhysicalMaterial({
      map: rearTex,
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    }), // Rear
  ];

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMats);
  bodyMesh.position.y = height / 2 + 0.35;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bus.add(bodyMesh);

  // 2. Aerodynamic Roof AC Pod & Rear Roof Spoiler
  const acGeo = new THREE.BoxGeometry(1.5, 0.35, 3.8);
  const acMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.25 });
  const acMesh = new THREE.Mesh(acGeo, acMat);
  acMesh.position.set(0, height + 0.32, 0.4);
  acMesh.castShadow = true;
  bus.add(acMesh);

  // Rear Roof Aerodynamic Wing Spoiler
  const spoilerGeo = new THREE.BoxGeometry(width + 0.04, 0.14, 0.55);
  const spoilerMat = new THREE.MeshPhysicalMaterial({ color: livery.primaryColor, roughness: 0.2, metalness: 0.3, clearcoat: 1.0 });
  const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
  spoiler.position.set(0, height + 0.38, -length / 2 + 0.15);
  spoiler.castShadow = true;
  bus.add(spoiler);

  // 3. Panoramic Front Windshield with subtle slope
  const windshieldGeo = new THREE.BoxGeometry(width - 0.08, 1.35, 0.08);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, height * 0.72, length / 2 - 0.18);
  windshield.rotation.x = -0.15; // Sloped aerodynamic windshield
  bus.add(windshield);

  // 4. Front Illuminated Destination Board (ঢাকা - কক্সবাজার)
  const destTex = createBusDestinationTexture(livery.routeQuote);
  const destGeo = new THREE.PlaneGeometry(1.65, 0.44);
  const destMat = new THREE.MeshBasicMaterial({ map: destTex });
  const destMesh = new THREE.Mesh(destGeo, destMat);
  destMesh.position.set(0, height + 0.12, length / 2 - 0.15);
  bus.add(destMesh);

  // 5. Front Aerodynamic Bumper with Radiator Chrome Grille & Projector Headlights
  const bumperGeo = new THREE.BoxGeometry(width + 0.04, 0.72, 0.45);
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
  const bumper = new THREE.Mesh(bumperGeo, bumperMat);
  bumper.position.set(0, 0.72, length / 2 - 0.05);
  bus.add(bumper);

  // Radiator Chrome Grille Slats
  const grillGeo = new THREE.BoxGeometry(1.4, 0.32, 0.06);
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
  const grill = new THREE.Mesh(grillGeo, grillMat);
  grill.position.set(0, 0.68, length / 2 + 0.18);
  bus.add(grill);

  // Front Projector Headlights (Thor's Hammer / Scania DRL styling)
  const headlightGeo = new THREE.BoxGeometry(0.38, 0.18, 0.08);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    roughness: 0.1,
  });

  const headlightL = new THREE.Mesh(headlightGeo, headlightMat);
  headlightL.position.set(width / 2 - 0.32, 0.78, length / 2 + 0.18);
  bus.add(headlightL);

  const headlightR = new THREE.Mesh(headlightGeo, headlightMat);
  headlightR.position.set(-width / 2 + 0.32, 0.78, length / 2 + 0.18);
  bus.add(headlightR);

  // 6. Realistic Turn Indicator & Brake Light Overlays (Flush with body, no clunky boxes!)
  const indGeo = new THREE.PlaneGeometry(0.24, 0.18);
  const indLeftMat = new THREE.MeshStandardMaterial({
    color: 0xff7700,
    emissive: 0x000000,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const indRightMat = new THREE.MeshStandardMaterial({
    color: 0xff7700,
    emissive: 0x000000,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  // Front Indicators (Left: +X, Right: -X)
  const fIndL = new THREE.Mesh(indGeo, indLeftMat);
  fIndL.position.set(width / 2 - 0.14, 0.78, length / 2 + 0.20);
  bus.add(fIndL);
  indicatorLeftMesh.push(fIndL);

  const fIndR = new THREE.Mesh(indGeo, indRightMat);
  fIndR.position.set(-width / 2 + 0.14, 0.78, length / 2 + 0.20);
  bus.add(fIndR);
  indicatorRightMesh.push(fIndR);

  // Rear Indicators (Flush against rear light cluster)
  const rIndL = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.15), indLeftMat);
  rIndL.position.set(width / 2 - 0.26, 2.15, -length / 2 + 0.19);
  rIndL.rotation.y = Math.PI;
  bus.add(rIndL);
  indicatorLeftMesh.push(rIndL);

  const rIndR = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.15), indRightMat);
  rIndR.position.set(-width / 2 + 0.26, 2.15, -length / 2 + 0.19);
  rIndR.rotation.y = Math.PI;
  bus.add(rIndR);
  indicatorRightMesh.push(rIndR);

  // Rear Brake Light Overlays (Glowing LED matrix when braking)
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x220000,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  const brakeL = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.38), brakeMat);
  brakeL.position.set(width / 2 - 0.26, 1.75, -length / 2 + 0.19);
  brakeL.rotation.y = Math.PI;
  bus.add(brakeL);
  brakeLightsMesh.push(brakeL);

  const brakeR = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.38), brakeMat);
  brakeR.position.set(-width / 2 + 0.26, 1.75, -length / 2 + 0.19);
  brakeR.rotation.y = Math.PI;
  bus.add(brakeR);
  brakeLightsMesh.push(brakeR);

  // Dual Stainless Steel Exhaust Pipes at rear
  const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustL.position.set(width / 2 - 0.5, 0.32, -length / 2 + 0.05);
  bus.add(exhaustL);

  const exhaustR = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustR.position.set(width / 2 - 0.65, 0.32, -length / 2 + 0.05);
  bus.add(exhaustR);

  // 7. Wheels Configuration (Front Axle + Dual Rear Axles for 12m Intercity Coach)
  const wheelPositions = [
    { x: -width / 2 + 0.1, z: length / 2 - 2.2 }, // Front Left
    { x: width / 2 - 0.1, z: length / 2 - 2.2 },  // Front Right
    { x: -width / 2 + 0.1, z: -length / 2 + 3.8 }, // Rear Axle 1 Left
    { x: width / 2 - 0.1, z: -length / 2 + 3.8 },  // Rear Axle 1 Right
    { x: -width / 2 + 0.1, z: -length / 2 + 2.3 }, // Rear Axle 2 Left (Tag Axle)
    { x: width / 2 - 0.1, z: -length / 2 + 2.3 },  // Rear Axle 2 Right
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createWheel();
    wheel.position.set(pos.x, 0.55, pos.z);
    bus.add(wheel);
    wheels.push(wheel);
  });

  // 8. Driver Cockpit Details (Essential for Interior First-Person View)
  // In Bangladesh (Left-Hand Traffic), driver sits on the RIGHT side of the vehicle (-X in driver's +Z view)
  const driverSeatX = -0.65;

  // Steering Wheel
  const steeringGroup = new THREE.Group();
  const steeringRingGeo = new THREE.TorusGeometry(0.28, 0.035, 8, 20);
  const steeringMesh = new THREE.Mesh(steeringRingGeo, darkTrimMat);
  steeringMesh.rotation.x = Math.PI / 3; // Slanted bus driver angle
  steeringGroup.add(steeringMesh);
  steeringGroup.position.set(driverSeatX, 1.88, length / 2 - 0.85);
  bus.add(steeringGroup);
  bus.steeringWheel = steeringMesh;

  // Dashboard Console
  const dashGeo = new THREE.BoxGeometry(width - 0.2, 0.6, 0.8);
  const dashMesh = new THREE.Mesh(dashGeo, darkTrimMat);
  dashMesh.position.set(0, 1.55, length / 2 - 0.8);
  bus.add(dashMesh);

  // 9. Rearview Mirrors (Left Exterior, Right Exterior, and Interior Center)
  const mirrorCasingGeo = new THREE.BoxGeometry(0.18, 0.42, 0.12);
  const mirrorSurfaceGeo = new THREE.PlaneGeometry(0.16, 0.38);

  // Left Exterior Mirror (Passenger side on Left, +X)
  const leftMirrorGroup = new THREE.Group();
  const leftCasing = new THREE.Mesh(mirrorCasingGeo, darkTrimMat);
  leftMirrorGroup.add(leftCasing);

  const leftMirrorSurface = new THREE.Mesh(
    mirrorSurfaceGeo,
    new THREE.MeshBasicMaterial({ color: 0x88bbdd, side: THREE.DoubleSide })
  );
  leftMirrorSurface.position.z = -0.065;
  leftMirrorSurface.rotation.y = Math.PI - 0.25; // angled back toward driver
  leftMirrorGroup.add(leftMirrorSurface);
  leftMirrorGroup.position.set(width / 2 + 0.25, 2.15, length / 2 - 0.7);
  bus.add(leftMirrorGroup);
  bus.leftMirrorMesh = leftMirrorSurface;

  // Right Exterior Mirror (Driver side on Right, -X)
  const rightMirrorGroup = new THREE.Group();
  const rightCasing = new THREE.Mesh(mirrorCasingGeo, darkTrimMat);
  rightMirrorGroup.add(rightCasing);

  const rightMirrorSurface = new THREE.Mesh(
    mirrorSurfaceGeo,
    new THREE.MeshBasicMaterial({ color: 0x88bbdd, side: THREE.DoubleSide })
  );
  rightMirrorSurface.position.z = -0.065;
  rightMirrorSurface.rotation.y = Math.PI + 0.25;
  rightMirrorGroup.add(rightMirrorSurface);
  rightMirrorGroup.position.set(-width / 2 - 0.25, 2.15, length / 2 - 0.7);
  bus.add(rightMirrorGroup);
  bus.rightMirrorMesh = rightMirrorSurface;

  // Interior Center Windshield Mirror
  const centerMirrorGroup = new THREE.Group();
  // Mounting bracket from ceiling
  const bracketGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6);
  const bracket = new THREE.Mesh(bracketGeo, darkTrimMat);
  bracket.position.set(0, 0.12, 0);
  centerMirrorGroup.add(bracket);

  const centerFrameGeo = new THREE.BoxGeometry(0.72, 0.24, 0.05);
  const centerFrame = new THREE.Mesh(centerFrameGeo, darkTrimMat);
  centerMirrorGroup.add(centerFrame);

  const centerMirrorGeo = new THREE.PlaneGeometry(0.68, 0.20);
  const centerMirrorSurface = new THREE.Mesh(
    centerMirrorGeo,
    new THREE.MeshBasicMaterial({ color: 0x88bbdd, side: THREE.DoubleSide })
  );
  centerMirrorSurface.position.z = -0.03;
  centerMirrorSurface.rotation.y = Math.PI; // Face rearwards towards driver
  centerMirrorGroup.add(centerMirrorSurface);

  // Mounted right at top-center of panoramic front windshield in clear line of sight
  centerMirrorGroup.position.set(-0.2, 2.42, length / 2 - 0.78);
  centerMirrorGroup.rotation.x = 0.14; // tilted down towards driver
  centerMirrorGroup.rotation.y = -0.10; // angled slightly toward right driver seat
  bus.add(centerMirrorGroup);
  bus.centerMirrorMesh = centerMirrorSurface;

  // 10. Contact Ground Shadow
  const shadow = createContactShadow(width, length);
  bus.add(shadow);
  bus.contactShadow = shadow;

  bus.indicatorLeftMesh = indicatorLeftMesh;
  bus.indicatorRightMesh = indicatorRightMesh;
  bus.brakeLightsMesh = brakeLightsMesh;
  bus.wheels = wheels;

  return bus;
}

/**
 * Creates 10-Wheel Tata/Ashok Leyland Bangladeshi Cargo Truck
 */
export function createTruckMesh(): VehicleMeshObject {
  const truck = new THREE.Group() as VehicleMeshObject;
  const indicatorLeftMesh: THREE.Mesh[] = [];
  const indicatorRightMesh: THREE.Mesh[] = [];
  const wheels: THREE.Group[] = [];

  const width = 2.5;
  const length = 9.0;
  const height = 3.2;

  // 1. Truck Driver Cabin
  const cabGeo = new THREE.BoxGeometry(width, 2.0, 2.5);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.3 }); // Vivid Blue
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 1.8, length / 2 - 1.4);
  cab.castShadow = true;
  truck.add(cab);

  // Cabin windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.9, 0.1), glassMat);
  windshield.position.set(0, 2.1, length / 2 - 0.1);
  truck.add(windshield);

  // 2. High Wooden Cargo Bed with Bengali Truck Art
  const bedGeo = new THREE.BoxGeometry(width + 0.1, 2.1, length - 2.8);
  const bedTex = createTruckArtTexture();
  const bedMats = [
    new THREE.MeshStandardMaterial({ map: bedTex, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: bedTex, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }), // Cargo top
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: bedTex, roughness: 0.7 }),
  ];
  const bed = new THREE.Mesh(bedGeo, bedMats);
  bed.position.set(0, 1.95, -1.3);
  bed.castShadow = true;
  truck.add(bed);

  // Cargo Load (Textured Jute Bags piled high)
  const juteGeo = new THREE.BoxGeometry(width - 0.2, 0.7, length - 3.2);
  const juteMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.95 });
  const juteMesh = new THREE.Mesh(juteGeo, juteMat);
  juteMesh.position.set(0, 3.25, -1.3);
  truck.add(juteMesh);

  // 3. Vertical Exhaust Chimney Pipe (Iconic Tata/Leyland truck feature)
  const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 10);
  const pipe = new THREE.Mesh(pipeGeo, chromeMat);
  pipe.position.set(width / 2 - 0.2, 2.4, length / 2 - 2.7);
  truck.add(pipe);

  // 4. Wheels: 1 front axle, 2 heavy rear axles (10-wheeler)
  const wheelPositions = [
    { x: -width / 2 + 0.1, z: length / 2 - 1.2 },
    { x: width / 2 - 0.1, z: length / 2 - 1.2 },
    { x: -width / 2 + 0.1, z: -1.8 },
    { x: width / 2 - 0.1, z: -1.8 },
    { x: -width / 2 + 0.1, z: -3.2 },
    { x: width / 2 - 0.1, z: -3.2 },
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createWheel();
    wheel.position.set(pos.x, 0.55, pos.z);
    truck.add(wheel);
    wheels.push(wheel);
  });

  // Indicators
  const indGeo = new THREE.BoxGeometry(0.2, 0.18, 0.1);
  const indLeftMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });
  const indRightMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });

  const fIndL = new THREE.Mesh(indGeo, indLeftMat);
  fIndL.position.set(-width / 2 + 0.2, 0.9, length / 2 - 0.1);
  truck.add(fIndL);
  indicatorLeftMesh.push(fIndL);

  const fIndR = new THREE.Mesh(indGeo, indRightMat);
  fIndR.position.set(width / 2 - 0.2, 0.9, length / 2 - 0.1);
  truck.add(fIndR);
  indicatorRightMesh.push(fIndR);

  const rIndL = new THREE.Mesh(indGeo, indLeftMat);
  rIndL.position.set(-width / 2 + 0.2, 1.1, -length / 2 + 0.2);
  truck.add(rIndL);
  indicatorLeftMesh.push(rIndL);

  const rIndR = new THREE.Mesh(indGeo, indRightMat);
  rIndR.position.set(width / 2 - 0.2, 1.1, -length / 2 + 0.2);
  truck.add(rIndR);
  indicatorRightMesh.push(rIndR);

  // Ground Contact Shadow
  const shadow = createContactShadow(width, length);
  truck.add(shadow);
  truck.contactShadow = shadow;

  truck.indicatorLeftMesh = indicatorLeftMesh;
  truck.indicatorRightMesh = indicatorRightMesh;
  truck.wheels = wheels;

  return truck;
}

/**
 * Creates Green CNG Auto-Rickshaw (Dhaka 3-wheeler)
 */
export function createCNGMesh(): VehicleMeshObject {
  const cng = new THREE.Group() as VehicleMeshObject;
  const indicatorLeftMesh: THREE.Mesh[] = [];
  const indicatorRightMesh: THREE.Mesh[] = [];
  const wheels: THREE.Group[] = [];

  const width = 1.4;
  const length = 2.7;
  const height = 1.8;

  // 1. CNG Body Hull with Green Texture & Yellow Top
  const bodyGeo = new THREE.BoxGeometry(width, 1.1, length);
  const cngTex = createCNGTexture();
  const cngMat = new THREE.MeshStandardMaterial({ map: cngTex, roughness: 0.4, metalness: 0.2 });
  const body = new THREE.Mesh(bodyGeo, cngMat);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  cng.add(body);

  // 2. Canopy curved roof
  const canopyGeo = new THREE.CylinderGeometry(width / 2, width / 2, length - 0.2, 12, 1, false, 0, Math.PI);
  canopyGeo.rotateZ(Math.PI / 2);
  canopyGeo.rotateY(Math.PI / 2);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 1.5, -0.1);
  cng.add(canopy);

  // 3. Front Windshield & Single Headlight
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.15, 0.55, 0.05), glassMat);
  frontGlass.position.set(0, 1.25, length / 2 - 0.2);
  cng.add(frontGlass);

  const headLight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
  );
  headLight.rotateX(Math.PI / 2);
  headLight.position.set(0, 0.7, length / 2 + 0.02);
  cng.add(headLight);

  // 4. Wheels: 1 front center wheel, 2 rear wheels (Delta 3-wheeler)
  const smallTireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 14);
  smallTireGeo.rotateZ(Math.PI / 2);

  const frontWheel = new THREE.Mesh(smallTireGeo, rubberMat);
  frontWheel.position.set(0, 0.35, length / 2 - 0.3);
  cng.add(frontWheel);

  const rearWheelL = new THREE.Mesh(smallTireGeo, rubberMat);
  rearWheelL.position.set(-width / 2 + 0.1, 0.35, -length / 2 + 0.5);
  cng.add(rearWheelL);

  const rearWheelR = new THREE.Mesh(smallTireGeo, rubberMat);
  rearWheelR.position.set(width / 2 - 0.1, 0.35, -length / 2 + 0.5);
  cng.add(rearWheelR);

  // Indicators
  const indGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
  const indLeftMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });
  const indRightMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });

  const rIndL = new THREE.Mesh(indGeo, indLeftMat);
  rIndL.position.set(-width / 2 + 0.15, 0.8, -length / 2 + 0.05);
  cng.add(rIndL);
  indicatorLeftMesh.push(rIndL);

  const rIndR = new THREE.Mesh(indGeo, indRightMat);
  rIndR.position.set(width / 2 - 0.15, 0.8, -length / 2 + 0.05);
  cng.add(rIndR);
  indicatorRightMesh.push(rIndR);

  const shadow = createContactShadow(width, length);
  cng.add(shadow);
  cng.contactShadow = shadow;

  cng.indicatorLeftMesh = indicatorLeftMesh;
  cng.indicatorRightMesh = indicatorRightMesh;

  return cng;
}

/**
 * Creates Leguna (Bangladeshi Human Hauler Minibus)
 */
export function createLegunaMesh(): VehicleMeshObject {
  const leguna = new THREE.Group() as VehicleMeshObject;
  const indicatorLeftMesh: THREE.Mesh[] = [];
  const indicatorRightMesh: THREE.Mesh[] = [];

  const width = 1.7;
  const length = 4.6;
  const height = 2.2;

  // Front pickup cab
  const cabGeo = new THREE.BoxGeometry(width, 1.4, 1.8);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }); // Bright blue
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 1.1, length / 2 - 1.0);
  leguna.add(cab);

  // Covered passenger cage with open back
  const cageGeo = new THREE.BoxGeometry(width, 1.5, length - 1.8);
  const cageMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }); // Yellow
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.position.set(0, 1.25, -0.9);
  leguna.add(cage);

  // Rear open footboard where "helper" hangs
  const footboardGeo = new THREE.BoxGeometry(width - 0.2, 0.1, 0.4);
  const footboard = new THREE.Mesh(footboardGeo, darkTrimMat);
  footboard.position.set(0, 0.4, -length / 2 - 0.15);
  leguna.add(footboard);

  // Grab rails
  const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 8);
  const railL = new THREE.Mesh(railGeo, chromeMat);
  railL.position.set(-width / 2 + 0.15, 1.1, -length / 2);
  leguna.add(railL);

  const railR = new THREE.Mesh(railGeo, chromeMat);
  railR.position.set(width / 2 - 0.15, 1.1, -length / 2);
  leguna.add(railR);

  // 4 wheels
  const wheelPositions = [
    { x: -width / 2 + 0.1, z: length / 2 - 1.0 },
    { x: width / 2 - 0.1, z: length / 2 - 1.0 },
    { x: -width / 2 + 0.1, z: -length / 2 + 1.2 },
    { x: width / 2 - 0.1, z: -length / 2 + 1.2 },
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createWheel();
    wheel.scale.set(0.85, 0.85, 0.85);
    wheel.position.set(pos.x, 0.45, pos.z);
    leguna.add(wheel);
  });

  // Indicators
  const indGeo = new THREE.BoxGeometry(0.15, 0.15, 0.08);
  const indLeftMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });
  const indRightMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });

  const rIndL = new THREE.Mesh(indGeo, indLeftMat);
  rIndL.position.set(-width / 2 + 0.15, 0.9, -length / 2 + 0.05);
  leguna.add(rIndL);
  indicatorLeftMesh.push(rIndL);

  const rIndR = new THREE.Mesh(indGeo, indRightMat);
  rIndR.position.set(width / 2 - 0.15, 0.9, -length / 2 + 0.05);
  leguna.add(rIndR);
  indicatorRightMesh.push(rIndR);

  const shadow = createContactShadow(width, length);
  leguna.add(shadow);
  leguna.contactShadow = shadow;

  leguna.indicatorLeftMesh = indicatorLeftMesh;
  leguna.indicatorRightMesh = indicatorRightMesh;

  return leguna;
}

/**
 * Creates Toyota HiAce / Noah Express Microbus (Dhaka Highway private commuter)
 */
export function createMicrobusMesh(): VehicleMeshObject {
  const microbus = new THREE.Group() as VehicleMeshObject;
  const indicatorLeftMesh: THREE.Mesh[] = [];
  const indicatorRightMesh: THREE.Mesh[] = [];
  const wheels: THREE.Group[] = [];

  const width = 1.85;
  const length = 4.85;
  const height = 2.05;

  // 1. Sleek Van Body (White / Silver metallic with dark skirts)
  const bodyGeo = new THREE.BoxGeometry(width, 1.35, length);
  const microbusMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Pearl white / light silver
    metalness: 0.35,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, microbusMat);
  body.position.set(0, 1.05, 0);
  body.castShadow = true;
  microbus.add(body);

  // Aerodynamic nose slope
  const noseGeo = new THREE.BoxGeometry(width - 0.1, 0.65, 0.8);
  const nose = new THREE.Mesh(noseGeo, microbusMat);
  nose.position.set(0, 0.72, length / 2 - 0.2);
  nose.rotation.x = -0.15;
  microbus.add(nose);

  // Front chrome grille
  const grilleGeo = new THREE.BoxGeometry(width - 0.5, 0.28, 0.08);
  const grille = new THREE.Mesh(grilleGeo, chromeMat);
  grille.position.set(0, 0.65, length / 2 + 0.05);
  microbus.add(grille);

  // Front Windshield
  const windshieldGeo = new THREE.BoxGeometry(width - 0.2, 0.65, 0.06);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.35, length / 2 - 0.5);
  windshield.rotation.x = 0.25;
  microbus.add(windshield);

  // Side Glass windows band
  const sideGlassGeo = new THREE.BoxGeometry(width + 0.04, 0.52, length - 1.4);
  const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
  sideGlass.position.set(0, 1.35, -0.4);
  microbus.add(sideGlass);

  // Rear Glass
  const rearGlassGeo = new THREE.BoxGeometry(width - 0.25, 0.5, 0.06);
  const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
  rearGlass.position.set(0, 1.35, -length / 2 + 0.02);
  microbus.add(rearGlass);

  // Headlights
  const headGeo = new THREE.BoxGeometry(0.3, 0.18, 0.06);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
  });
  const headL = new THREE.Mesh(headGeo, headMat);
  headL.position.set(-width / 2 + 0.25, 0.75, length / 2 + 0.02);
  microbus.add(headL);

  const headR = new THREE.Mesh(headGeo, headMat);
  headR.position.set(width / 2 - 0.25, 0.75, length / 2 + 0.02);
  microbus.add(headR);

  // Tail lights
  const tailGeo = new THREE.BoxGeometry(0.2, 0.45, 0.06);
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.6,
  });
  const tailL = new THREE.Mesh(tailGeo, tailMat);
  tailL.position.set(-width / 2 + 0.18, 1.05, -length / 2 - 0.01);
  microbus.add(tailL);

  const tailR = new THREE.Mesh(tailGeo, tailMat);
  tailR.position.set(width / 2 - 0.18, 1.05, -length / 2 - 0.01);
  microbus.add(tailR);

  // 4 Wheels
  const wheelPositions = [
    { x: -width / 2 + 0.12, z: length / 2 - 1.1 },
    { x: width / 2 - 0.12, z: length / 2 - 1.1 },
    { x: -width / 2 + 0.12, z: -length / 2 + 1.2 },
    { x: width / 2 - 0.12, z: -length / 2 + 1.2 },
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, rubberMat);
    tire.scale.set(0.7, 0.7, 0.7);
    tire.castShadow = true;
    wheel.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.scale.set(0.7, 0.7, 0.7);
    wheel.add(rim);

    wheel.position.set(pos.x, 0.4, pos.z);
    microbus.add(wheel);
    wheels.push(wheel);
  });

  // Turn Indicators
  const indGeo = new THREE.BoxGeometry(0.18, 0.14, 0.06);
  const indLeftMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });
  const indRightMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x000000 });

  // Front indicators
  const fIndL = new THREE.Mesh(indGeo, indLeftMat);
  fIndL.position.set(-width / 2 + 0.12, 0.75, length / 2 + 0.02);
  microbus.add(fIndL);
  indicatorLeftMesh.push(fIndL);

  const fIndR = new THREE.Mesh(indGeo, indRightMat);
  fIndR.position.set(width / 2 - 0.12, 0.75, length / 2 + 0.02);
  microbus.add(fIndR);
  indicatorRightMesh.push(fIndR);

  // Rear indicators
  const rIndL = new THREE.Mesh(indGeo, indLeftMat);
  rIndL.position.set(-width / 2 + 0.18, 0.8, -length / 2 - 0.01);
  microbus.add(rIndL);
  indicatorLeftMesh.push(rIndL);

  const rIndR = new THREE.Mesh(indGeo, indRightMat);
  rIndR.position.set(width / 2 - 0.18, 0.8, -length / 2 - 0.01);
  microbus.add(rIndR);
  indicatorRightMesh.push(rIndR);

  // Ground Contact Shadow
  const shadow = createContactShadow(width, length);
  microbus.add(shadow);
  microbus.contactShadow = shadow;

  microbus.indicatorLeftMesh = indicatorLeftMesh;
  microbus.indicatorRightMesh = indicatorRightMesh;
  microbus.wheels = wheels;

  return microbus;
}

/**
 * Creates Roadway segment with Left-Hand Traffic markings and dynamic Bangladeshi environment
 */
export function createRoadSegment(
  mode: HighwayMode,
  milestone?: MilestoneDefinition,
  segmentLength = 120
): THREE.Group {
  const group = new THREE.Group();
  const zoneType = milestone?.zoneType || 'countryside';
  const isNarrow = milestone?.isNarrow || false;

  let totalWidth: number;
  if (mode === 'divided_4lane') {
    totalWidth = isNarrow
      ? (DIVIDER_WIDTH + LANE_WIDTH * 4 + SHOULDER_WIDTH * 2) * 0.85
      : DIVIDER_WIDTH + LANE_WIDTH * 4 + SHOULDER_WIDTH * 2;
  } else {
    totalWidth = isNarrow
      ? (LANE_WIDTH * 2 + SHOULDER_WIDTH * 2) * 0.85
      : LANE_WIDTH * 2 + SHOULDER_WIDTH * 2;
  }

  // 1. Road Surface Material tailored to active Bangladeshi Zone
  let roadMat: THREE.Material;
  const asphaltGeo = new THREE.PlaneGeometry(totalWidth, segmentLength, 1, 1);
  asphaltGeo.rotateX(-Math.PI / 2);

  if (zoneType === 'unpaved') {
    const unpavedTex = createUnpavedRoadTexture();
    roadMat = new THREE.MeshStandardMaterial({
      map: unpavedTex,
      roughness: 0.95,
      metalness: 0.05,
    });
  } else if (zoneType === 'long_bridge' || zoneType === 'small_bridge') {
    const bridgeTex = createBridgeDeckTexture();
    roadMat = new THREE.MeshStandardMaterial({
      map: bridgeTex,
      roughness: 0.75,
      metalness: 0.2,
    });
  } else if (zoneType === 'flyover') {
    const flyoverTex = createFlyoverDeckTexture();
    roadMat = new THREE.MeshStandardMaterial({
      map: flyoverTex,
      roughness: 0.7,
      metalness: 0.15,
    });
  } else {
    const asphaltTex = createAsphaltTexture();
    asphaltTex.repeat.set(4, 30);
    roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.85,
      metalness: 0.1,
    });
  }

  const roadMesh = new THREE.Mesh(asphaltGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // 2. Road Markings & Optical Flow Elements
  const markMatWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc, polygonOffset: true, polygonOffsetFactor: -2 });
  const markMatYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15, polygonOffset: true, polygonOffsetFactor: -2 });
  const redKerbMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
  const whiteKerbMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const catEyeMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 0.6,
  });
  const catEyeGeo = new THREE.BoxGeometry(0.12, 0.04, 0.12);

  if (mode === 'divided_4lane' && zoneType !== 'narrow_road') {
    // Central concrete island divider
    const dividerGeo = new THREE.BoxGeometry(DIVIDER_WIDTH, 0.45, segmentLength);
    const dividerMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.9 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.22, 0);
    divider.castShadow = true;
    divider.receiveShadow = true;
    group.add(divider);

    // Green bushes / hedge inside central divider (not on long bridges or unpaved)
    if (zoneType !== 'long_bridge' && zoneType !== 'unpaved') {
      const hedgeGeo = new THREE.BoxGeometry(DIVIDER_WIDTH * 0.7, 0.6, segmentLength);
      const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
      const hedge = new THREE.Mesh(hedgeGeo, hedgeMat);
      hedge.position.set(0, 0.65, 0);
      group.add(hedge);
    }

    // Fast Optical Flow: Dashed white lines with 4.5m pitch
    const forwardLineX = +(DIVIDER_WIDTH / 2 + LANE_WIDTH);
    const oncomingLineX = -(DIVIDER_WIDTH / 2 + LANE_WIDTH);

    for (let z = -segmentLength / 2 + 2; z < segmentLength / 2; z += 4.5) {
      const dashF = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.0).rotateX(-Math.PI / 2), markMatWhite);
      dashF.position.set(forwardLineX, 0.02, z);
      group.add(dashF);

      const dashO = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.0).rotateX(-Math.PI / 2), markMatWhite);
      dashO.position.set(oncomingLineX, 0.02, z);
      group.add(dashO);

      const catEyeF = new THREE.Mesh(catEyeGeo, catEyeMat);
      catEyeF.position.set(forwardLineX, 0.03, z + 2.25);
      group.add(catEyeF);

      const catEyeO = new THREE.Mesh(catEyeGeo, catEyeMat);
      catEyeO.position.set(oncomingLineX, 0.03, z + 2.25);
      group.add(catEyeO);
    }

    // Outer Shoulder Solid White Lines
    const leftEdge = +(DIVIDER_WIDTH / 2 + LANE_WIDTH * 2);
    const rightEdge = -(DIVIDER_WIDTH / 2 + LANE_WIDTH * 2);

    const edgeLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, segmentLength).rotateX(-Math.PI / 2), markMatWhite);
    edgeLineL.position.set(leftEdge, 0.02, 0);
    group.add(edgeLineL);

    const edgeLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, segmentLength).rotateX(-Math.PI / 2), markMatWhite);
    edgeLineR.position.set(rightEdge, 0.02, 0);
    group.add(edgeLineR);

    // Alternating Red & White Rumble Curbs along highway shoulders
    const curbBlockLen = 1.5;
    const curbGeo = new THREE.BoxGeometry(0.35, 0.12, curbBlockLen);
    let curbAlt = false;

    for (let z = -segmentLength / 2 + curbBlockLen / 2; z < segmentLength / 2; z += curbBlockLen) {
      const mat = curbAlt ? redKerbMat : whiteKerbMat;
      curbAlt = !curbAlt;

      const curbL = new THREE.Mesh(curbGeo, mat);
      curbL.position.set(leftEdge + 0.25, 0.06, z);
      group.add(curbL);

      const curbR = new THREE.Mesh(curbGeo, mat);
      curbR.position.set(rightEdge - 0.25, 0.06, z);
      group.add(curbR);
    }

    // Expressway Streetlight Poles along central island (every 24m)
    if (zoneType !== 'unpaved') {
      for (let z = -segmentLength / 2 + 12; z < segmentLength / 2; z += 24) {
        const pole = createStreetlightPole();
        pole.position.set(0, 0, z);
        group.add(pole);
      }
    }
  } else {
    // 2-Lane Undivided:
    const halfLane = isNarrow ? LANE_WIDTH * 0.85 : LANE_WIDTH;

    // Center Yellow Dashed Line with 4.5m pitch
    for (let z = -segmentLength / 2 + 2; z < segmentLength / 2; z += 4.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.0).rotateX(-Math.PI / 2), markMatYellow);
      dash.position.set(0, 0.02, z);
      group.add(dash);

      const catEye = new THREE.Mesh(catEyeGeo, catEyeMat);
      catEye.position.set(0, 0.03, z + 2.25);
      group.add(catEye);
    }

    // Shoulder Solid White Lines
    const edgeLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, segmentLength).rotateX(-Math.PI / 2), markMatWhite);
    edgeLineL.position.set(-halfLane, 0.02, 0);
    group.add(edgeLineL);

    const edgeLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, segmentLength).rotateX(-Math.PI / 2), markMatWhite);
    edgeLineR.position.set(+halfLane, 0.02, 0);
    group.add(edgeLineR);

    // Alternating Red & White Rumble Curbs
    const curbBlockLen = 1.5;
    const curbGeo = new THREE.BoxGeometry(0.3, 0.1, curbBlockLen);
    let curbAlt = false;

    for (let z = -segmentLength / 2 + curbBlockLen / 2; z < segmentLength / 2; z += curbBlockLen) {
      const mat = curbAlt ? redKerbMat : whiteKerbMat;
      curbAlt = !curbAlt;

      const curbL = new THREE.Mesh(curbGeo, mat);
      curbL.position.set(-halfLane - 0.2, 0.05, z);
      group.add(curbL);

      const curbR = new THREE.Mesh(curbGeo, mat);
      curbR.position.set(+halfLane + 0.2, 0.05, z);
      group.add(curbR);
    }
  }

  // 3. Dynamic Environment Decorators tailored to Bangladeshi Zone
  switch (zoneType) {
    case 'long_bridge':
      buildLongBridgeDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'small_bridge':
      buildSmallBridgeDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'town_bazaar':
      buildTownBazaarDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'unpaved':
      buildUnpavedRoadDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'narrow_road':
      buildNarrowRoadDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'flyover':
      buildFlyoverDecorations(group, totalWidth, segmentLength, milestone);
      break;
    case 'countryside':
    default:
      buildCountrysideDecorations(group, totalWidth, segmentLength, milestone);
      break;
  }

  return group;
}

/**
 * 1. Countryside View ("গ্রামীন জনপদ / ধানক্ষেত")
 * Lush green paddy fields, coconut and palm trees, roadside ponds ("পুকুর"), mud & tin houses ("টিনের ঘর")
 */
function buildCountrysideDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Emerald rice paddies terrain
  const terrainGeo = new THREE.PlaneGeometry(160, segmentLength).rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.set(0, -0.05, 0);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Roadside water pond with blue-green water and lily pads
  const pondGeo = new THREE.PlaneGeometry(18, 42).rotateX(-Math.PI / 2);
  const pondMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.2, metalness: 0.3 });
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.position.set(-halfRoad - 18, -0.02, 10);
  group.add(pond);

  // Roadside Palm trees & Betel Nut trees
  for (let z = -segmentLength / 2 + 10; z < segmentLength / 2; z += 18) {
    const palmL = createPalmTree();
    palmL.position.set(-halfRoad - 4 - Math.random() * 5, 0, z);
    group.add(palmL);

    const palmR = createPalmTree();
    palmR.position.set(halfRoad + 4 + Math.random() * 5, 0, z + 9);
    group.add(palmR);
  }

  // Corrugated Tin Roof Houses ("টিনের ঘর")
  const house1 = createTinHouse(0x94a3b8);
  house1.position.set(halfRoad + 16, 0, -25);
  group.add(house1);

  const house2 = createTinHouse(0x0284c7);
  house2.position.set(-halfRoad - 22, 0, 30);
  group.add(house2);

  // Authentic Roadside Tea Stall ("টং দোকান")
  const teaStall = createBengaliShop('আল্লাহর দান চা স্টল', 'চা, বিস্কুট ও পান', '#15803d', 0x16a34a);
  teaStall.position.set(-halfRoad - 5.5, 0, -15);
  teaStall.rotation.y = Math.PI / 2;
  group.add(teaStall);

  // Milestone marker
  const milestoneMarker = createMilestoneMarker(milestone?.districtBn || 'ঢাকা', milestone ? 50 - (milestone.elevationY * 2) : 25);
  milestoneMarker.position.set(-halfRoad - 1.2, 0, 20);
  group.add(milestoneMarker);
}

/**
 * 2. Town Bazaar View ("হাইওয়ে বাজার ও মফস্বল শহর")
 * Dense roadside brick shops, Bengali signboards, striped storefront awnings, overhead powerlines
 */
function buildTownBazaarDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Town asphalt sidewalk / ground
  const groundGeo = new THREE.PlaneGeometry(140, segmentLength).rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Left side shops: Hotel New Dhaka, Bhai Bhai Workshop, Meghna Sweets
  const shopConfigsL = [
    { name: 'হোটেল নিউ ঢাকা', sub: 'কাচ্চি বিরিয়ানি ও চা', bg: '#991b1b', awning: 0xdc2626, z: -35 },
    { name: 'ভাই ভাই অটো পার্টস', sub: 'টায়ার সার্ভিস ও মেকানিক', bg: '#1e3a8a', awning: 0x2563eb, z: 5 },
    { name: 'মেঘনা মিষ্টি ভান্ডার', sub: 'রসমালাই ও দধি', bg: '#15803d', awning: 0x16a34a, z: 42 },
  ];

  shopConfigsL.forEach((cfg) => {
    const shop = createBengaliShop(cfg.name, cfg.sub, cfg.bg, cfg.awning);
    shop.position.set(-halfRoad - 7.5, 0, cfg.z);
    shop.rotation.y = Math.PI / 2;
    group.add(shop);
  });

  // Right side shops: Telecom, Pharmacy, Fruit Stall
  const shopConfigsR = [
    { name: 'বিকাশ ও ফ্লেক্সিলোড', sub: 'মোবাইল রিচার্জ পয়েন্ট', bg: '#be185d', awning: 0xdb2777, z: -25 },
    { name: 'মা ফার্মেসী', sub: 'দেশী-বিদেশী ঔষধ', bg: '#0369a1', awning: 0x0284c7, z: 15 },
    { name: 'সততা ফল ভান্ডার', sub: 'তাজা আম, কলা ও আপেল', bg: '#b45309', awning: 0xd97706, z: 50 },
  ];

  shopConfigsR.forEach((cfg) => {
    const shop = createBengaliShop(cfg.name, cfg.sub, cfg.bg, cfg.awning);
    shop.position.set(halfRoad + 7.5, 0, cfg.z);
    shop.rotation.y = -Math.PI / 2;
    group.add(shop);
  });

  // Concrete utility electric poles with crossarms
  for (let z = -segmentLength / 2 + 10; z < segmentLength / 2; z += 30) {
    const poleL = createElectricPole();
    poleL.position.set(-halfRoad - 2.8, 0, z);
    group.add(poleL);

    const poleR = createElectricPole();
    poleR.position.set(halfRoad + 2.8, 0, z + 15);
    group.add(poleR);
  }

  // Overhead Town Bazaar Welcome Gantry
  const gantry = createHighwayGantry(
    totalWidth,
    milestone?.nameBn || 'দাউদকান্দি হাইওয়ে বাজার',
    'গতিসীমা ৩০ কিমি · বাজার এলাকা'
  );
  gantry.position.set(0, 0, -45);
  group.add(gantry);
}

/**
 * 3. Long River Bridges (Padma Bridge, Jamuna Bridge, Meghna Bridge)
 * Vast river water underneath, high concrete piers, steel Warren trusses / box girders, safety parapets
 */
function buildLongBridgeDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;
  const bridgeStyle = milestone?.bridgeStyle || 'padma';

  // 1. Shimmering River Water (Padma / Jamuna / Meghna River)
  const waterGeo = new THREE.PlaneGeometry(240, segmentLength).rotateX(-Math.PI / 2);
  const waterTex = createWaterTexture();
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    roughness: 0.15,
    metalness: 0.5,
    color: 0x155e75,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -6.5, 0); // 6.5 meters below bridge deck
  water.receiveShadow = true;
  group.add(water);

  // 2. Concrete Bridge Pier Columns descending into river water (every 30m)
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 });
  const pierGeo = new THREE.CylinderGeometry(1.6, 2.0, 7.5, 16);

  for (let z = -segmentLength / 2 + 15; z < segmentLength / 2; z += 30) {
    const pierL = new THREE.Mesh(pierGeo, pierMat);
    pierL.position.set(-halfRoad + 1.2, -3.5, z);
    pierL.castShadow = true;
    group.add(pierL);

    const pierR = new THREE.Mesh(pierGeo, pierMat);
    pierR.position.set(halfRoad - 1.2, -3.5, z);
    pierR.castShadow = true;
    group.add(pierR);
  }

  // 3. Concrete Crash Barrier Parapets along both bridge sides
  const parapetGeo = new THREE.BoxGeometry(0.45, 1.15, segmentLength);
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });

  const parapetL = new THREE.Mesh(parapetGeo, parapetMat);
  parapetL.position.set(-halfRoad - 0.25, 0.58, 0);
  parapetL.castShadow = true;
  group.add(parapetL);

  const parapetR = new THREE.Mesh(parapetGeo, parapetMat);
  parapetR.position.set(halfRoad + 0.25, 0.58, 0);
  parapetR.castShadow = true;
  group.add(parapetR);

  // 4. Iconic Bridge Superstructures:
  if (bridgeStyle === 'padma') {
    // Signature Padma Multipurpose Bridge Warren Steel Truss (Steel diagonals & top chords)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.65, roughness: 0.35 });
    const trussHeight = 8.5;
    const trussPitch = 12;

    for (let z = -segmentLength / 2; z < segmentLength / 2; z += trussPitch) {
      // Diagonal steel struts left and right
      const strutGeo = new THREE.CylinderGeometry(0.18, 0.18, 9.8, 6);
      const strutL1 = new THREE.Mesh(strutGeo, trussMat);
      strutL1.position.set(-halfRoad - 0.3, trussHeight / 2, z + trussPitch / 2);
      strutL1.rotation.x = 0.5;
      group.add(strutL1);

      const strutL2 = new THREE.Mesh(strutGeo, trussMat);
      strutL2.position.set(-halfRoad - 0.3, trussHeight / 2, z + trussPitch / 2);
      strutL2.rotation.x = -0.5;
      group.add(strutL2);

      const strutR1 = new THREE.Mesh(strutGeo, trussMat);
      strutR1.position.set(halfRoad + 0.3, trussHeight / 2, z + trussPitch / 2);
      strutR1.rotation.x = 0.5;
      group.add(strutR1);

      const strutR2 = new THREE.Mesh(strutGeo, trussMat);
      strutR2.position.set(halfRoad + 0.3, trussHeight / 2, z + trussPitch / 2);
      strutR2.rotation.x = -0.5;
      group.add(strutR2);

      // Overhead cross bracing beam
      const crossBeamGeo = new THREE.BoxGeometry(totalWidth + 1.2, 0.3, 0.3);
      const crossBeam = new THREE.Mesh(crossBeamGeo, trussMat);
      crossBeam.position.set(0, trussHeight, z);
      group.add(crossBeam);
    }
  } else if (bridgeStyle === 'jamuna') {
    // Bangabandhu Jamuna Bridge: Parallel Railway track alongside bridge deck!
    const railBedGeo = new THREE.BoxGeometry(3.5, 0.5, segmentLength);
    const railBedMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const railBed = new THREE.Mesh(railBedGeo, railBedMat);
    railBed.position.set(halfRoad + 3.0, 0.1, 0);
    group.add(railBed);

    // Steel rails
    const railSteelGeo = new THREE.BoxGeometry(0.12, 0.18, segmentLength);
    const railSteelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const rail1 = new THREE.Mesh(railSteelGeo, railSteelMat);
    rail1.position.set(halfRoad + 2.3, 0.45, 0);
    group.add(rail1);

    const rail2 = new THREE.Mesh(railSteelGeo, railSteelMat);
    rail2.position.set(halfRoad + 3.7, 0.45, 0);
    group.add(rail2);
  }

  // Bridge Entrance / Milestone Gantry Sign
  const gantry = createHighwayGantry(
    totalWidth,
    milestone?.nameBn || 'পদ্মা বহুমুখী সেতু',
    'নদী: পদ্মা · গতিসীমা ৮০ কিমি/ঘণ্টা'
  );
  gantry.position.set(0, 0, -50);
  group.add(gantry);
}

/**
 * 4. Small Bridge / Culvert ("কালভার্ট ও বেইলি ব্রিজ")
 * Green/blue steel lattice diamond railings, canal underneath ("খাল"), concrete abutments
 */
function buildSmallBridgeDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Canal water under the small bridge
  const canalGeo = new THREE.PlaneGeometry(160, segmentLength).rotateX(-Math.PI / 2);
  const canalMat = new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.25, metalness: 0.3 });
  const canal = new THREE.Mesh(canalGeo, canalMat);
  canal.position.set(0, -3.2, 0);
  group.add(canal);

  // Concrete canal banks at edges
  const bankGeo = new THREE.BoxGeometry(160, 3.2, 12);
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const bank1 = new THREE.Mesh(bankGeo, bankMat);
  bank1.position.set(0, -1.6, -segmentLength / 2 + 6);
  group.add(bank1);

  const bank2 = new THREE.Mesh(bankGeo, bankMat);
  bank2.position.set(0, -1.6, segmentLength / 2 - 6);
  group.add(bank2);

  // Bailey Bridge Steel Diamond Lattice Railings (Signature British/Bangladesh RHD blue-green steel)
  const baileyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.4 });
  const panelPitch = 3.5;

  for (let z = -segmentLength / 2 + 2; z < segmentLength / 2 - 2; z += panelPitch) {
    const postGeo = new THREE.BoxGeometry(0.15, 1.4, 0.15);
    const postL = new THREE.Mesh(postGeo, baileyMat);
    postL.position.set(-halfRoad - 0.2, 0.7, z);
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, baileyMat);
    postR.position.set(halfRoad + 0.2, 0.7, z);
    group.add(postR);

    // Diagonal lattice 'X' brace
    const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
    const braceL1 = new THREE.Mesh(braceGeo, baileyMat);
    braceL1.position.set(-halfRoad - 0.2, 0.7, z + panelPitch / 2);
    braceL1.rotation.x = 0.6;
    group.add(braceL1);

    const braceL2 = new THREE.Mesh(braceGeo, baileyMat);
    braceL2.position.set(-halfRoad - 0.2, 0.7, z + panelPitch / 2);
    braceL2.rotation.x = -0.6;
    group.add(braceL2);

    const braceR1 = new THREE.Mesh(braceGeo, baileyMat);
    braceR1.position.set(halfRoad + 0.2, 0.7, z + panelPitch / 2);
    braceR1.rotation.x = 0.6;
    group.add(braceR1);

    const braceR2 = new THREE.Mesh(braceGeo, baileyMat);
    braceR2.position.set(halfRoad + 0.2, 0.7, z + panelPitch / 2);
    braceR2.rotation.x = -0.6;
    group.add(braceR2);
  }

  // Small bridge RHD signboard
  const sign = createMilestoneMarker(milestone?.districtBn || 'মুন্সীগঞ্জ', 12);
  sign.position.set(-halfRoad - 1.2, 0, -30);
  group.add(sign);
}

/**
 * 5. Highly Unpaved Roads ("ভাঙাচোরা মাটির ও ইটের সড়ক / খানাখন্দ")
 * Clay mud terrain, stacks of red bricks ("ইটের পাঁজা"), gravel heaps, roadwork warning signs
 */
function buildUnpavedRoadDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Reddish-brown clay and gravel terrain
  const terrainGeo = new THREE.PlaneGeometry(150, segmentLength).rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.98 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.set(0, -0.05, 0);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Terracotta Brick Stacks along roadside ("ইটের পাঁজা")
  const brickStackMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.9 });
  const brickPositions = [-40, -15, 12, 38];

  brickPositions.forEach((bz) => {
    const stackGeo = new THREE.BoxGeometry(2.2, 1.4, 3.5);
    const stackL = new THREE.Mesh(stackGeo, brickStackMat);
    stackL.position.set(-halfRoad - 3.2, 0.7, bz);
    stackL.castShadow = true;
    group.add(stackL);

    // Gravel heap on opposite side
    const gravelGeo = new THREE.ConeGeometry(2.0, 1.2, 8);
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.95 });
    const gravelR = new THREE.Mesh(gravelGeo, gravelMat);
    gravelR.position.set(halfRoad + 3.2, 0.6, bz + 10);
    gravelR.castShadow = true;
    group.add(gravelR);
  });

  // Roadwork Warning Signboard ("রাস্তার কাজ চলিতেছে - ধীরগতি")
  const signGroup = new THREE.Group();
  const signPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6);
  const signPostMat = new THREE.MeshStandardMaterial({ color: 0x52525b });
  const post = new THREE.Mesh(signPostGeo, signPostMat);
  post.position.y = 1.4;
  signGroup.add(post);

  const signBoardGeo = new THREE.BoxGeometry(2.2, 1.2, 0.08);
  const signBoardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
  const board = new THREE.Mesh(signBoardGeo, signBoardMat);
  board.position.y = 2.2;
  signGroup.add(board);

  signGroup.position.set(-halfRoad - 2.5, 0, -25);
  group.add(signGroup);
}

/**
 * 6. Narrow Road ("সংকীর্ণ ২-লেন গ্রামীণ মহাসড়ক")
 * Tight road boundary, dense tree canopy meeting overhead, steep roadside ditch
 */
function buildNarrowRoadDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Roadside ditch terrain
  const terrainGeo = new THREE.PlaneGeometry(130, segmentLength).rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.set(0, -0.05, 0);
  group.add(terrain);

  // Towering Rain Trees ("রেইনট্রি ও মেহগনি গাছ") with branches forming an overhead tunnel canopy
  for (let z = -segmentLength / 2 + 6; z < segmentLength / 2; z += 14) {
    const treeL = createRainTree(true);
    treeL.position.set(-halfRoad - 1.8, 0, z);
    group.add(treeL);

    const treeR = createRainTree(false);
    treeR.position.set(halfRoad + 1.8, 0, z + 7);
    group.add(treeR);
  }
}

/**
 * 7. Flyover / Elevated Expressway ("মেয়র হানিফ ফ্লাইওভার / ঢাকা এলিভেটেড এক্সপ্রেসওয়ে")
 * Elevated viaduct on concrete piers, solid crash parapet barriers with hazard markings, city below
 */
function buildFlyoverDecorations(
  group: THREE.Group,
  totalWidth: number,
  segmentLength: number,
  milestone?: MilestoneDefinition
) {
  const halfRoad = totalWidth / 2;

  // Ground level below flyover (Dhaka city streets)
  const cityGroundGeo = new THREE.PlaneGeometry(200, segmentLength).rotateX(-Math.PI / 2);
  const cityGroundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const cityGround = new THREE.Mesh(cityGroundGeo, cityGroundMat);
  cityGround.position.set(0, -8.0, 0); // 8 meters below flyover
  group.add(cityGround);

  // Massive Cylindrical Concrete Flyover Pillars
  const columnMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
  const columnGeo = new THREE.CylinderGeometry(1.8, 2.2, 8.5, 16);

  for (let z = -segmentLength / 2 + 15; z < segmentLength / 2; z += 30) {
    const col = new THREE.Mesh(columnGeo, columnMat);
    col.position.set(0, -4.0, z);
    col.castShadow = true;
    group.add(col);

    // Hammerhead pier cap supporting the deck
    const capGeo = new THREE.BoxGeometry(totalWidth + 1.5, 1.2, 3.5);
    const cap = new THREE.Mesh(capGeo, columnMat);
    cap.position.set(0, -0.6, z);
    group.add(cap);
  }

  // Solid Concrete Parapet Crash Barriers
  const parapetGeo = new THREE.BoxGeometry(0.5, 1.3, segmentLength);
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });

  const parL = new THREE.Mesh(parapetGeo, parapetMat);
  parL.position.set(-halfRoad - 0.25, 0.65, 0);
  parL.castShadow = true;
  group.add(parL);

  const parR = new THREE.Mesh(parapetGeo, parapetMat);
  parR.position.set(halfRoad + 0.25, 0.65, 0);
  parR.castShadow = true;
  group.add(parR);

  // City buildings on ground level far below
  for (let z = -segmentLength / 2 + 15; z < segmentLength / 2; z += 40) {
    const b1 = createCityBuilding(14, 18);
    b1.position.set(-halfRoad - 30, -8.0, z);
    group.add(b1);

    const b2 = createCityBuilding(16, 22);
    b2.position.set(halfRoad + 30, -8.0, z + 20);
    group.add(b2);
  }

  // Overhead Elevated Expressway Gantry
  const gantry = createHighwayGantry(
    totalWidth,
    milestone?.nameBn || 'মেয়র হানিফ ফ্লাইওভার',
    'ঢাকা এলিভেটেড এক্সপ্রেসওয়ে · টোল রোড'
  );
  gantry.position.set(0, 0, -40);
  group.add(gantry);
}

/**
 * Creates authentic Bangladeshi shop building with signboard and striped awning
 */
function createBengaliShop(
  shopName: string,
  sub: string,
  bgColor: string,
  awningColorHex: number
): THREE.Group {
  const shop = new THREE.Group();

  // Brick building body
  const bodyGeo = new THREE.BoxGeometry(6.5, 4.0, 5.0);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2.0;
  body.castShadow = true;
  shop.add(body);

  // Slanted Striped Storefront Awning
  const awningGeo = new THREE.BoxGeometry(6.8, 0.12, 2.2);
  const awningMat = new THREE.MeshStandardMaterial({ color: awningColorHex, roughness: 0.6 });
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.position.set(0, 2.8, 3.2);
  awning.rotation.x = 0.35;
  shop.add(awning);

  // Bengali Shop Signboard
  const signTex = createShopSignTexture(shopName, sub, bgColor);
  const signGeo = new THREE.PlaneGeometry(5.8, 1.8);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 3.4, 2.52);
  shop.add(sign);

  return shop;
}

/**
 * Creates authentic Bengali Corrugated Tin-Roof House ("টিনের ঘর")
 */
function createTinHouse(tinColorHex: number): THREE.Group {
  const house = new THREE.Group();

  // Wooden / Mud Walls
  const wallGeo = new THREE.BoxGeometry(6.0, 2.6, 5.0);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 1.3;
  wall.castShadow = true;
  house.add(wall);

  // Corrugated Tin Gable Roof
  const roofGeo = new THREE.ConeGeometry(4.8, 1.8, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roofMat = new THREE.MeshStandardMaterial({
    color: tinColorHex,
    metalness: 0.65,
    roughness: 0.45,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.5;
  roof.castShadow = true;
  house.add(roof);

  return house;
}

/**
 * Creates modern highway streetlight pole with dual cantilever arms
 */
function createStreetlightPole(): THREE.Group {
  const pole = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.7,
  });

  const mastGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
  const mast = new THREE.Mesh(mastGeo, poleMat);
  mast.position.y = 3.75;
  mast.castShadow = true;
  pole.add(mast);

  const armGeo = new THREE.BoxGeometry(2.8, 0.08, 0.08);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.y = 7.3;
  pole.add(arm);

  const fixtureGeo = new THREE.BoxGeometry(0.5, 0.12, 0.25);
  const lampL = new THREE.Mesh(fixtureGeo, lampMat);
  lampL.position.set(1.4, 7.22, 0);
  pole.add(lampL);

  const lampR = new THREE.Mesh(fixtureGeo, lampMat);
  lampR.position.set(-1.4, 7.22, 0);
  pole.add(lampR);

  return pole;
}

/**
 * Creates roadside wooden electric pole with crossarm
 */
function createElectricPole(): THREE.Group {
  const pole = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });

  const mastGeo = new THREE.CylinderGeometry(0.1, 0.14, 8.0, 6);
  const mast = new THREE.Mesh(mastGeo, woodMat);
  mast.position.y = 4.0;
  pole.add(mast);

  const crossGeo = new THREE.BoxGeometry(1.8, 0.1, 0.1);
  const cross = new THREE.Mesh(crossGeo, woodMat);
  cross.position.y = 7.5;
  pole.add(cross);

  return pole;
}

/**
 * Creates authentic Bengali roadside Palm tree
 */
function createPalmTree(): THREE.Group {
  const tree = new THREE.Group();
  const height = 7 + Math.random() * 3;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.random() * 0.5 - 0.25, height * 0.5, 0),
    new THREE.Vector3(Math.random() * 1.0 - 0.5, height, 0),
  ]);
  const trunkGeo = new THREE.TubeGeometry(curve, 8, 0.22, 6, false);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  tree.add(trunk);

  const frondGeo = new THREE.ConeGeometry(2.8, 1.2, 5);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
  const crown = new THREE.Mesh(frondGeo, frondMat);
  crown.position.set(0, height, 0);
  crown.rotation.x = Math.PI;
  crown.castShadow = true;
  tree.add(crown);

  return tree;
}

/**
 * Creates towering Rain Tree with canopy extending over the highway
 */
function createRainTree(leanRight: boolean): THREE.Group {
  const tree = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 9.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 4.75;
  trunk.rotation.z = leanRight ? -0.18 : 0.18; // Lean slightly over the roadway
  trunk.castShadow = true;
  tree.add(trunk);

  // Large spreading leafy canopy
  const foliageGeo = new THREE.SphereGeometry(4.2, 7, 6);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const canopy = new THREE.Mesh(foliageGeo, foliageMat);
  canopy.position.set(leanRight ? 2.5 : -2.5, 9.8, 0);
  canopy.scale.set(1.5, 0.8, 1.5);
  canopy.castShadow = true;
  tree.add(canopy);

  return tree;
}

/**
 * Creates simple distant city background building for flyovers
 */
function createCityBuilding(width: number, height: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, width);
  const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const b = new THREE.Mesh(geo, mat);
  b.position.y = height / 2;
  return b;
}

/**
 * Creates authentic concrete Highway Milestone marker (e.g. ঢাকা ৫০ কি.মি.)
 */
export function createMilestoneMarker(placeBn = 'ঢাকা', km = 25): THREE.Group {
  const group = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(0.6, 0.85, 0.3);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.42;
  group.add(base);

  // Yellow rounded dome top
  const domeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12);
  domeGeo.rotateZ(Math.PI / 2);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0.92;
  group.add(dome);

  // Milestone Face Sign
  const faceTex = createCustomMilestoneTexture(placeBn, km);
  const faceGeo = new THREE.PlaneGeometry(0.55, 0.8);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 0.5, 0.16);
  group.add(face);

  return group;
}

/**
 * Creates Overhead Highway Gantry with custom Bengali text
 */
export function createHighwayGantry(
  roadWidth: number,
  titleBn = 'পদ্মা সেতু এক্সপ্রেসওয়ে',
  subBn = 'গতিসীমা ৮০ কিমি/ঘণ্টা'
): THREE.Group {
  const gantry = new THREE.Group();

  const postGeo = new THREE.CylinderGeometry(0.2, 0.2, 8.5, 8);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.7 });

  const postL = new THREE.Mesh(postGeo, metalMat);
  postL.position.set(-roadWidth / 2 - 1.5, 4.25, 0);
  gantry.add(postL);

  const postR = new THREE.Mesh(postGeo, metalMat);
  postR.position.set(roadWidth / 2 + 1.5, 4.25, 0);
  gantry.add(postR);

  const crossGeo = new THREE.BoxGeometry(roadWidth + 4, 0.45, 0.45);
  const cross = new THREE.Mesh(crossGeo, metalMat);
  cross.position.set(0, 7.8, 0);
  gantry.add(cross);

  // Signboard
  const signTex = createBridgeNameSignTexture(titleBn, subBn);
  const signGeo = new THREE.PlaneGeometry(7.2, 2.8);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 6.4, 0.25);
  gantry.add(sign);

  return gantry;
}
