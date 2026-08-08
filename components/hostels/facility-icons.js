/**
 * One lucide icon per entry in the `FACILITIES` vocabulary exported from
 * `@/models/Hostel`. Icons are never emoji, and an unknown value still gets a
 * neutral glyph rather than a hole in the grid.
 */

import {
  AirVent,
  ArrowUpDown,
  Bath,
  BatteryCharging,
  BedDouble,
  BookOpen,
  Bus,
  Cctv,
  CircleParking,
  CircleCheck,
  CookingPot,
  Droplets,
  Dumbbell,
  GlassWater,
  MoonStar,
  ShieldCheck,
  Sofa,
  SprayCan,
  Store,
  Trees,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
} from 'lucide-react';

const ICONS = {
  WiFi: Wifi,
  Meals: UtensilsCrossed,
  Laundry: WashingMachine,
  CCTV: Cctv,
  Security: ShieldCheck,
  AC: AirVent,
  'Power Backup': BatteryCharging,
  Parking: CircleParking,
  'Study Room': BookOpen,
  Gym: Dumbbell,
  Kitchen: CookingPot,
  'Hot Water': Droplets,
  Housekeeping: SprayCan,
  'Prayer Area': MoonStar,
  'Outdoor Area': Trees,
  'Attached Bath': Bath,
  Transport: Bus,
  'On-site Shop': Store,
  'Common Lounge': Sofa,
  'Filtered Water': GlassWater,
  Elevator: ArrowUpDown,
  Furnished: BedDouble,
};

export function facilityIcon(name) {
  return ICONS[name] || CircleCheck;
}

export default ICONS;
