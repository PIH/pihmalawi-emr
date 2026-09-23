import { execFileSync } from 'node:child_process';

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
  execFileSync('openmrs-docker', [instance, 'run-service', 'petl'], {
    stdio: 'inherit',
    timeout: 9 * 60 * 1000,
  });
}
