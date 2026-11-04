/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocationInfo, ZoneType } from './types';

export interface MilestoneDefinition {
  id: string;
  nameBn: string;
  nameEn: string;
  districtBn: string;
  highwayNumber: string;
  zoneType: ZoneType;
  bridgeStyle?: 'padma' | 'jamuna' | 'meghna';
  badgeBn: string;
  roadSurface: 'asphalt' | 'broken_brick' | 'bridge_deck' | 'flyover_concrete';
  elevationY: number; // e.g. +4.5m for flyover, 0 for ground
  isNarrow: boolean;
  roughness: number; // 0 for smooth, 1.0 for rough unpaved
}

export const ZONE_SEGMENT_SPAN = 480; // Each zone spans 480 meters (4 chunks of 120m)

export const HIGHWAY_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'dhaka_hanif_flyover',
    nameBn: 'মেয়র হানিফ ফ্লাইওভার (যাত্রাবাড়ী)',
    nameEn: 'Mayor Hanif Flyover (Jatrabari)',
    districtBn: 'ঢাকা',
    highwayNumber: 'N1',
    zoneType: 'flyover',
    badgeBn: 'এলিভেটেড ফ্লাইওভার',
    roadSurface: 'flyover_concrete',
    elevationY: 4.8,
    isNarrow: false,
    roughness: 0.05,
  },
  {
    id: 'kanchpur_countryside',
    nameBn: 'কাঁচপুর শান্ত পল্লি ও শীতলক্ষ্যা তট',
    nameEn: 'Kanchpur Countryside & Shitalakshya Basin',
    districtBn: 'নারায়ণগঞ্জ',
    highwayNumber: 'N1',
    zoneType: 'countryside',
    badgeBn: 'গ্রামীন জনপদ',
    roadSurface: 'asphalt',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.1,
  },
  {
    id: 'meghna_bridge',
    nameBn: 'মেঘনা সেতু ও মেঘনা নদী (বাউশিয়া)',
    nameEn: 'Meghna Bridge & River Channel',
    districtBn: 'মুন্সীগঞ্জ',
    highwayNumber: 'N1',
    zoneType: 'long_bridge',
    bridgeStyle: 'meghna',
    badgeBn: 'দীর্ঘ নদী সেতু',
    roadSurface: 'bridge_deck',
    elevationY: 3.5,
    isNarrow: false,
    roughness: 0.08,
  },
  {
    id: 'daudkandi_bazaar',
    nameBn: 'দাউদকান্দি হাইওয়ে বাজার ও চৌরাস্তা',
    nameEn: 'Daudkandi Highway Bazaar & Junction',
    districtBn: 'কুমিল্লা',
    highwayNumber: 'N1',
    zoneType: 'town_bazaar',
    badgeBn: 'হাইওয়ে বাজার',
    roadSurface: 'asphalt',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.15,
  },
  {
    id: 'chandina_unpaved',
    nameBn: 'চান্দিনা ভাঙাচোরা বিকল্প সড়ক ও খানাখন্দ',
    nameEn: 'Chandina Broken Road & Potholes',
    districtBn: 'কুমিল্লা',
    highwayNumber: 'R140',
    zoneType: 'unpaved',
    badgeBn: 'ভাঙাচোরা সড়ক',
    roadSurface: 'broken_brick',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.85,
  },
  {
    id: 'munshiganj_culvert',
    nameBn: 'মুন্সিগঞ্জ খাল ও বেইলি ব্রিজ',
    nameEn: 'Munshiganj Canal & Bailey Bridge',
    districtBn: 'মুন্সীগঞ্জ',
    highwayNumber: 'N8',
    zoneType: 'small_bridge',
    badgeBn: 'ছোট বেইলি ব্রিজ',
    roadSurface: 'bridge_deck',
    elevationY: 1.6,
    isNarrow: false,
    roughness: 0.2,
  },
  {
    id: 'padma_bridge',
    nameBn: 'পদ্মা বহুমুখী সেতু (মাওয়া ➔ জাজিরা)',
    nameEn: 'Padma Multipurpose Bridge (Mawa - Janjira)',
    districtBn: 'মুন্সীগঞ্জ - শরীয়তপুর',
    highwayNumber: 'N8',
    zoneType: 'long_bridge',
    bridgeStyle: 'padma',
    badgeBn: 'জাতীয় মেগা সেতু',
    roadSurface: 'bridge_deck',
    elevationY: 5.5,
    isNarrow: false,
    roughness: 0.04,
  },
  {
    id: 'faridpur_narrow',
    nameBn: 'ভাঙ্গা - ফরিদপুর সংকীর্ণ গ্রামীণ মহাসড়ক',
    nameEn: 'Bhanga - Faridpur Narrow Highway',
    districtBn: 'ফরিদপুর',
    highwayNumber: 'N804',
    zoneType: 'narrow_road',
    badgeBn: 'সংকীর্ণ মহাসড়ক',
    roadSurface: 'asphalt',
    elevationY: 0,
    isNarrow: true,
    roughness: 0.25,
  },
  {
    id: 'tangail_countryside',
    nameBn: 'টাঙ্গাইল সবুজ ধানক্ষেত ও খেজুর বাগান',
    nameEn: 'Tangail Lush Paddy Fields & Palm Groves',
    districtBn: 'টাঙ্গাইল',
    highwayNumber: 'N4',
    zoneType: 'countryside',
    badgeBn: 'ধানক্ষেত ও পল্লি',
    roadSurface: 'asphalt',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.1,
  },
  {
    id: 'jamuna_bridge',
    nameBn: 'বঙ্গবন্ধু যমুনা বহুমুখী সেতু (যমুনা নদী)',
    nameEn: 'Bangabandhu Jamuna Multipurpose Bridge',
    districtBn: 'সিরাজগঞ্জ',
    highwayNumber: 'N405',
    zoneType: 'long_bridge',
    bridgeStyle: 'jamuna',
    badgeBn: 'যমুনা মেগা সেতু',
    roadSurface: 'bridge_deck',
    elevationY: 4.5,
    isNarrow: false,
    roughness: 0.05,
  },
  {
    id: 'bogura_bazaar',
    nameBn: 'বগুড়া চারমাথা হাইওয়ে বাজার ও মিষ্টি মহাল',
    nameEn: 'Bogura Charmatha Bazaar & Junction',
    districtBn: 'বগুড়া',
    highwayNumber: 'N5',
    zoneType: 'town_bazaar',
    badgeBn: 'মফস্বল শহর ও বাজার',
    roadSurface: 'asphalt',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.18,
  },
  {
    id: 'rangpur_unpaved',
    nameBn: 'রংপুর সংযোগ কাঁচা মাটির সড়ক ও ধুলাবালি',
    nameEn: 'Rangpur Unpaved Mud & Brick Highway',
    districtBn: 'রংপুর',
    highwayNumber: 'R547',
    zoneType: 'unpaved',
    badgeBn: 'কাঁচা ও ভাঙা সড়ক',
    roadSurface: 'broken_brick',
    elevationY: 0,
    isNarrow: false,
    roughness: 0.9,
  },
  {
    id: 'dhaka_elevated',
    nameBn: 'কুড়িল - বিমানবন্দর ঢাকা এলিভেটেড এক্সপ্রেসওয়ে',
    nameEn: 'Kuril - Airport Elevated Expressway',
    districtBn: 'ঢাকা',
    highwayNumber: 'N3',
    zoneType: 'flyover',
    badgeBn: 'এলিভেটেড এক্সপ্রেসওয়ে',
    roadSurface: 'flyover_concrete',
    elevationY: 5.2,
    isNarrow: false,
    roughness: 0.04,
  },
];

