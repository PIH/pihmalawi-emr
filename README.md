# PIH Malawi EMR

This repository defines the OpenMRS module and distribution for PIH Malawi. It builds the PIH
Malawi OpenMRS module (`api`/`omod`), packages PIH Malawi-specific content, and combines these
with the shared PIH EMR frontend into a single deployable distribution artifact.
For more background on OpenMRS distributions, see the [OpenMRS wiki](https://wiki.openmrs.org/display/docs/OpenMRS+Distributions).

## Repository Structure

| Directory | Description |
|---|---|
| [`api/`](api) | Java API for the PIH Malawi OpenMRS module — services, data, and business logic |
| [`omod/`](omod) | OpenMRS module (OMOD) — web layer, UI, and packaging for the PIH Malawi module; depends on `api/` |
| [`content/`](content/README.md) | PIH Malawi-specific OpenMRS content package (Initializer and O3 configuration files) |
| [`distro/`](distro/README.md) | Distribution definition — resolves all component versions into `openmrs-distro.properties` |

## The PIH Malawi Module

Unlike the pure content/distro repositories in the PIH EMR family, this repository also builds and
publishes the PIH Malawi OpenMRS module itself. `api/` and `omod/` are ordinary OpenMRS module
Maven modules: `omod` depends on and bundles `api`, and together they publish as
`org.openmrs.module:pihmalawi-api` and `org.openmrs.module:pihmalawi-omod`. The distro pulls this
module in as one of its regular OMOD dependencies, the same way it pulls in every other required
OpenMRS module — see `omod.pihmalawi` in `distro/openmrs-distro.properties`.

## Components

| Component | Artifact |
|---|---|
| PIH Malawi module | `org.openmrs.module:pihmalawi-omod` (bundles `org.openmrs.module:pihmalawi-api`) |
| PIH Malawi content | `org.pih.openmrs:pihmalawi-content` |
| PIH EMR frontend | `org.pih.openmrs:openmrs-frontend-pihemr` |

Component versions are defined in `distro/pom.xml` and resolved into `distro/openmrs-distro.properties` at build time.

## Using the OpenMRS SDK

Developers can use the OpenMRS SDK to set up, update, and run local OpenMRS instances.
All normal [OpenMRS SDK](https://wiki.openmrs.org/display/docs/OpenMRS+SDK) commands are supported.

One can also use the `openmrs-sdk` command supplied by the [`openmrs-contrib-distro-tools`](https://github.com/PIH/openmrs-contrib-distro-tools) CLI if that is more convenient.
Follow the installation instructions in that repo first if you wish to use this command.
Consult the [`openmrs-contrib-distro-tools` README](https://github.com/PIH/openmrs-contrib-distro-tools/README.md)
for more information on each supported command and configuration option.

#### Setting up a new SDK server

> [!NOTE]
> Unlike the other PIH `-emr` distributions, this repo has no multi-profile `PIH_CONFIG` setup —
> there is only one configuration, so `distro/openmrs-distro.properties` declares no
> `property.pih.config.*` prompt at all. `PIH_CONFIG` is optional in the `openmrs-sdk` CLI —
> just leave it unset here.

```bash
openmrs-sdk create <server-id>
```

Many developers maintain their own MySQL Docker container into which they maintain their various SDK servers.  For example,
one might have an existing MySQL Docker container named `mysql56` exposing port 3308, and with a root password of `password`.
To use this container instead, simply add the appropriate additional environment variables as documented in the README:

```bash
DB_CONTAINER=mysql56 \
DB_PORT=3308 \
DB_PASSWORD=password \
openmrs-sdk create <server-id>
```

#### Running an SDK server

This is just a thin wrapper around the native OpenMRS SDK maven command:

```bash
openmrs-sdk run <server-id>
```

#### Updating a server with the latest distribution (war, modules, config, frontend)

```bash
openmrs-sdk update <server-id>
```

#### Updating only the configuration of a server

Unlike a full update, this only updates the configuration files and is intended to be faster,
suitable for more rapid iteration of content changes for testing. This still resolves the full
distro rather than just configuration, since `distro/pom.xml`'s `build-distro` execution always
runs on a plain `mvn clean install` — there is currently no lighter config-only build step.

```bash
openmrs-sdk update-config <server-id>
```

### Using Docker

For the CI configuration profile, an example environment file is provided in the repo root to get started quickly.
Because this file is found in the distribution repository, it is assumed that this is checked out on your machine, and
that `openmrs-docker` commands are running from the root of the distribution repository — it sets `DISTRO_SOURCE_DIR`
to this location. If you're using it as an example for running elsewhere, you may need to change or remove that.

To use the example environment file for `neno-ci` to get up and running with a new instance:

```bash
source neno-ci.env
openmrs-docker create neno-ci
openmrs-docker neno-ci initialize # Optional, but speeds up initial startup
openmrs-docker neno-ci start
openmrs-docker neno-ci wait  # Tails logs until OpenMRS is ready, then exits
```

Once created, day-to-day commands only need the instance name:

```bash
openmrs-docker neno-ci stop
openmrs-docker neno-ci logs
openmrs-docker neno-ci destroy
```

> [!NOTE]
> This repo has no `OPENMRS_PIH_CONFIG` value to set — `PIH_CONFIG`/`OPENMRS_PIH_CONFIG` are
> optional in both `openmrs-sdk` and `openmrs-docker`, so `neno-ci.env` simply doesn't set one.

## CI and Publishing

CI is handled by GitHub Actions. On every push to `master`, the
[Build and deploy](.github/workflows/build-and-deploy-to-openmrs-jfrog.yml) workflow:

1. Builds and publishes Maven artifacts to [OpenMRS's JFrog repository](https://openmrs.jfrog.io/artifactory/modules-pih)
   — `org.openmrs.module:pihmalawi-api`, `org.openmrs.module:pihmalawi-omod`,
   `org.pih.openmrs:pihmalawi-content`, and `org.pih.openmrs:pihmalawi-distro`.
2. Builds and pushes a Docker image to Docker Hub at
   [`partnersinhealth/pihmalawi-emr`](https://hub.docker.com/r/partnersinhealth/pihmalawi-emr),
   tagged with both `latest` and the Maven project version.
3. Applies the newly-published distribution to the `neno-ci` CI server via a self-hosted GitHub
   Actions runner (see the `mirebalais-puppet` repo for the actual Puppet-driven deploy mechanics).

A separate [Build seeded images](.github/workflows/build-seeded-images.yml) workflow runs nightly
and publishes a pre-initialized seed image to Docker Hub as
`partnersinhealth/pihmalawi-emr-seed-malawi` (this distro has no per-site config, so one seed
covers every instance), so `openmrs-docker initialize` can skip the normal first-boot setup.

A separate [Release new version](.github/workflows/release-to-openmrs-jfrog.yml) workflow can be
triggered manually (`workflow_dispatch`) to cut a numbered release.
