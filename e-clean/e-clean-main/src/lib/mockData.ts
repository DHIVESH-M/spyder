import type { ScanResult } from './types';

// Realistic mock detection for an Arduino UNO. Structured to mirror the
// expected response from POST /api/detect so the real ML backend can be
// dropped in later without touching the UI.
export const arduinoScan: ScanResult = {
  device: 'Arduino UNO',
  confidence: 96,
  imageHint: 'arduino',
  components: [
    {
      id: 'pcb',
      name: 'PCB',
      confidence: 96,
      materials: ['Fiberglass composite', 'Copper traces', 'Solder mask'],
      recoveryMethod: 'Send PCB fraction for specialized material recovery',
      recoveryPotential: 'High',
      box: { x: 6, y: 8, w: 88, h: 84 },
    },
    {
      id: 'ic',
      name: 'IC / Microcontroller',
      confidence: 92,
      materials: ['Silicon die', 'Ceramic/plastic package', 'Lead-frame alloy'],
      recoveryMethod: 'Remove and send to precious-metal refiner',
      recoveryPotential: 'High',
      box: { x: 30, y: 34, w: 40, h: 22 },
    },
    {
      id: 'usb',
      name: 'USB Connector',
      confidence: 89,
      materials: ['Steel shell', 'Tin-lead solder', 'Plastic insert'],
      recoveryMethod: 'Desolder and sort with metal fraction',
      recoveryPotential: 'Medium',
      box: { x: 4, y: 44, w: 14, h: 14 },
    },
    {
      id: 'headers',
      name: 'Pin Headers',
      confidence: 93,
      materials: ['Brass pins', 'Plastic spacer', 'Tin plating'],
      recoveryMethod: 'Remove reusable connectors before shredding',
      recoveryPotential: 'High',
      box: { x: 10, y: 10, w: 80, h: 8 },
    },
    {
      id: 'caps',
      name: 'Capacitors',
      confidence: 87,
      materials: ['Aluminum can', 'Electrolyte', 'Rubber seal'],
      recoveryMethod: 'Separate and process through capacitor recycling',
      recoveryPotential: 'Low',
      box: { x: 58, y: 60, w: 14, h: 12 },
    },
    {
      id: 'resistors',
      name: 'Resistors',
      confidence: 85,
      materials: ['Ceramic body', 'Carbon/metal film', 'Tin terminations'],
      recoveryMethod: 'Process with PCB fraction',
      recoveryPotential: 'Low',
      box: { x: 20, y: 62, w: 22, h: 8 },
    },
    {
      id: 'leds',
      name: 'LEDs',
      confidence: 84,
      materials: ['Semiconductor die', 'Epoxy lens', 'Lead-frame'],
      recoveryMethod: 'Process with PCB fraction',
      recoveryPotential: 'Possible',
      box: { x: 46, y: 70, w: 8, h: 6 },
    },
    {
      id: 'crystal',
      name: 'Crystal Oscillator',
      confidence: 81,
      materials: ['Quartz crystal', 'Metal can', 'Solder'],
      recoveryMethod: 'Remove and sort with metal fraction',
      recoveryPotential: 'Medium',
      box: { x: 68, y: 38, w: 12, h: 10 },
    },
  ],
  materials: [
    { id: 'copper', name: 'Copper', potential: 'High', note: 'Traces, windings, pin plating' },
    { id: 'metal', name: 'Metal / Alloy', potential: 'Medium', note: 'Connectors, lead-frames, crystal cans' },
    { id: 'pcb-comp', name: 'PCB composite', potential: 'High', note: 'Fiberglass substrate' },
    { id: 'precious', name: 'Precious-metal-bearing parts', potential: 'Possible', note: 'IC pins, contacts' },
    { id: 'plastic', name: 'Plastic', potential: 'Low', note: 'Connectors, spacers, LED lenses' },
  ],
  recoveryWorkflow: [
    { step: 1, title: 'Inspect board', detail: 'Check for damage, reusable parts and hazardous components.' },
    { step: 2, title: 'Remove reusable connectors and components', detail: 'Desolder pin headers, USB port and the microcontroller where practical.' },
    { step: 3, title: 'Separate PCB', detail: 'Isolate the bare board from removed components.' },
    { step: 4, title: 'Sort ferrous and non-ferrous materials', detail: 'Separate steel, brass and copper fractions.' },
    { step: 5, title: 'Send PCB fraction for specialized material recovery', detail: 'Use a certified processor for copper, precious metals and fiberglass.' },
    { step: 6, title: 'Process remaining materials through appropriate recycling channels', detail: 'Plastics and low-value fractions to general e-waste stream.' },
  ],
  recoveryPotential: {
    score: 82,
    componentReuse: 76,
    materialRecovery: 88,
  },
};

// Lightweight detection stub. Replace with a real POST /api/detect call.
export async function detectDevice(_image: Blob): Promise<ScanResult> {
  await new Promise((r) => setTimeout(r, 1400));
  return arduinoScan;
}
