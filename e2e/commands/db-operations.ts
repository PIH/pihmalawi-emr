import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

// Liquibase migrations in api/src/main/resources/pihmalawiMigrations/ run once, at module startup,
// and are then recorded in liquibasechangelog -- by the time a spec runs against the instance, any
// migration in the image has already run (against whatever data existed then). To exercise a
// migration's data logic against data a spec seeds itself, the spec re-runs the migration's SQL
// directly with runMigrationSqlFile(). Only use this for migrations that are safe to re-run.
const MIGRATIONS_DIR = path.resolve(__dirname, '../../api/src/main/resources/pihmalawiMigrations');

const MYSQL_TIMEOUT_MS = 2 * 60 * 1000;

// openmrs-docker (pihx) names the Compose project after the instance, so the db container is
// found by Compose's own labels rather than by guessing Compose's container naming scheme.
function findOpenmrsDbContainer(instance: string): string {
  const ids = execFileSync(
    'docker',
    [
      'ps',
      '-q',
      '--filter',
      `label=com.docker.compose.project=${instance}`,
      '--filter',
      'label=com.docker.compose.service=openmrs-db',
    ],
    { encoding: 'utf-8' },
  )
    .split('\n')
    .filter(Boolean);
  if (ids.length !== 1) {
    throw new Error(
      `Expected exactly 1 running openmrs-db container for instance "${instance}", found ${ids.length}`,
    );
  }
  return ids[0];
}

// Runs `sql` with the mysql client inside the openmrs-db container, as root, against the OpenMRS
// database, and returns stdout (tab-separated, no column headers). The root password is read
// from the container's own environment inside `sh -c`, so it never appears on a command line.
export function runSql(sql: string): string {
  const instance = process.env.E2E_DOCKER_INSTANCE;
  if (!instance) {
    throw new Error('E2E_DOCKER_INSTANCE must be set to run SQL against the instance database');
  }
  const database = process.env.E2E_OPENMRS_DB_NAME ?? 'openmrs';
  const container = findOpenmrsDbContainer(instance);
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'sh',
      '-c',
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --batch --skip-column-names "$0"',
      database,
    ],
    { input: sql, encoding: 'utf-8', timeout: MYSQL_TIMEOUT_MS },
  );
}

export function runMigrationSqlFile(fileName: string): void {
  runSql(readFileSync(path.join(MIGRATIONS_DIR, fileName), 'utf-8'));
}
