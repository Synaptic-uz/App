/**
 * In-process async job queue. API starts immediately; heavy work runs in background.
 */

const pending = [];
let active = null;
let draining = false;

const history = [];
const MAX_HISTORY = 50;

function record(entry) {
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
}

/**
 * @param {string} name
 * @param {() => Promise<void>} handler
 * @param {{ priority?: 'high' | 'normal' }} [options]
 */
export function enqueueJob(name, handler, options = {}) {
  const job = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    handler,
    priority: options.priority === 'high' ? 0 : 1,
    enqueuedAt: Date.now(),
  };

  if (job.priority === 0) {
    const firstNormal = pending.findIndex((j) => j.priority === 1);
    if (firstNormal === -1) pending.push(job);
    else pending.splice(firstNormal, 0, job);
  } else {
    pending.push(job);
  }

  console.log(`[queue] + ${name} (pending: ${pending.length})`);
  void drain();
  return job.id;
}

async function drain() {
  if (draining) return;
  draining = true;

  while (pending.length > 0) {
    const job = pending.shift();
    active = job;
    const started = Date.now();
    console.log(`[queue] ▶ ${job.name}`);

    try {
      await job.handler();
      const ms = Date.now() - started;
      console.log(`[queue] ✓ ${job.name} (${ms}ms)`);
      record({ id: job.id, name: job.name, status: 'done', ms, at: Date.now() });
    } catch (error) {
      const ms = Date.now() - started;
      console.error(`[queue] ✗ ${job.name} (${ms}ms):`, error.message || error);
      record({
        id: job.id,
        name: job.name,
        status: 'failed',
        ms,
        error: error.message || String(error),
        at: Date.now(),
      });
    } finally {
      active = null;
    }
  }

  draining = false;
}

export function getJobQueueStatus() {
  return {
    running: !!active,
    active: active ? { id: active.id, name: active.name } : null,
    pending: pending.map((j) => ({ id: j.id, name: j.name })),
    recent: history.slice(0, 10),
  };
}

export function waitForQueueIdle() {
  return new Promise((resolve) => {
    const tick = () => {
      if (!draining && pending.length === 0 && !active) resolve();
      else setTimeout(tick, 50);
    };
    tick();
  });
}
