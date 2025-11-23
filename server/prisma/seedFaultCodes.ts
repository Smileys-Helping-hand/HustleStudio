import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const codes = [
    {
      code: 'P0300',
      description: 'Random/Multiple Cylinder Misfire Detected',
      subsystem: 'Ignition / Combustion',
      causes: [
        'Worn or fouled spark plugs',
        'Defective ignition coils',
        'Vacuum leak',
        'Fuel delivery issue',
        'Low compression',
      ].join('\n'),
      checks: [
        'Check for other specific misfire codes (P0301–P030X)',
        'Inspect spark plugs for wear or fouling',
        'Swap coils between cylinders to see if misfire follows',
        'Check for vacuum leaks and unmetered air',
        'Verify fuel pressure and injector operation',
      ].join('\n'),
      repairs: [
        'Replace worn plugs',
        'Replace failing coil(s)',
        'Repair vacuum leaks',
        'Address fuel delivery issues',
        'Perform compression test and repair mechanical faults',
      ].join('\n'),
      diagramUrl: 'diagrams/p0300.png',
    },
    {
      code: 'P0301',
      description: 'Cylinder 1 Misfire Detected',
      subsystem: 'Ignition / Combustion',
      causes: [
        'Faulty spark plug (cyl 1)',
        'Failing ignition coil (cyl 1)',
        'Injector issue (cyl 1)',
        'Compression issue (cyl 1)',
        'Vacuum leak near cylinder 1 runner',
      ].join('\n'),
      checks: [
        'Inspect plug on cyl 1; check gap and deposits',
        'Swap coil with another cylinder and see if code moves',
        'Use test light / stethoscope on injector',
        'Perform compression test on cyl 1',
        'Smoke test intake for localized leaks',
      ].join('\n'),
      repairs: [
        'Replace plug and/or coil if faulty',
        'Clean or replace injector',
        'Repair wiring/connectors',
        'Address compression/mechanical issues',
        'Fix intake/vacuum leaks near cyl 1',
      ].join('\n'),
      diagramUrl: 'diagrams/p0301.png',
    },
    {
      code: 'P0420',
      description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
      subsystem: 'Emissions / Exhaust',
      causes: [
        'Aged or failing catalytic converter',
        'Faulty upstream or downstream O2 sensor',
        'Exhaust leak before O2 sensor',
        'Rich/lean running damaging the cat',
      ].join('\n'),
      checks: [
        'Inspect for exhaust leaks before cat',
        'Graph upstream vs downstream O2 sensors',
        'Check fuel trims for rich/lean conditions',
        'Verify no misfire or fueling codes present',
      ].join('\n'),
      repairs: [
        'Fix exhaust leaks',
        'Address fueling issues',
        'Replace failing O2 sensor if confirmed',
        'Replace catalytic converter if efficiency is genuinely low',
      ].join('\n'),
      diagramUrl: 'diagrams/p0420.png',
    },
    {
      code: 'P0171',
      description: 'System Too Lean (Bank 1)',
      subsystem: 'Fuel / Air / Intake',
      causes: [
        'Vacuum leak',
        'Mass Air Flow (MAF) sensor contamination',
        'Weak fuel pump or clogged filter',
        'Exhaust leak before O2 sensor',
        'PCV system leak',
      ].join('\n'),
      checks: [
        'Check fuel trims (high positive STFT/LTFT)',
        'Smoke test for intake/vacuum leaks',
        'Inspect/clean MAF sensor',
        'Test fuel pressure under load',
        'Inspect PCV hoses and valves',
      ].join('\n'),
      repairs: [
        'Repair vacuum/PCV leaks',
        'Clean or replace MAF',
        'Restore proper fuel pressure',
        'Repair exhaust leaks ahead of O2 sensor',
      ].join('\n'),
      diagramUrl: 'diagrams/p0171.png',
    },
    {
      code: 'P0172',
      description: 'System Too Rich (Bank 1)',
      subsystem: 'Fuel / Air / Intake',
      causes: [
        'Leaking injector',
        'High fuel pressure',
        'Stuck-open purge valve',
        'Faulty coolant temp sensor',
        'Contaminated MAF reporting low air',
      ].join('\n'),
      checks: [
        'Check trims (large negative)',
        'Inspect injectors for leakage',
        'Test fuel pressure',
        'Check purge valve operation',
        'Verify ECT reading vs actual temp',
      ].join('\n'),
      repairs: [
        'Fix leaking injector(s)',
        'Correct fuel pressure regulator issues',
        'Replace faulty purge valve',
        'Replace incorrect ECT if needed',
      ].join('\n'),
      diagramUrl: 'diagrams/p0172.png',
    },
    {
      code: 'P0113',
      description: 'Intake Air Temperature Sensor 1 Circuit High',
      subsystem: 'Intake / Sensors',
      causes: [
        'Unplugged IAT sensor',
        'Open circuit in harness',
        'Faulty IAT sensor',
      ].join('\n'),
      checks: [
        'Inspect connector and pins',
        'Check wiring continuity',
        'Compare IAT reading to ambient',
      ].join('\n'),
      repairs: [
        'Reconnect or repair wiring',
        'Replace IAT sensor if reading implausible',
      ].join('\n'),
      diagramUrl: 'diagrams/p0113.png',
    },
    {
      code: 'P0101',
      description: 'Mass or Volume Air Flow Circuit Range/Performance',
      subsystem: 'Intake / MAF',
      causes: [
        'Dirty MAF sensor',
        'Air leaks after MAF',
        'Incorrect airbox/aftermarket intake turbulence',
      ].join('\n'),
      checks: [
        'Inspect and clean MAF',
        'Check for post-MAF leaks',
        'Review live data vs expected g/s at RPM',
      ].join('\n'),
      repairs: [
        'Clean/replace MAF',
        'Fix leaks',
        'Correct intake plumbing',
      ].join('\n'),
      diagramUrl: 'diagrams/p0101.png',
    },
    {
      code: 'P0440',
      description: 'Evaporative Emission Control System Malfunction',
      subsystem: 'EVAP',
      causes: [
        'Loose fuel cap',
        'Cracked EVAP hoses',
        'Faulty purge or vent valve',
      ].join('\n'),
      checks: [
        'Verify fuel cap seal',
        'Smoke test EVAP system',
        'Command purge/vent valves with scan tool',
      ].join('\n'),
      repairs: [
        'Replace cap if leaking',
        'Repair hoses',
        'Replace faulty valves',
      ].join('\n'),
      diagramUrl: 'diagrams/p0440.png',
    },
    {
      code: 'P0442',
      description: 'EVAP System Small Leak Detected',
      subsystem: 'EVAP',
      causes: [
        'Small hose cracks',
        'Weak fuel cap seal',
        'Loose clamps',
      ].join('\n'),
      checks: [
        'Smoke test for fine leaks',
        'Inspect cap and neck',
        'Check lines near canister',
      ].join('\n'),
      repairs: [
        'Replace cap/hoses as needed',
        'Secure clamps/fittings',
      ].join('\n'),
      diagramUrl: 'diagrams/p0442.png',
    },
    {
      code: 'P0455',
      description: 'EVAP System Large Leak Detected',
      subsystem: 'EVAP',
      causes: [
        'Cap missing/very loose',
        'Major line disconnected',
        'Cracked canister',
      ].join('\n'),
      checks: [
        'Check cap first',
        'Visual underbody line check',
        'Smoke test if needed',
      ].join('\n'),
      repairs: [
        'Fit/replace cap',
        'Reconnect/replace damaged lines',
        'Replace canister if cracked',
      ].join('\n'),
      diagramUrl: 'diagrams/p0455.png',
    },
  ];

  for (const code of codes) {
    await prisma.faultCode.upsert({
      where: { code: code.code },
      update: code,
      create: code,
    });
  }

  console.log('✅ Seeded FaultCode table with common OBD-II codes.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
