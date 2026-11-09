import { ncdEncounterWorkspace } from '../shared/ncd-encounter-workspace';
import { CVD_CARD_KEY, CVD_FORMS } from './cvd-concepts';
import {
  CVD_CHEST_XRAY_FIELDS,
  CVD_ECHO_FIELDS,
  CVD_EKG_FIELDS,
  CVD_HOSPITALISATION_FIELDS,
  CVD_PROTOCOL_LAB_FIELDS,
  CVD_QUARTERLY_LAB_FIELDS,
} from './cvd-fields';

/** The cardiac and vascular disease card's imaging, laboratory and hospitalisation panels, each saving its form */

export const CvdEchoWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.echo,
  fields: CVD_ECHO_FIELDS,
  record: ['recordEcho', 'Record echocardiogram'],
  edit: ['editEcho', 'Edit echocardiogram'],
});

export const CvdEkgWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.ekg,
  fields: CVD_EKG_FIELDS,
  record: ['recordEkg', 'Record ECG'],
  edit: ['editEkg', 'Edit ECG'],
});

export const CvdChestXrayWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.chestXray,
  fields: CVD_CHEST_XRAY_FIELDS,
  record: ['recordChestXray', 'Record chest X-ray'],
  edit: ['editChestXray', 'Edit chest X-ray'],
});

export const CvdQuarterlyLabsWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.quarterlyLabs,
  fields: CVD_QUARTERLY_LAB_FIELDS,
  record: ['recordQuarterlyLabs', 'Record quarterly laboratory tests'],
  edit: ['editQuarterlyLabs', 'Edit quarterly laboratory tests'],
});

export const CvdProtocolLabsWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.protocolLabs,
  fields: CVD_PROTOCOL_LAB_FIELDS,
  record: ['recordProtocolLabs', 'Record laboratory tests (per protocol)'],
  edit: ['editProtocolLabs', 'Edit laboratory tests (per protocol)'],
});

export const CvdHospitalisationWorkspace = ncdEncounterWorkspace({
  cardKey: CVD_CARD_KEY,
  form: CVD_FORMS.hospitalisation,
  fields: CVD_HOSPITALISATION_FIELDS,
  record: ['recordHospitalisation', 'Record hospitalisation'],
  edit: ['editHospitalisation', 'Edit hospitalisation'],
});
