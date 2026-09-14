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

#### Setting up a new SDK server

```bash
mvn openmrs-sdk:setup -DserverId=<server-id> -Ddistro=org.pih.openmrs:pihmalawi-distro:<version> \
  -DdbUri=jdbc:mysql://localhost:3306/<database-name> -DdbUser=openmrs -DdbPassword=openmrs
```

See `pom.xml` for the current project version. Omit `-DdbUri`/`-DdbUser`/`-DdbPassword` to be
prompted interactively instead.

#### Running an SDK server

```bash
mvn openmrs-sdk:run -DserverId=<server-id>
```

#### Updating a server with the latest distribution (war, modules, config, frontend)

```bash
mvn clean install -DskipTests
mvn openmrs-sdk:deploy -Ddistro=distro/target/classes/openmrs-distro.properties -DserverId=<server-id>
```

#### Updating only the configuration of a server

Unlike a full update, this only updates the configuration files and is intended to be faster,
suitable for more rapid iteration of content changes for testing. This still resolves the full
distro rather than just configuration, since `distro/pom.xml`'s `build-distro` execution always
runs on a plain `mvn clean install` — there is currently no lighter config-only build step.

```bash
mvn clean install -DskipTests
mvn openmrs-sdk:deploy -Ddistro=distro/target/classes/openmrs-distro.properties -DserverId=<server-id> -DconfigOnly=true
```

## CI and Publishing

CI is handled by GitHub Actions. On every push to `master`, the
[Build and deploy](.github/workflows/build-and-deploy-to-openmrs-jfrog.yml) workflow:

1. Builds and publishes Maven artifacts to [OpenMRS's JFrog repository](https://openmrs.jfrog.io/artifactory/modules-pih)
   — `org.openmrs.module:pihmalawi-api`, `org.openmrs.module:pihmalawi-omod`,
   `org.pih.openmrs:pihmalawi-content`, and `org.pih.openmrs:pihmalawi-distro`.
2. Applies the newly-published distribution to the `neno-ci` CI server via a self-hosted GitHub
   Actions runner (see the `mirebalais-puppet` repo for the actual Puppet-driven deploy mechanics).

A separate [Release new version](.github/workflows/release-to-openmrs-jfrog.yml) workflow can be
triggered manually (`workflow_dispatch`) to cut a numbered release.

---

Docker-based local development (`openmrs-docker`, environment files, seeded images) is not yet set
up for this repository — that will be addressed as a separate piece of work.
