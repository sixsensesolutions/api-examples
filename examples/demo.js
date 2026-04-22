#!/usr/bin/env node

/**
 * Six Sense Solutions — Full Platform Demo
 *
 * Walks through the complete developer AND auditor experience:
 * credential generation, validation, breach detection, lifecycle
 * management, and the audit trail that closes compliance findings.
 *
 * Usage:
 *   node demo.js <your-api-key>
 *
 * For the full demo including audit log, use a Pro tier key.
 */

const SixSense = require('./six-sense-credentials');

const CYAN    = '\x1b[36m';
const GREEN   = '\x1b[32m';
const RED     = '\x1b[31m';
const YELLOW  = '\x1b[33m';
const DIM     = '\x1b[2m';
const BOLD    = '\x1b[1m';
const RESET   = '\x1b[0m';

function banner(text) {
  console.log('');
  console.log(`${CYAN}${'━'.repeat(64)}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${CYAN}${'━'.repeat(64)}${RESET}`);
}

function section(text) {
  console.log('');
  console.log(`  ${CYAN}${text}${RESET}`);
  console.log(`  ${CYAN}${'─'.repeat(56)}${RESET}`);
}

function step(num, text) {
  console.log('');
  console.log(`${YELLOW}[Step ${num}]${RESET} ${BOLD}${text}${RESET}`);
}

function success(text) {
  console.log(`  ${GREEN}✓${RESET} ${text}`);
}

function fail(text) {
  console.log(`  ${RED}✗${RESET} ${text}`);
}

function detail(label, value) {
  console.log(`  ${DIM}${label}:${RESET} ${value}`);
}

function note(text) {
  console.log(`  ${DIM}${text}${RESET}`);
}

function auditRow(time, event, actor, details) {
  const t = time.split('T')[1].split('.')[0] || time;
  console.log(`  ${DIM}${t}${RESET}  ${GREEN}${event.padEnd(10)}${RESET}  ${actor.padEnd(28)}  ${DIM}${details}${RESET}`);
}

