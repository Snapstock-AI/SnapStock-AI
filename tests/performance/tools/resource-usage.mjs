// Memory / resource sampling. SRS NFR-PERF-004: API idle memory < 512 MB RSS.
//   node tools/resource-usage.mjs --with-stack            start the local stack, sample idle, load, then idle again
//   node tools/resource-usage.mjs --pid=1234 [--ai-pid=5678] [--idle=15]   sample already-running processes
//
// Verdicts: the API idle RSS gets PASS/FAIL against the SRS limit. Everything else is INFORMATIONAL:
//  - the SRS defines no AI memory limit, so AI RSS after model load is only observed and reported (no PASS/FAIL);
//  - "growth after load" is a leak indicator, not an SRS requirement.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { startStack } from './stack.mjs';
import { seed } from './seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.resolve(here, '../reports');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const API_IDLE_LIMIT_MB = Number(process.env.API_IDLE_LIMIT_MB || 512);
const idleSeconds = Number(args.idle || 15);

export function rssMb(pid) {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).WorkingSet64`], { encoding: 'utf8' });
      return Number(out.trim()) / 1024 / 1024;
    }
    if (process.platform === 'linux') {
      const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
      return Number(status.match(/VmRSS:\s+(\d+)/)[1]) / 1024;
    }
    return Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim()) / 1024;
  } catch {
    return null;
  }
}

async function sample(pid, seconds) {
  const values = [];
  for (let i = 0; i < seconds; i++) {
    const v = rssMb(pid);
    if (v !== null) values.push(v);
    await sleep(1000);
  }
  return values;
}

const round = (n) => Number(n.toFixed(1));
const stats = (v) => (v.length ? { samples: v.length, minMb: round(Math.min(...v)), meanMb: round(v.reduce((a, b) => a + b, 0) / v.length), maxMb: round(Math.max(...v)) } : null);

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  let stack = null;
  let apiPid = args.pid ? Number(args.pid) : null;
  const report = {
    environment: { date: new Date().toISOString(), platform: `${process.platform} ${process.arch}`, cpus: os.cpus().length, totalMemGB: round(os.totalmem() / 1024 ** 3), node: process.version },
    api: { requirement: `NFR-PERF-004 API idle RSS < ${API_IDLE_LIMIT_MB} MB`, status: 'NOT RUN', reason: '' },
    ai: { requirement: 'No SRS limit: observed RSS after model load is documented only', status: 'NOT RUN', reason: 'Pass --ai-pid=<pid of the running AI service with models loaded>' },
  };

  try {
    if (args['with-stack']) {
      stack = await startStack({ log: console.log });
      await seed(stack.dbUrl);
      apiPid = stack.apiPid;
    }
    if (!apiPid) {
      report.api.reason = 'No API process to sample. Use --with-stack or --pid=<api pid>.';
    } else {
      console.log(`Sampling idle API RSS for ${idleSeconds}s (pid ${apiPid})...`);
      await sleep(5000); // let start-up allocations settle
      const idle = await sample(apiPid, idleSeconds);
      report.api.idle = stats(idle);

      let loaded = null;
      let after = null;
      if (args['with-stack']) {
        console.log('Applying load (concurrent reads + concurrent scans) while sampling...');
        const load = spawn(process.execPath, [path.join(here, 'run.mjs'), '--only=concurrent-reads,concurrent-scan'], { stdio: 'ignore' });
        const samples = [];
        let done = false;
        load.on('exit', () => (done = true));
        while (!done) {
          const v = rssMb(apiPid);
          if (v !== null) samples.push(v);
          await sleep(1000);
        }
        loaded = samples;
        console.log(`Sampling post-load RSS for ${idleSeconds}s...`);
        after = await sample(apiPid, idleSeconds);
        report.api.underLoad = stats(loaded);
        report.api.afterLoad = stats(after);
        if (report.api.idle && report.api.afterLoad) {
          report.api.growthAfterLoadMb = round(report.api.afterLoad.meanMb - report.api.idle.meanMb);
          report.api.growthNote = 'Informational leak indicator (not an SRS requirement). Node keeps freed heap for reuse, so a plateau after load is normal; steady growth across repeated runs is not.';
        }
      }

      if (!report.api.idle) {
        report.api.reason = 'Could not read the process memory (process exited or platform tool unavailable).';
      } else {
        const worst = report.api.idle.maxMb;
        report.api.status = worst < API_IDLE_LIMIT_MB ? 'PASS' : 'FAIL';
        report.api.reason = `peak idle RSS ${worst} MB vs limit ${API_IDLE_LIMIT_MB} MB`;
      }
    }

    if (args['ai-pid']) {
      const values = await sample(Number(args['ai-pid']), Math.min(idleSeconds, 10));
      if (values.length) {
        report.ai = { requirement: report.ai.requirement, status: 'OBSERVED', reason: 'Documented, no pass/fail (the SRS defines no AI memory limit)', afterModelLoad: stats(values) };
      }
    }
  } finally {
    await stack?.stop();
  }

  fs.writeFileSync(path.join(reportDir, 'resources.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(args.strict && report.api.status === 'FAIL' ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
