// A fictional demo board ("AV-01"). It is NOT a real or verified circuit;
// positions and values only exist so the viewer has something to show.

export type BoardLayerId = "components" | "silkscreen" | "topCopper" | "bottomCopper";

export interface BoardLayer {
  id: BoardLayerId;
  label: string;
}

export const BOARD_LAYERS: BoardLayer[] = [
  { id: "components", label: "Components" },
  { id: "silkscreen", label: "Silkscreen (labels)" },
  { id: "topCopper", label: "Top copper" },
  { id: "bottomCopper", label: "Bottom copper" },
];

export interface Part {
  ref: string;       // designator, e.g. "R1"
  kind: string;      // e.g. "Resistor"
  value: string;     // e.g. "10 kΩ"
  note: string;      // short description
  x: number; y: number; w: number; h: number; // board units, origin top-left
  z: number;         // height
  color: string;
}

export const BOARD = { w: 100, h: 64, name: "AV-01 demo sensor board" };

export const PARTS: Part[] = [
  { ref: "U1", kind: "Microcontroller", value: "32-pin QFN", note: "Main controller (fictional).", x: 40, y: 22, w: 16, h: 16, z: 2, color: "#2b2f36" },
  { ref: "U2", kind: "Voltage regulator", value: "3.3 V", note: "Turns USB power into 3.3 V.", x: 14, y: 40, w: 10, h: 7, z: 2.5, color: "#30343b" },
  { ref: "J1", kind: "USB-C connector", value: "16-pin", note: "Power and data in.", x: 2, y: 24, w: 9, h: 14, z: 4, color: "#a7adb5" },
  { ref: "J2", kind: "Pin header", value: "1×6, 2.54 mm", note: "Programming header.", x: 80, y: 6, w: 16, h: 4, z: 6, color: "#1f2227" },
  { ref: "Y1", kind: "Crystal", value: "16 MHz", note: "Clock for U1.", x: 60, y: 26, w: 8, h: 5, z: 2.5, color: "#c9ccd1" },
  { ref: "C1", kind: "Capacitor", value: "10 µF", note: "Input filtering for U2.", x: 14, y: 50, w: 5, h: 3, z: 1.6, color: "#b98a52" },
  { ref: "C2", kind: "Capacitor", value: "10 µF", note: "Output filtering for U2.", x: 26, y: 42, w: 5, h: 3, z: 1.6, color: "#b98a52" },
  { ref: "C3", kind: "Capacitor", value: "100 nF", note: "Decoupling for U1.", x: 40, y: 14, w: 4, h: 2.5, z: 1.2, color: "#b98a52" },
  { ref: "R1", kind: "Resistor", value: "10 kΩ", note: "Pull-up for the button.", x: 70, y: 44, w: 5, h: 2.5, z: 1.2, color: "#3b3f46" },
  { ref: "R2", kind: "Resistor", value: "330 Ω", note: "Current limit for D1.", x: 70, y: 52, w: 5, h: 2.5, z: 1.2, color: "#3b3f46" },
  { ref: "D1", kind: "LED", value: "Green", note: "Power / status light.", x: 82, y: 51, w: 4, h: 4, z: 1.6, color: "#3aa35a" },
  { ref: "SW1", kind: "Push button", value: "6×6 mm", note: "User button.", x: 80, y: 36, w: 9, h: 9, z: 4, color: "#5b6069" },
];

// Simple traces as polylines in board units.
export const TOP_TRACES: number[][][] = [
  [[11, 31], [40, 31]],
  [[11, 28], [24, 28], [24, 43], [19, 43]],
  [[24, 44], [26, 44]],
  [[48, 22], [48, 15], [44, 15]],
  [[56, 28], [60, 28]],
  [[56, 34], [72, 34], [72, 44]],
  [[72, 46.5], [72, 52]],
  [[75, 53], [82, 53]],
  [[56, 25], [76, 25], [76, 8], [80, 8]],
  [[75, 45], [80, 40]],
];

export const BOTTOM_TRACES: number[][][] = [
  [[6, 58], [94, 58]],
  [[6, 58], [6, 40]],
  [[94, 58], [94, 12]],
  [[30, 58], [30, 48], [44, 40]],
  [[60, 58], [60, 36], [56, 36]],
];
