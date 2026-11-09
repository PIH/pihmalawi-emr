import { ncdEncounterWorkspace } from '../shared/ncd-encounter-workspace';
import { SCD_CARD_KEY, SCD_FORMS } from './scd-concepts';
import { SCD_ANNUAL_MONITORING_FIELDS, SCD_HOSPITALISATION_FIELDS, SCD_QUARTERLY_SCREENING_FIELDS } from './scd-fields';

/** The sickle cell disease card's screening, monitoring and hospitalisation panels, each saving its form */

export const ScdQuarterlyScreeningWorkspace = ncdEncounterWorkspace({
  cardKey: SCD_CARD_KEY,
  form: SCD_FORMS.quarterlyScreening,
  fields: SCD_QUARTERLY_SCREENING_FIELDS,
  record: ['recordQuarterlyScreening', 'Record quarterly screening'],
  edit: ['editQuarterlyScreening', 'Edit quarterly screening'],
});

export const ScdAnnualMonitoringWorkspace = ncdEncounterWorkspace({
  cardKey: SCD_CARD_KEY,
  form: SCD_FORMS.annualMonitoring,
  fields: SCD_ANNUAL_MONITORING_FIELDS,
  record: ['recordAnnualMonitoring', 'Record annual monitoring'],
  edit: ['editAnnualMonitoring', 'Edit annual monitoring'],
});

export const ScdHospitalisationWorkspace = ncdEncounterWorkspace({
  cardKey: SCD_CARD_KEY,
  form: SCD_FORMS.hospitalisation,
  fields: SCD_HOSPITALISATION_FIELDS,
  record: ['recordHospitalisation', 'Record hospitalisation'],
  edit: ['editHospitalisation', 'Edit hospitalisation'],
});
