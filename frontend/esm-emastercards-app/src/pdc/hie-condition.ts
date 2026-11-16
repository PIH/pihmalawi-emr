import { type PdcCondition } from './pdc-condition';
import { HIE_CARD_KEY, HIE_CARD_VERSION, HIE_FORMS } from './hie-concepts';
import { HIE_FEEDING_FIELDS, HIE_HEADER_SECTIONS, HIE_LAB_FIELDS, HIE_PLAN_FIELDS, HIE_TONE_FIELDS, HIE_VISIT_FIELDS } from './hie-fields';
import { malnourished } from './hie-rules';

const F = HIE_VISIT_FIELDS;
const lab = (name: string) => HIE_LAB_FIELDS.find((f) => f.name === name);
const yes = (value: unknown) => String(value ?? '').toLowerCase() === F.signsOfCerebralPalsy.options[0].value.toLowerCase();

/** The HIE / Developmental Delay eMastercard: pdc-developmental-delay-emastercard.xml, developmental-delay-visit.xml and hie-developmental-delay-lab-tests.xml */
export const HIE_CONDITION: PdcCondition = {
  key: HIE_CARD_KEY,
  prefix: 'hie',
  name: 'HIE / developmental delay',
  title: 'HIE / Developmental Delay',
  version: HIE_CARD_VERSION,
  cardName: 'PDC Developmental Delay eMastercard',
  forms: HIE_FORMS,
  workspaces: { header: 'pihmalawi-hie-header-workspace', visit: 'pihmalawi-hie-visit-workspace', labs: 'pihmalawi-hie-labs-workspace' },
  headerSections: HIE_HEADER_SECTIONS,
  visitFields: HIE_VISIT_FIELDS,
  visitSections: [
    { key: 'growth', title: 'Growth and Nutrition', rows: [[F.height, F.weight, F.muac], [F.weightForAge, F.weightForHeight], F.malnutrition] },
    {
      key: 'assessments',
      title: 'Assessments',
      rows: [F.mdatSummary, { legend: 'Tone' }, ...HIE_TONE_FIELDS, { legend: 'Feeding' }, ...HIE_FEEDING_FIELDS, F.signsOfCerebralPalsy],
    },
    { key: 'treatment', title: 'Treatment', rows: [F.underMentalHealthCare, F.anticonvulsants, F.drugAndDose, F.doseAdjusted] },
    { key: 'plan', title: 'Plan', rows: HIE_PLAN_FIELDS },
    { key: 'referral', title: 'Referral', rows: [F.referredOut, F.referredOutSpecify, F.referredTo, F.referredToOther, F.nextAppointment] },
  ],
  monitoring: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'weightForAge', label: 'W/A', fields: [F.weightForAge] },
    { key: 'weightForHeight', label: 'W/H', fields: [F.weightForHeight] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: malnourished },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'tone', label: 'Tone', fields: HIE_TONE_FIELDS, mode: 'yes' },
    { key: 'feeding', label: 'Feeding', fields: HIE_FEEDING_FIELDS, mode: 'yes' },
    { key: 'cerebralPalsy', label: 'Signs of cerebral palsy', fields: [F.signsOfCerebralPalsy], alert: yes },
    { key: 'anticonvulsants', label: 'Anticonvulsants', fields: [F.anticonvulsants] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose] },
  ],
  visitColumns: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: malnourished },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'cerebralPalsy', label: 'Signs of cerebral palsy', fields: [F.signsOfCerebralPalsy] },
    { key: 'underMentalHealthCare', label: 'Under mental health care', fields: [F.underMentalHealthCare] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose, F.doseAdjusted], mode: 'drug' },
    { key: 'plan', label: 'Plan', fields: HIE_PLAN_FIELDS, mode: 'yes' },
  ],
  malnourished,
  labs: {
    fields: HIE_LAB_FIELDS,
    columns: [
      { key: 'hb', label: 'HB', items: [{ field: lab('hb') }] },
      { key: 'tsh', label: 'TSH', items: [{ field: lab('tshDate') }, { field: lab('tshDone'), prefix: 'Done' }, { field: lab('tshNormal'), prefix: 'Normal' }] },
      { key: 'otherTest', label: 'Other test', items: [{ field: lab('otherTestDate') }, { field: lab('otherTestType') }, { field: lab('otherTestResult') }] },
    ],
  },
};
