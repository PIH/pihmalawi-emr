# PIH Malawi Distribution

This module pulls together all component artifacts into a single deployable distribution using the
[OpenMRS SDK Maven plugin](https://wiki.openmrs.org/display/docs/OpenMRS+SDK).

## How it works

Component versions are defined as Maven properties in the root `pom.xml`. During the Maven build
(`mvn clean install`), these properties are interpolated into `openmrs-distro.properties`, which is
packaged into the artifact jar and written to `target/classes/openmrs-distro.properties`. This
resolved file is what `openmrs-sdk` passes to the SDK's `build-distro`/`deploy` goals — see the
top-level README's [Using the OpenMRS SDK](../README.md#using-the-openmrs-sdk) section.

Unlike the `content` module, `distro` has no `-DbuildDistro=true`-style flag to opt into — the
`build-distro` execution always runs, on a plain `mvn clean install`. Only the final zip assembly
(bundling `openmrs_core`/`openmrs_config`/`openmrs_modules`/`openmrs_owas`/`openmrs_spa` into one
artifact) is gated behind the `distro-zip` Maven profile:

```bash
mvn clean install -Pdistro-zip
```

## Updating component versions

To update a component version, change the corresponding property in the root `pom.xml` and rebuild:

```bash
mvn clean install
```

Then use `mvn openmrs-sdk:deploy` (see the top-level README) to redeploy a local server with the
new versions.

## Release

Releases are published via the [Release new version](../.github/workflows/release-to-openmrs-jfrog.yml)
GitHub Actions workflow (manually triggered), which publishes Maven artifacts to
[OpenMRS's JFrog repository](https://openmrs.jfrog.io/artifactory/modules-pih).
