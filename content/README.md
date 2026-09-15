# PIH Malawi Content Package

This module defines the PIH Malawi-specific configuration for both the OpenMRS backend
([Initializer](https://github.com/mekomsolutions/openmrs-module-initializer)) and the O3/SPA
frontend. At build time, the contents of `configuration/` are assembled into a zip artifact
published as `org.pih.openmrs:pihmalawi-content`.

## Configuration Structure

Configuration files live under `configuration/`, split into two subdirectories:

| Directory | Purpose |
|---|---|
| `configuration/frontend_configuration/` | OpenMRS frontend (O3/SPA) configuration and branding (`config.json`, logo images) |
| `configuration/backend_configuration/` | Everything loaded by the OpenMRS Initializer module at startup |

`backend_configuration/` contains:

| Directory | Purpose |
|---|---|
| `addresshierarchy/` | Malawi address hierarchy entries and configuration |
| `attributetypes/` | Person/patient attribute type definitions |
| `conceptclasses/` | Concept class definitions |
| `concepts/` | Concept definitions |
| `conceptsets/` | Concept set membership and answers |
| `conceptsources/` | Concept source definitions |
| `drugs/` | Drug definitions |
| `encounterroles/` | Encounter role definitions |
| `encountertypes/` | Encounter type definitions |
| `fhirconceptsources/` | FHIR concept source mappings |
| `globalproperties/` | OpenMRS global property overrides |
| `htmlforms/` | HTML Form Entry form definitions used across PIH Malawi's clinical programs |
| `idgen/` | Identifier source/generator definitions |
| `liquibase/` | SQL helper functions installed via a Liquibase changelog |
| `locations/` | Facility and location definitions |
| `locationtagmaps/` | Maps locations to location tags |
| `locationtags/` | Location tag definitions |
| `metadatasets/` | Metadata set definitions |
| `metadatatermmappings/` | Metadata term mapping definitions |
| `patientidentifiertypes/` | Patient identifier type definitions |
| `personattributetypes/` | Person attribute type definitions |
| `privileges/` | Privilege definitions |
| `programs/` | Program definitions |
| `programworkflows/` | Program workflow definitions |
| `programworkflowstates/` | Program workflow state definitions |
| `providerroles/` | Provider role definitions |
| `relationshiptypes/` | Relationship type definitions |
| `reports/` | Report descriptors |
| `roles/` | Role definitions |
| `visittypes/` | Visit type definitions |
| `log4j2.xml` | Logging configuration deployed alongside the rest of the configuration |

### `htmlforms/` mastercard authoring conventions

The mastercard framework used across PIH Malawi's clinical program dashboards (see
`EMastercardAccessTag`/`ETraceAccessTag` in the `omod` module) expects two forms per program: one
representing the header, and one representing each visit. These forms need to be structured as
follows:

* The `encounterDate` element needs to have an id of `visitDate`:

  ```
  <encounterDate id="visitDate" size="20" default="today" />
  ```

* The `encounterLocation` element needs to have an id of `visitLocation`:

  ```
  <encounterLocation id="visitLocation" />
  ```

* The Next Appointment Date observation needs to have an id of `appointmentDate`. This will
  enforce that this date must be within 0-6 months of the visit date:

  ```
  <obs conceptId="$nextAppt" id="appointmentDate" allowFutureDates="true" />
  ```

* Putting the CSS class `focus-field` on an element that wraps a form field ensures that field
  has focus when the form is loaded, e.g.:

  ```
  <tr>
      <th>Height</th>
      <td class="focus-field"><obs conceptId="$height" id="heightInput" showUnits="true" /></td>
  </tr>
  ```

* The visit form must be structured in View Mode as a single table, with the following structure
  and CSS classes. The visit date cell must have the `visit-date` CSS class:

  ```
  <ifMode mode="VIEW" include="true">
      <table class="visit-table">
          <thead class="visit-table-header">
              ...
          </thead>
          <tbody class="visit-table-body">
              <tr class="visit-table-row">
                  <td class="nowrap visit-date">
                      <encounterDate />
                  </td>
                  ...
              </tr>
          </tbody>
      </table>
  </ifMode>
  ```

* The visit form should be structured in Edit Mode (not required, but takes advantage of built-in
  CSS) as a table with the CSS class `visit-edit-table`:

  ```
  <ifMode mode="VIEW" include="false">
      ...
      <table class="visit-edit-table">
          <tr>
              <th>Visit Date</th>
              <td><encounterDate id="visitDate" size="20" default="today" /></td>
          </tr>
          ...
      </table>
  </ifMode>
  ```

## content.properties

`content.properties` provides the content package name and version (interpolated from the Maven
project at build time), and defines key UUID constants referenced by the configuration above:

| Property | Description |
|---|---|
| `var.concept.*` | UUIDs of treatment-status concepts (chronic care, mental health, epilepsy, discharged, died, defaulted, transferred out, etc.) |
| `var.program.*` | UUIDs of PIH Malawi's clinical programs (HIV, TB, chronic care, mental health, palliative care, PDC, nutrition, teen club, EID, MDR-TB, Kaposi sarcoma, maternity, ANC, diabetes, OPD, IPD, and more) |
| `var.programWorkflow.*` | UUIDs of program workflows and their states, including nested treatment-status states for programs like epilepsy and mental health |
