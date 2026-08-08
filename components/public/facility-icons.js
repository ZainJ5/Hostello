import {
  AirVent,
  Armchair,
  Bath,
  BookOpen,
  BrushCleaning,
  Bus,
  Cctv,
  CookingPot,
  Dumbbell,
  GlassWater,
  HandHeart,
  MoveVertical,
  ShieldCheck,
  ShowerHead,
  Sofa,
  Sparkles,
  SquareParking,
  Store,
  Trees,
  Utensils,
  WashingMachine,
  Wifi,
  Zap,
} from 'lucide-react';

/**
 * One icon per entry in the `FACILITIES` vocabulary exported by
 * `@/models/Hostel`. Kept in a single map so a facility never renders with two
 * different glyphs across the card, the filter rail and the detail page.
 */
export const FACILITY_ICONS = {
  WiFi: Wifi,
  Meals: Utensils,
  Laundry: WashingMachine,
  CCTV: Cctv,
  Security: ShieldCheck,
  AC: AirVent,
  'Power Backup': Zap,
  Parking: SquareParking,
  'Study Room': BookOpen,
  Gym: Dumbbell,
  Kitchen: CookingPot,
  'Hot Water': ShowerHead,
  Housekeeping: BrushCleaning,
  'Prayer Area': HandHeart,
  'Outdoor Area': Trees,
  'Attached Bath': Bath,
  Transport: Bus,
  'On-site Shop': Store,
  'Common Lounge': Sofa,
  'Filtered Water': GlassWater,
  Elevator: MoveVertical,
  Furnished: Armchair,
};

/** Falls back to a neutral glyph so an unknown facility still renders a chip. */
export function facilityIcon(name) {
  return FACILITY_ICONS[name] || Sparkles;
}
