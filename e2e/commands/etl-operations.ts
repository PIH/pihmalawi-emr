import { execFileSync } from 'node:child_process';

// Measured live: the ETL alone takes ~8m50s-9m1s on this dev box (rebuilding apzu-etl's full
// ~185-table warehouse schema, cost independent of source data volume). That's the only real data
// available -- this hasn't been timed on the actual GitHub Actions runner CI uses, which could run
// slower. ~1.33x the observed value (12 minutes) is a deliberate buffer for that unmeasured
// variance, not a round number -- enough margin to not flake on a merely-slower run, while still
// catching a genuinely wedged one well before it would exhaust the rest of the CI job's budget.
// Must stay comfortably under the caller's own test.setTimeout() (15 minutes in
// art-report.spec.ts) so a slow-but-real ETL failure surfaces as this function's own clear error,
// not a generic Playwright test-timeout with no explanation.
const ETL_TIMEOUT_MS = 12 * 60 * 1000;

// The HIV Cohort Report (and other warehouse-backed reports) reads from a separate warehouse
// database that only reflects whatever openmrs-db looked like as of the last ETL run. Tests that
// need this run's own freshly-created data to show up in a report must call this after saving
// that data and before requesting the report. `run-service petl` is a one-shot job, not a
// long-running service, so it's safe to call more than once per suite run.
export function runWarehouseEtl(): void {
  const instance = process.env.E2E_DOCKER_INSTANCE;
  if (!instance) {
    throw new Error(
      'E2E_DOCKER_INSTANCE must be set to run the warehouse ETL (openmrs-docker <instance> run-service petl)',
    );
  }
  try {
    execFileSync('openmrs-docker', [instance, 'run-service', 'petl'], {
      stdio: 'inherit',
      timeout: ETL_TIMEOUT_MS,
      // execFileSync's own SIGTERM only reaches the direct `openmrs-docker` shell child, not the
      // `docker compose run --rm petl` grandchild it execs -- so a timeout here would otherwise
      // leave that container running the ETL to completion in the background. removeOrphanedPetlContainer()
      // below cleans that up explicitly.
      killSignal: 'SIGKILL',
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { status?: number | null; signal?: string | null };
    removeOrphanedPetlContainer(instance);
    if (err.code === 'ENOENT') {
      throw new Error(
        "'openmrs-docker' was not found on PATH -- add openmrs-contrib-distro-tools' bin/ directory to PATH " +
          '(see that repo\'s README) before running this spec.',
        { cause: err },
      );
    }
    if (err.signal || err.code === 'ETIMEDOUT') {
      throw new Error(
        `Warehouse ETL run-service petl did not finish within ${ETL_TIMEOUT_MS / 60000} minutes ` +
          `(instance "${instance}") -- see the openmrs-docker output above for where it was stuck.`,
        { cause: err },
      );
    }
    throw new Error(
      `openmrs-docker ${instance} run-service petl exited with status ${err.status} -- see the output above.`,
      { cause: err },
    );
  }
}

// Best-effort: a timed-out or killed run-service invocation can leave the underlying
// `docker compose run --rm petl` container (named `<instance>-petl-run-<random>`) still running
// the ETL in the background. Failures here are swallowed since this only runs after an ETL
// failure that's already being reported -- a cleanup problem shouldn't mask the real error.
function removeOrphanedPetlContainer(instance: string): void {
  try {
    const names = execFileSync('docker', ['ps', '-q', '--filter', `name=${instance}-petl-run-`], {
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(Boolean);
    if (names.length > 0) {
      execFileSync('docker', ['rm', '-f', ...names]);
    }
  } catch {
    // Best-effort cleanup only -- ignore failures here so the real ETL error above still surfaces.
  }
}
