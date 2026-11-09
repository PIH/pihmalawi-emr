import { ncdEncounterWorkspace } from '../shared/ncd-encounter-workspace';
import { CKD_CARD_KEY, CKD_FORMS } from './ckd-concepts';
import { CKD_ANNUAL_LAB_FIELDS, CKD_HOSPITALISATION_FIELDS, CKD_IMAGING_FIELDS, CKD_QUARTERLY_LAB_FIELDS } from './ckd-fields';

/** The chronic kidney disease card's laboratory, imaging and hospitalisation panels, each saving its form */

export const CkdQuarterlyLabsWorkspace = ncdEncounterWorkspace({
  cardKey: CKD_CARD_KEY,
  form: CKD_FORMS.quarterlyLabs,
  fields: CKD_QUARTERLY_LAB_FIELDS,
  record: ['recordQuarterlyLabs', 'Record quarterly laboratory tests'],
  edit: ['editQuarterlyLabs', 'Edit quarterly laboratory tests'],
});

export const CkdAnnualLabsWorkspace = ncdEncounterWorkspace({
  cardKey: CKD_CARD_KEY,
  form: CKD_FORMS.annualLabs,
  fields: CKD_ANNUAL_LAB_FIELDS,
  record: ['recordAnnualLabs', 'Record annual laboratory tests'],
  edit: ['editAnnualLabs', 'Edit annual laboratory tests'],
});

export const CkdImagingWorkspace = ncdEncounterWorkspace({
  cardKey: CKD_CARD_KEY,
  form: CKD_FORMS.imaging,
  fields: CKD_IMAGING_FIELDS,
  record: ['recordUltrasound', 'Record ultrasound'],
  edit: ['editUltrasound', 'Edit ultrasound'],
});

export const CkdHospitalisationWorkspace = ncdEncounterWorkspace({
  cardKey: CKD_CARD_KEY,
  form: CKD_FORMS.hospitalisation,
  fields: CKD_HOSPITALISATION_FIELDS,
  record: ['recordHospitalisation', 'Record hospitalisation'],
  edit: ['editHospitalisation', 'Edit hospitalisation'],
});
