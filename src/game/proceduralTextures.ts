/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BusLivery } from './types';

export const BUS_LIVERIES: BusLivery[] = [
  {
    id: 'greenline',
    name: 'Green Line Paribahan',
    bengaliName: 'গ্রীন লাইন পরিবহন',
    primaryColor: '#0b6623',
    secondaryColor: '#f4f4f4',
    accentColor: '#ffd700',
    stripeColor: '#004d1a',
    rearQuote: 'মা-বাবার দোয়া',
    routeQuote: 'ঢাকা - কক্সবাজার',
  },
  {
    id: 'hanif',
    name: 'Hanif Enterprise',
    bengaliName: 'হানিফ এন্টারপ্রাইজ',
    primaryColor: '#e0e0e0',
    secondaryColor: '#c8102e',
    accentColor: '#1a1a1a',
    stripeColor: '#99001a',
    rearQuote: 'গাড়ির চাপ হইতে সাবধান',
    routeQuote: 'ঢাকা - চট্টগ্রাম',
  },
  {
    id: 'shyamoli',
    name: 'Shyamoli Paribahan',
    bengaliName: 'শ্যামলী পরিবহন',
    primaryColor: '#0f2b5c',
    secondaryColor: '#f9a825',
    accentColor: '#ffffff',
    stripeColor: '#091c3e',
    rearQuote: 'আল্লাহ সর্বশক্তিমান',
    routeQuote: 'ঢাকা - সিলেট',
  },
  {
    id: 'ena',
    name: 'Ena Transport',
    bengaliName: 'এনা ট্রান্সপোর্ট',
    primaryColor: '#fdfbf7',
    secondaryColor: '#8b0000',
    accentColor: '#2b2b2b',
    stripeColor: '#5c0000',
    rearQuote: 'দেশ ভ্রমণ',
    routeQuote: 'ঢাকা - ময়মনসিংহ',
  },
];

/**
 * Creates high-detail procedural canvas texture for Bangladeshi Bus Sides & Body
 */