const TOTAL_LOOP_SPAN = HIGHWAY_MILESTONES.length * ZONE_SEGMENT_SPAN;

/**
 * Returns the milestone active at world coordinate z
 */
export function getMilestoneAtZ(z: number): MilestoneDefinition {
  const positiveZ = Math.max(0, z);
  const normalizedZ = positiveZ % TOTAL_LOOP_SPAN;
  const index = Math.floor(normalizedZ / ZONE_SEGMENT_SPAN);
  return HIGHWAY_MILESTONES[index % HIGHWAY_MILESTONES.length];
}

/**
 * Returns complete LocationInfo for HUD and notifications
 */
export function getLocationInfoAtZ(z: number): LocationInfo {
  const positiveZ = Math.max(0, z);
  const normalizedZ = positiveZ % TOTAL_LOOP_SPAN;
  const currentIndex = Math.floor(normalizedZ / ZONE_SEGMENT_SPAN) % HIGHWAY_MILESTONES.length;
  const current = HIGHWAY_MILESTONES[currentIndex];

  const nextIndex = (currentIndex + 1) % HIGHWAY_MILESTONES.length;
  const next = HIGHWAY_MILESTONES[nextIndex];

  const distanceIntoCurrentZone = normalizedZ - currentIndex * ZONE_SEGMENT_SPAN;
  const remainingDistanceInZone = ZONE_SEGMENT_SPAN - distanceIntoCurrentZone;
  const nextDistanceKm = parseFloat((remainingDistanceInZone / 1000).toFixed(1));
  const kmMarker = Math.floor(positiveZ / 1000);

  return {
    id: current.id,
    nameBn: current.nameBn,
    nameEn: current.nameEn,
    districtBn: current.districtBn,
    highwayNumber: current.highwayNumber,
    zoneType: current.zoneType,
    badgeBn: current.badgeBn,
    kmMarker,
    nextDestinationBn: next.nameBn,
    nextDistanceKm,
  };
}