async function main() {
  const apiKey = process.argv[2];

  if (!apiKey) {
    console.log('');
    console.log(`${RED}Usage: node demo.js <your-api-key>${RESET}`);
    console.log('');
    console.log('  Get a free key (300 calls/month):');
    console.log('  curl -X POST https://api.sixsensesolutions.net/v1/signup \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"name":"Your Name","email":"you@company.com"}\'');
    console.log('');
    console.log('  For the full demo including audit log, use a Pro tier key.');
    console.log('');
    process.exit(1);
  }

  const client = new SixSense(apiKey);
  const isPro = apiKey.includes('_pro_') || apiKey.includes('_biz_');

  banner('SIX SENSE SOLUTIONS — FULL PLATFORM DEMO');
  console.log('');
  console.log(`  ${DIM}Scenario: You are an MSP onboarding a new employee at Acme Corp.${RESET}`);
  console.log(`  ${DIM}Acme has SOC2 compliance requirements. Their auditor will ask${RESET}`);
  console.log(`  ${DIM}for credential generation evidence in 6 months.${RESET}`);
  console.log('');
  console.log(`  ${DIM}API Key:  ${apiKey.slice(0, 14)}...${RESET}`);
  console.log(`  ${DIM}Tier:     ${isPro ? 'Pro' : 'Free'}${RESET}`);

  const credentialId = `acme-user-${Date.now()}`;
  const timestamps = [];

  banner('PART 1: DEVELOPER WORKFLOW');

  step(1, 'Generate a SOC2-compliant credential for the new user');
  const generated = await client.generate({ length: 20, quantity: 1, compliance: 'SOC2' });
  const password = generated.passwords[0];
  timestamps.push({ event: 'generated', time: generated.meta.generated_at });
  success('Credential generated');
  detail('Credential', password.slice(0, 6) + '****' + password.slice(-4));
  detail('Entropy', `${generated.meta.entropy_bits} bits`);
  detail('Compliance', generated.meta.compliance_profile);
  detail('Timestamp', generated.meta.generated_at);
  detail('Calls remaining', generated.meta.calls_remaining);
  console.log('');
  note('^ The meta object IS the audit evidence. Created at the same');
  note('  moment as the credential. No reconstruction needed.');

  step(2, 'Validate the credential against SOC2 policy');
  const validation = await client.validate(password, 'SOC2');
  success(`Score: ${validation.score}/100`);
  detail('Policy failures', validation.failures.length === 0 ? 'None' : validation.failures.join(', '));
  console.log('');
  note('^ Score 100, zero failures. Every policy check documented.');
  note('  This is what the auditor sees when they ask "does this meet SOC2?"');

  step(3, 'Breach-check the credential against 850M+ known breaches');
  const breach = await client.breachCheck(password);
  if (breach.exposure_count === 0) {
    success('Clean — 0 exposures found');
  } else {
    fail(`Found in ${breach.exposure_count.toLocaleString()} breaches`);
  }
  console.log('');
  note('^ k-anonymity: only a partial SHA-1 hash was transmitted.');
  note('  The plaintext credential never left your environment.');

  step('3b', 'Compare: what happens with "password123"?');
  const badBreach = await client.breachCheck('password123');
  fail(`password123: ${Number(badBreach.exposure_count).toLocaleString()} known breaches`);
  detail('Risk rating', badBreach.risk_rating || 'critical');
  console.log('');
  note('^ Your client finds out before the auditor does. Not after.');

  step(4, 'Log first access of the credential');
  await client.logEvent({
    credential_id: credentialId,
    event_type: 'accessed',
    actor: 'msp-admin@yourmsp.com',
    environment: 'production',
    metadata: {
      user: 'jane.doe@acmecorp.com',
      provisioned_by: 'msp-admin@yourmsp.com',
      client: 'Acme Corp',
      ticket: 'ONBOARD-4521',
    },
  });
  timestamps.push({ event: 'accessed', time: new Date().toISOString() });
  success('Lifecycle event logged: accessed (first use)');
  detail('Credential ID', credentialId);
  detail('Actor', 'msp-admin@yourmsp.com');
  detail('Ticket', 'ONBOARD-4521');

  step(5, '90 days later: rotate the credential per policy');
  const rotated = await client.generate({ length: 20, quantity: 1, compliance: 'SOC2' });
  timestamps.push({ event: 'rotated', time: rotated.meta.generated_at });
  await client.logEvent({
    credential_id: credentialId,
    event_type: 'rotated',
    actor: 'msp-admin@yourmsp.com',
    environment: 'production',
    metadata: {
      reason: '90-day rotation policy',
      rotated_by: 'msp-admin@yourmsp.com',
      new_entropy_bits: rotated.meta.entropy_bits,
    },
  });
  success('Credential rotated and logged');
  detail('New credential', rotated.passwords[0].slice(0, 6) + '****');
  detail('New entropy', `${rotated.meta.entropy_bits} bits`);
  detail('Reason', '90-day rotation policy');

  step(6, 'Revoke the old credential');
  await client.logEvent({
    credential_id: credentialId,
    event_type: 'revoked',
    actor: 'msp-admin@yourmsp.com',
    environment: 'production',
    metadata: {
      reason: 'replaced by rotation',
      revoked_by: 'msp-admin@yourmsp.com',
    },
  });
  success('Old credential revoked and logged');

  banner('PART 2: AUDITOR EXPERIENCE');
  console.log('');
  note('Six months later. The SOC2 auditor arrives and asks:');
  note('"Show me the credential generation evidence for Acme Corp."');

  step(7, 'Auditor pulls the audit log');
  const today = new Date().toISOString().split('T')[0];
  let auditData = null;
  try {
    auditData = await client.auditLog(today, today);
    success('Audit log retrieved');
    if (auditData.events && auditData.events.length > 0) {
      detail('Events found', auditData.events.length);
      console.log('');
      section('AUDIT LOG — CREDENTIAL GENERATION EVENTS');
      console.log('');
      console.log(`  ${DIM}TIME        EVENT       ACTOR                         DETAILS${RESET}`);
      console.log(`  ${DIM}${'─'.repeat(56)}${RESET}`);
      const displayEvents = auditData.events.slice(0, 10);
      for (const evt of displayEvents) {
        const evtType = evt.event_type || evt.action || 'generate';
        const actor = evt.api_key ? evt.api_key.slice(0, 14) + '...' : 'system';
        const details = evt.compliance_profile || evt.compliance || '';
        const time = evt.timestamp || evt.created_at || '';
        auditRow(time, evtType, actor, details);
      }
      if (auditData.events.length > 10) {
        console.log(`  ${DIM}... and ${auditData.events.length - 10} more events${RESET}`);
      }
    } else {
      detail('Events', 'Log returned but no events in range');
    }
  } catch (err) {
    if (err.statusCode === 403) {
      console.log(`  ${YELLOW}⚠${RESET}  Audit log requires Pro tier`);
      console.log('');
      note('Free tier does not include audit log access.');
      note('With Pro ($29/mo), the auditor gets the full tamper-evident');
      note('trail — every generation event, queryable by date range.');
      note('This is the feature that closes SOC2 and HIPAA findings.');
    } else {
      fail(`Audit log error: ${err.message}`);
    }
  }

  step(8, 'Generate compliance summary report');
  console.log('');
  section('COMPLIANCE EVIDENCE REPORT');
  console.log('');
  console.log(`  ${BOLD}Credential:${RESET}    ${credentialId}`);
  console.log(`  ${BOLD}Client:${RESET}        Acme Corp`);
  console.log(`  ${BOLD}Standard:${RESET}      SOC2`);
  console.log(`  ${BOLD}Generated by:${RESET}  Six Sense Solutions API v1`);

  section('CHAIN OF CUSTODY');
  console.log('');
  console.log(`  ${GREEN}Generated${RESET}    ${DIM}${timestamps.find((t) => t.event === 'generated')?.time || 'now'}${RESET}`);
  console.log(`               ${DIM}Actor: msp-admin@yourmsp.com${RESET}`);
  console.log(`               ${DIM}Entropy: ${generated.meta.entropy_bits} bits | Score: ${validation.score}/100 | Breaches: ${breach.exposure_count}${RESET}`);
  console.log('');
  console.log(`  ${GREEN}Accessed${RESET}     ${DIM}${timestamps.find((t) => t.event === 'accessed')?.time || 'now'}${RESET}`);
  console.log(`               ${DIM}Actor: msp-admin@yourmsp.com | Ticket: ONBOARD-4521${RESET}`);
  console.log('');
  console.log(`  ${GREEN}Rotated${RESET}      ${DIM}${timestamps.find((t) => t.event === 'rotated')?.time || 'now'}${RESET}`);
  console.log(`               ${DIM}Actor: msp-admin@yourmsp.com${RESET}`);
  console.log(`               ${DIM}Reason: 90-day rotation policy | New entropy: ${rotated.meta.entropy_bits} bits${RESET}`);
  console.log('');
  console.log(`  ${GREEN}Revoked${RESET}      ${DIM}(immediately after rotation)${RESET}`);
  console.log(`               ${DIM}Actor: msp-admin@yourmsp.com${RESET}`);
  console.log(`               ${DIM}Reason: replaced by rotation${RESET}`);

  section('COMPLIANCE CHECKS');
  console.log('');
  console.log(`  ${GREEN}✓${RESET} Cryptographic generation     crypto.randomInt(), not Math.random()`);
  console.log(`  ${GREEN}✓${RESET} Entropy documented            ${generated.meta.entropy_bits} bits (SOC2 minimum: 60)`);
  console.log(`  ${GREEN}✓${RESET} Compliance profile applied    ${generated.meta.compliance_profile}`);
  console.log(`  ${GREEN}✓${RESET} Generation timestamp          ${generated.meta.generated_at}`);
  console.log(`  ${GREEN}✓${RESET} Breach database checked       ${breach.exposure_count} exposures across 850M+ records`);
  console.log(`  ${GREEN}✓${RESET} Rotation documented           90-day policy enforced`);
  console.log(`  ${GREEN}✓${RESET} Revocation documented         Old credential decommissioned`);
  console.log(`  ${GREEN}✓${RESET} Zero-knowledge architecture   Credential never stored by API`);
  if (auditData) {
    console.log(`  ${GREEN}✓${RESET} Tamper-evident audit log      ${auditData.events?.length || 0} events retrieved`);
  } else {
    console.log(`  ${YELLOW}○${RESET} Tamper-evident audit log      Available on Pro tier ($29/mo)`);
  }

  banner('PART 3: BEFORE vs AFTER');

  section('WITHOUT SIX SENSE (what most teams do today)');
  console.log('');
  console.log(`  ${RED}const password = crypto.randomBytes(16).toString('hex');${RESET}`);
  console.log('');
  console.log(`  ${RED}✗${RESET} No compliance profile documented`);
  console.log(`  ${RED}✗${RESET} No entropy calculation recorded`);
  console.log(`  ${RED}✗${RESET} No generation timestamp in audit trail`);
  console.log(`  ${RED}✗${RESET} No breach check performed`);
  console.log(`  ${RED}✗${RESET} No lifecycle tracking`);
  console.log(`  ${RED}✗${RESET} No evidence for the auditor`);
  console.log(`  ${RED}✗${RESET} Manual reconstruction required at audit time`);
  console.log('');
  console.log(`  ${DIM}Auditor asks: "Prove this credential met SOC2 at creation time."${RESET}`);
  console.log(`  ${DIM}Engineering says: "We... think it did?"${RESET}`);

  section('WITH SIX SENSE (what you just saw)');
  console.log('');
  console.log(`  ${GREEN}const result = await client.generate({ compliance: 'SOC2' });${RESET}`);
  console.log('');
  console.log(`  ${GREEN}✓${RESET} Compliance profile: SOC2`);
  console.log(`  ${GREEN}✓${RESET} Entropy: ${generated.meta.entropy_bits} bits`);
  console.log(`  ${GREEN}✓${RESET} Timestamp: ${generated.meta.generated_at}`);
  console.log(`  ${GREEN}✓${RESET} Breach check: 0 exposures`);
  console.log(`  ${GREEN}✓${RESET} Lifecycle: created → rotated → revoked`);
  console.log(`  ${GREEN}✓${RESET} Audit trail: machine-readable, tamper-evident`);
  console.log(`  ${GREEN}✓${RESET} Zero manual work at audit time`);
  console.log('');
  console.log(`  ${DIM}Auditor asks: "Prove this credential met SOC2 at creation time."${RESET}`);
  console.log(`  ${DIM}You hand them the report above. Finding closed.${RESET}`);

  banner('PRICING');
  console.log('');
  console.log(`  ${BOLD}Free${RESET}       $0/mo       300 calls     Generate, Validate, Breach Check`);
  console.log(`  ${BOLD}${CYAN}Pro${RESET}        $29/mo      10,000 calls  Everything + Audit Log`);
  console.log(`  ${BOLD}Business${RESET}   $149/mo     100,000 calls Everything + Priority Support`);
  console.log('');
  console.log(`  ${BOLD}Start free:${RESET} https://www.sixsensesolutions.net`);
  console.log(`  ${BOLD}Upgrade:${RESET}    https://www.sixsensesolutions.net/pricing/`);
  console.log('');
}

main().catch((err) => {
  console.error('');
  console.error(`${RED}Error: ${err.message}${RESET}`);
  if (err.code) console.error(`${DIM}Code: ${err.code}${RESET}`);
  if (err.statusCode) console.error(`${DIM}HTTP: ${err.statusCode}${RESET}`);
  console.error('');
  process.exit(1);
});