export function createBusLiveryTexture(livery: BusLivery): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Realistic Metallic Automotive Base Paint with subtle vertical gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  baseGrad.addColorStop(0, livery.primaryColor);
  baseGrad.addColorStop(0.35, livery.primaryColor);
  baseGrad.addColorStop(0.7, livery.primaryColor);
  baseGrad.addColorStop(1.0, livery.stripeColor);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // 2. Continuous Tinted Panoramic Passenger Windows (Top Deck)
  const windowY = 160;
  const windowH = 340;
  
  // Dark bonded glass tint
  const glassGrad = ctx.createLinearGradient(0, windowY, 0, windowY + windowH);
  glassGrad.addColorStop(0, '#0a0d14');
  glassGrad.addColorStop(0.5, '#121926');
  glassGrad.addColorStop(1, '#080a0f');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(100, windowY, 1850, windowH);

  // Window pillars (modern flush-bonded coach glass)
  ctx.strokeStyle = '#05070a';
  ctx.lineWidth = 14;
  for (let x = 320; x < 1900; x += 220) {
    ctx.beginPath();
    ctx.moveTo(x, windowY);
    ctx.lineTo(x, windowY + windowH);
    ctx.stroke();

    // Subtle window curtains / passenger silhouettes inside
    ctx.fillStyle = 'rgba(217, 119, 6, 0.22)'; // Warm golden luxury curtain drape
    ctx.beginPath();
    ctx.ellipse(x - 110, windowY + 80, 45, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle seat headrest silhouette
    ctx.fillStyle = 'rgba(20, 24, 33, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - 130, windowY + 120, 40, 50, 8);
    ctx.fill();
  }

  // Window Glass Sky Reflection Highlight Streak
  const streakGrad = ctx.createLinearGradient(100, windowY, 1950, windowY + windowH);
  streakGrad.addColorStop(0, 'rgba(255,255,255,0)');
  streakGrad.addColorStop(0.3, 'rgba(255,255,255,0.08)');
  streakGrad.addColorStop(0.4, 'rgba(255,255,255,0.22)');
  streakGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  streakGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = streakGrad;
  ctx.fillRect(100, windowY, 1850, windowH);

  // Chrome beltline trim separating window from body
  const chromeGrad = ctx.createLinearGradient(0, windowY + windowH - 4, 0, windowY + windowH + 12);
  chromeGrad.addColorStop(0, '#e2e8f0');
  chromeGrad.addColorStop(0.5, '#ffffff');
  chromeGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = chromeGrad;
  ctx.fillRect(80, windowY + windowH, 1880, 14);

  // 3. Dynamic Aerodynamic Sweeping Liveries (Volvo / Scania Luxury Intercity Style)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 680);
  ctx.bezierCurveTo(600, 640, 1200, 380, 2048, 360);
  ctx.lineTo(2048, 560);
  ctx.bezierCurveTo(1200, 580, 600, 780, 0, 820);
  ctx.closePath();
  ctx.fillStyle = livery.secondaryColor;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.fill();

  // Secondary Accent Ribbon
  ctx.beginPath();
  ctx.moveTo(0, 810);
  ctx.bezierCurveTo(700, 760, 1300, 540, 2048, 560);
  ctx.lineTo(2048, 620);
  ctx.bezierCurveTo(1300, 600, 700, 810, 0, 870);
  ctx.closePath();
  ctx.fillStyle = livery.accentColor;
  ctx.fill();
  ctx.restore();

  // 4. Lower Skirt Rocker Panel & Mud Splash Guard
  ctx.fillStyle = livery.stripeColor;
  ctx.fillRect(0, 940, 2048, 84);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 990, 2048, 34);

  // Wheel Arch Protective Mouldings
  const wheelArchPositions = [420, 1500, 1780];
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 16;
  wheelArchPositions.forEach((wx) => {
    ctx.beginPath();
    ctx.arc(wx, 1024, 180, Math.PI, 0, false);
    ctx.stroke();
  });

  // 5. Luggage Compartment Doors (Realistic Panel Seams & Chrome Latches)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 4;
  for (let lx = 640; lx < 1400; lx += 240) {
    // Door outline
    ctx.strokeRect(lx, 740, 220, 190);
    // Bevel shadow
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(lx + 2, 742, 216, 4);

    // Chrome flush paddle latch
    const latchGrad = ctx.createLinearGradient(lx + 90, 760, lx + 90, 785);
    latchGrad.addColorStop(0, '#f8fafc');
    latchGrad.addColorStop(0.5, '#94a3b8');
    latchGrad.addColorStop(1, '#334155');
    ctx.fillStyle = latchGrad;
    ctx.fillRect(lx + 90, 760, 40, 25);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(lx + 90, 760, 40, 25);

    // Keyhole
    ctx.fillStyle = '#000000';
    ctx.fillRect(lx + 108, 770, 4, 8);
  }

  // 6. Authentic Transport Brand Lettering & Fleet Badging
  ctx.save();
  // Drop shadow for 3D metallic sign effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  ctx.shadowBlur = 10;

  // Bengali calligraphy brand
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px "SolaimanLipi", "Kalpurush", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(livery.bengaliName, 1024, 270);

  // English prominent livery title
  const brandTextColor = livery.accentColor === '#ffffff' ? '#ffffff' : livery.secondaryColor === '#c8102e' ? '#ffffff' : '#ffd700';
  ctx.fillStyle = brandTextColor;
  ctx.font = '900 108px "Arial Black", Impact, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(livery.name.toUpperCase(), 1024, 370);

  // Fleet specification badge
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText('SCANIA TOURING · AIR SUSPENSION MULTI-AXLE COACH', 1024, 660);
  ctx.fillText('DIRECT INTERCITY HIGHWAY SERVICE', 1024, 705);
  ctx.restore();

  // Amber side marker clearance lights
  for (let mx = 180; mx < 2000; mx += 360) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(mx, 930, 28, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Realistic Bus Rear Texture with authentic glass, BRTA plate, and lighting
 */
export function createBusRearTexture(livery: BusLivery): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Rear Body Metallic Automotive Paint with subtle ambient vignette
  const rearGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  rearGrad.addColorStop(0, livery.primaryColor);
  rearGrad.addColorStop(0.5, livery.primaryColor);
  rearGrad.addColorStop(1, livery.stripeColor);
  ctx.fillStyle = rearGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Aerodynamic roof spoiler shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(60, 40, 904, 30);

  // High Mount Third Brake Light Strip
  ctx.fillStyle = '#990000';
  ctx.fillRect(360, 50, 304, 16);
  ctx.fillStyle = '#ff2222';
  for (let bx = 370; bx < 660; bx += 20) {
    ctx.beginPath();
    ctx.arc(bx, 58, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Tinted Rear Panoramic Curved Windshield
  const rearGlassGrad = ctx.createLinearGradient(0, 90, 0, 520);
  rearGlassGrad.addColorStop(0, '#090d14');
  rearGlassGrad.addColorStop(0.6, '#111827');
  rearGlassGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = rearGlassGrad;
  ctx.beginPath();
  ctx.roundRect(70, 90, 884, 430, 24);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Glass defroster heating lines
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
  ctx.lineWidth = 2;
  for (let gy = 140; gy < 490; gy += 38) {
    ctx.beginPath();
    ctx.moveTo(90, gy);
    ctx.lineTo(934, gy);
    ctx.stroke();
  }

  // 3. Localized Rear Glass Calligraphy Quotes
  ctx.save();
  ctx.textAlign = 'center';

  // Primary Bengali Quote (e.g., মা-বাবার দোয়া / আল্লাহ সর্বশক্তিমান)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd700'; // Pure polished gold leaf
  ctx.font = 'bold 64px "SolaimanLipi", "Kalpurush", sans-serif';
  ctx.fillText(livery.rearQuote, 512, 230);

  // Route indicator in glass
  ctx.font = 'bold 38px "SolaimanLipi", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(livery.routeQuote, 512, 310);

  // Safety Warning
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#06b6d4';
  ctx.fillText('KEEP DISTANCE · নিরাপদ দূরত্ব বজায় রাখুন', 512, 390);

  // Emergency Exit Badge
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText('⚠ EMERGENCY EXIT · জরুরী নির্গমন', 512, 460);
  ctx.restore();

  // 4. Rear Engine Louver Grill (Essential for diesel coach realism!)
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(240, 560, 544, 180, 12);
  ctx.fill();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Engine slats
  ctx.fillStyle = '#000000';
  for (let ly = 580; ly < 730; ly += 16) {
    ctx.fillRect(255, ly, 514, 8);
  }

  // Brand chrome emblem in center of grill
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '900 28px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(livery.name.split(' ')[0].toUpperCase(), 512, 660);

  // 5. Official BRTA Bangladesh Number Plate
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(352, 790, 320, 120, 10);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Green BRTA Header Bar
  ctx.fillStyle = '#006a4e';
  ctx.beginPath();
  ctx.roundRect(352, 790, 320, 28, [10, 10, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BANGLADESH', 512, 810);

  // Bengali Metro Registration
  ctx.fillStyle = '#09090b';
  ctx.font = '900 36px "SolaimanLipi", sans-serif';
  ctx.fillText('ঢাকা মেট্রো - ব', 512, 856);
  ctx.font = '900 38px Arial, sans-serif';
  ctx.fillText('১৫-৭৮৯২', 512, 896);
  ctx.restore();

  // 6. Photorealistic LED Tail-Light Clusters (Left & Right)
  const drawTailLight = (lx: number) => {
    // Light housing
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(lx, 620, 110, 300, 14);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Top: Dynamic Sequential Amber Indicator Light
    const amberGrad = ctx.createLinearGradient(lx, 630, lx, 700);
    amberGrad.addColorStop(0, '#f59e0b');
    amberGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = amberGrad;
    ctx.beginPath();
    ctx.roundRect(lx + 10, 630, 90, 65, 8);
    ctx.fill();

    // Middle: White Reverse Prism Light
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(lx + 10, 705, 90, 45, 6);
    ctx.fill();

    // Bottom: Dual-Stage Red LED Brake Matrix
    const redGrad = ctx.createLinearGradient(lx, 760, lx, 905);
    redGrad.addColorStop(0, '#ef4444');
    redGrad.addColorStop(0.5, '#dc2626');
    redGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = redGrad;
    ctx.beginPath();
    ctx.roundRect(lx + 10, 760, 90, 150, 8);
    ctx.fill();

    // LED dots inside brake matrix
    ctx.fillStyle = '#ff8888';
    for (let r = 780; r < 900; r += 24) {
      for (let c = lx + 25; c < lx + 90; c += 24) {
        ctx.beginPath();
        ctx.arc(c, r, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  drawTailLight(70);
  drawTailLight(844);

  // Lower bumper chrome protective bar
  const bumpGrad = ctx.createLinearGradient(0, 950, 0, 990);
  bumpGrad.addColorStop(0, '#e2e8f0');
  bumpGrad.addColorStop(0.5, '#64748b');
  bumpGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bumpGrad;
  ctx.fillRect(80, 950, 864, 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Front Destination Banner Texture (e.g. ঢাকা - চট্টগ্রাম)
 */
export function createBusDestinationTexture(route: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Glowing illuminated destination box
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 44px "SolaimanLipi", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffbb00';
  ctx.shadowBlur = 12;
  ctx.fillText(route, 256, 76);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Bangladeshi Tata/Ashok Leyland 10-Wheel Truck Wooden Bed Texture
 * Hand-painted folk truck art with flowers, tigers, and Bengali quotes
 */
export function createTruckArtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Wooden plank slats background
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 512, 256);

  // Planks lines
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 3;
  for (let y = 32; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Truck art floral borders
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 512, 20);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 236, 512, 20);

  // Diamond geometric folk patterns
  for (let x = 30; x < 500; x += 60) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.arc(x, 246, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bengali Truck Art Slogans
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.font = 'bold 36px "SolaimanLipi", sans-serif';
  ctx.fillText('খোদা ভরসা · চলবে', 256, 115);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('হর্ন বাজান (BLOW HORN)', 256, 175);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Green CNG Auto-Rickshaw Canvas Texture with wire mesh door pattern
 */
export function createCNGTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Classic CNG bottle green color
  ctx.fillStyle = '#046a38';
  ctx.fillRect(0, 0, 256, 256);

  // Yellow roof stripe
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 70);

  // Wire mesh diamond pattern for passenger security cage
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  const step = 14;
  for (let i = 80; i < 220; i += step) {
    ctx.beginPath();
    ctx.moveTo(30, i);
    ctx.lineTo(226, i + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(30, i + 40);
    ctx.lineTo(226, i);
    ctx.stroke();
  }

  // Dhaka Metro CNG serial number
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(80, 215, 96, 32);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ঢাকা মেট্রো-থ', 128, 230);
  ctx.fillText('১১-৪৫৯০', 128, 244);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Highway Asphalt Texture with realistic road markings
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Noise aggregate grains
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = Math.floor(30 + Math.random() * 35);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8);
  return texture;
}

/**
 * Creates Highway Green Directional Signboard
 */
export function createHighwaySignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Green Highway Board
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "SolaimanLipi", sans-serif';
  ctx.fillText('পদ্মা সেতু এক্সপ্রেসওয়ে', 256, 75);

  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('PADMA BRIDGE EXPRESSWAY (N8)', 256, 115);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('← মাওয়া - ভাঙ্গা · ঢাকা →', 256, 185);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Unpaved Broken Clay & Brick Road Texture ("ভাঙাচোরা মাটির ও ইটের সড়ক")
 */
export function createUnpavedRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Clay mud reddish-brown base
  ctx.fillStyle = '#653a2a';
  ctx.fillRect(0, 0, 512, 512);

  // Patches of eroded grey asphalt remnants
  for (let i = 0; i < 24; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const rad = 25 + Math.random() * 60;
    ctx.fillStyle = 'rgba(40, 44, 52, 0.55)';
    ctx.beginPath();
    ctx.ellipse(px, py, rad, rad * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Terracotta broken brick shards ("ইটের সুরকি ও খোয়া")
  for (let i = 0; i < 800; i++) {
    const bx = Math.random() * 512;
    const by = Math.random() * 512;
    const bColor = Math.random() > 0.5 ? '#b91c1c' : '#c2410c';
    ctx.fillStyle = bColor;
    ctx.fillRect(bx, by, 3 + Math.random() * 4, 2 + Math.random() * 3);
  }

  // Dark pothole / puddle craters
  for (let i = 0; i < 8; i++) {
    const hx = 60 + Math.random() * 390;
    const hy = 60 + Math.random() * 390;
    const grad = ctx.createRadialGradient(hx, hy, 4, hx, hy, 35);
    grad.addColorStop(0, '#2d1810');
    grad.addColorStop(0.7, '#452619');
    grad.addColorStop(1, 'rgba(101, 58, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 6);
  return texture;
}

/**
 * Creates Concrete Bridge Deck Texture with expansion joints
 */
export function createBridgeDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Smooth engineered concrete
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete texture grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const b = Math.floor(55 + Math.random() * 25);
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Steel expansion joint finger plate across the deck
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 250, 512, 12);
  ctx.fillStyle = '#71717a';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 250, 8, 12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

/**
 * Creates Clean Viaduct Concrete Texture for Flyovers
 */
export function createFlyoverDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Smooth dark asphalt/concrete
  ctx.fillStyle = '#27272a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const b = Math.floor(40 + Math.random() * 20);
    ctx.fillStyle = `rgb(${b},${b},${b})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 6);
  return texture;
}

/**
 * Creates River Water Texture (Padma, Jamuna, Meghna)
 */
export function createWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep river silt water (blue-green tinted river)
  ctx.fillStyle = '#0f3844';
  ctx.fillRect(0, 0, 512, 512);

  // Soft silt ripples
  for (let y = 0; y < 512; y += 16) {
    ctx.strokeStyle = 'rgba(45, 125, 140, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 4);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Creates authentic Bengali Highway Shop Signboard
 */
export function createShopSignTexture(
  shopName: string,
  sub: string,
  bgColor: string = '#1e3a8a',
  textColor: string = '#ffffff'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);

  // Border outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 148);

  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.font = 'bold 36px "SolaimanLipi", sans-serif';
  ctx.fillText(shopName, 256, 68);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(sub, 256, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Bridge Name Gantry Sign (e.g. পদ্মা বহুমুখী সেতু)
 */
export function createBridgeNameSignTexture(nameBn: string, riverBn: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Green Highway Sign
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "SolaimanLipi", sans-serif';
  ctx.fillText(nameBn, 256, 85);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`নদী: ${riverBn} · সাবধানে চলুন`, 256, 145);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('SPEED LIMIT 80 KM/H · NO STOPPING', 256, 205);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Milestone Marker with Bengali Place Name
 */
export function createCustomMilestoneTexture(placeBn: string, km: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px "SolaimanLipi", sans-serif';
  ctx.fillText(placeBn, 128, 90);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'black 64px sans-serif';
  ctx.fillText(`${km}`, 128, 175);

  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('কি.মি.', 128, 225);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
