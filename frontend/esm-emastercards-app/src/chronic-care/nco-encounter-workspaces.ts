import { ncdEncounterWorkspace } from '../shared/ncd-encounter-workspace';
import { NCO_CARD_KEY, NCO_FORMS } from './nco-concepts';
import { NCO_ANNUAL_LAB_FIELDS, NCO_HOSPITALISATION_FIELDS, NCO_QUARTERLY_LAB_FIELDS } from './nco-fields';

/** The NCD other card's laboratory and hospitalisation panels, each saving its form */

export const NcoQuarterlyLabsWorkspace = ncdEncounterWorkspace({
  cardKey: NCO_CARD_KEY,
  form: NCO_FORMS.quarterlyLabs,
  fields: NCO_QUARTERLY_LAB_FIELDS,
  record: ['recordQuarterlyLabs', 'Record quarterly laboratory tests'],
  edit: ['editQuarterlyLabs', 'Edit quarterly laboratory tests'],
});

export const NcoAnnualLabsWorkspace = ncdEncounterWorkspace({
  cardKey: NCO_CARD_KEY,
  form: NCO_FORMS.annualLabs,
  fields: NCO_ANNUAL_LAB_FIELDS,
  record: ['recordAnnualLabs', 'Record annual laboratory tests'],
  edit: ['editAnnualLabs', 'Edit annual laboratory tests'],
});

export const NcoHospitalisationWorkspace = ncdEncounterWorkspace({
  cardKey: NCO_CARD_KEY,
  form: NCO_FORMS.hospitalisation,
  fields: NCO_HOSPITALISATION_FIELDS,
  record: ['recordHospitalisation', 'Record hospitalisation'],
  edit: ['editHospitalisation', 'Edit hospitalisation'],
});
