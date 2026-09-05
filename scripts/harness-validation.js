'use strict';

const fs = require('node:fs');
const path = require('node:path');

const statePath = path.join(__dirname, '..', 'harness', 'academy-mvp-state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

const allowedStatuses = new Set([
  'pass',
  'advisory',
  'clarification',
  'approval-required',
  'blocked',
  'pending'
]);

const requiredPreMigrationGates = [
  'deterministicRegression',
  'staticValidation',
  'realModelSimulationMatrix',
  'physicalMobileTiming',
  'assessmentContentValidity',
  'productOwnerBehaviouralReview',
  'falsePassSafety',
  'progressRelockRegression'
];

const requiredReleaseGates = [
  ...requiredPreMigrationGates,
  'externalLendingProfessionalReview',
  'finalProductOwnerApproval'
];

function fail(message) {
  console.error(`HARNESS BLOCK: ${message}`);
  process.exitCode = 1;
}

if (state.schemaVersion !== 1) fail('unsupported or missing schemaVersion');
if (!state.project || !state.target || !state.currentStage) fail('project, target and currentStage are required');
if (!state.gates || typeof state.gates !== 'object') fail('gates object is required');

for (const [name, gate] of Object.entries(state.gates || {})) {
  if (!allowedStatuses.has(gate.status)) fail(`${name} has unknown status ${gate.status}`);
  if (!gate.evidence || !String(gate.evidence).trim()) fail(`${name} is missing evidence text`);
}

for (const name of requiredReleaseGates) {
  if (!state.gates?.[name]) fail(`required gate ${name} is missing`);
}

const preMigrationOpen = requiredPreMigrationGates.filter(name => state.gates[name].status !== 'pass');
const releaseOpen = requiredReleaseGates.filter(name => state.gates[name].status !== 'pass');

if (state.scope?.widerMigrationAllowed && preMigrationOpen.length) {
  fail(`widerMigrationAllowed cannot be true while pre-migration gates are open: ${preMigrationOpen.join(', ')}`);
}

if (state.releaseReady && releaseOpen.length) {
  fail(`releaseReady cannot be true while release gates are open: ${releaseOpen.join(', ')}`);
}

if (!process.exitCode) {
  console.log('Harness state is structurally valid.');
  console.log(`Current stage: ${state.currentStage}`);
  console.log(`Wider migration: ${state.scope?.widerMigrationAllowed ? 'allowed' : 'held'}`);
  console.log(`Open pre-migration gates: ${preMigrationOpen.length ? preMigrationOpen.join(', ') : 'none'}`);
  console.log(`Open release gates: ${releaseOpen.length ? releaseOpen.join(', ') : 'none'}`);
}
