import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { type PdcCondition } from './pdc-condition';
import { HIE_PLAN_FIELDS, HIE_VISIT_FIELDS } from './hie-fields';
import { CLEFT_LAB_FIELDS } from './cleft-condition';
import { TRISOMY_VISIT_FIELDS, trisomyMalnourished } from './trisomy-condition';
import {
  OTHER_DIAGNOSIS_CARD_KEY,
  OTHER_DIAGNOSIS_CARD_VERSION,
  OTHER_DIAGNOSIS_FORMS,
  OTHER_DIAGNOSIS_VISIT as V,
} from './other-diagnosis-concepts';

const H = HIE_VISIT_FIELDS;

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

const FEEDING_CONCERNS: Array<ArtField> = V.feedingConcerns.map((i) => yesNo(i.key, i.concept, i.label));

/** The plan's questions the HIE visit asks too, under this form's labels */
const plan = (name: string, label: string) => ({ ...HIE_PLAN_FIELDS.find((f) => f.name === name), label });

/**
 * other-diagnosis-visit.xml's questions, in its order. Those it shares with the HIE / developmental delay visit
 * (growth, treatment, the plan, MDAT, referral out, the next appointment) save the same concepts in the same way; its
 * malnutrition's Moderate is the trisomy 21 visit's.
 */
export const OTHER_DIAGNOSIS_VISIT_FIELDS: Record<string, ArtField> = {
  ageAdjusted: { name: 'ageAdjusted', concept: V.ageAdjusted, kind: 'number', label: 'Age adjusted' },
  ageNonAdjusted: { name: 'ageNonAdjusted', concept: V.ageNonAdjusted, kind: 'number', label: 'Age non-adjusted' },
  weight: H.weight,
  height: H.height,
  muac: H.muac,
  weightForAge: H.weightForAge,
  weightForHeight: H.weightForHeight,
  complications: yesNo('complications', V.complicationsSinceLastVisit, 'Complications since last visit'),
  malnutrition: TRISOMY_VISIT_FIELDS.malnutrition,
  headCircumference: { name: 'headCircumference', concept: V.headCircumference, kind: 'number', label: 'Head circumference', unit: 'cm' },
  convulsions: yesNo('convulsions', V.convulsionsSinceLastVisit, 'Convulsions since last visit'),
  anticonvulsants: H.anticonvulsants,
  drugAndDose: H.drugAndDose,
  doseAdjusted: H.doseAdjusted,
  ...Object.fromEntries(FEEDING_CONCERNS.map((f) => [f.name, f])),
  individualCounselling: plan('individualCounselling', 'Individual counselling'),
  feedingCounselling: plan('feedingCounselling', 'Feeding counselling'),
  groupCounselling: yesNo('groupCounselling', V.groupCounselling, 'Group counselling'),
  playTherapy: plan('playTherapy', 'Play therapy'),
  continueFollowUp: plan('continueFollowUp', 'Continue follow-up'),
  physiotherapy: plan('physiotherapy', 'Physiotherapy'),
  referredToPoser: plan('referredToPoser', 'POSER'),
  referredOut: H.referredOut,
  referredOutSpecify: H.referredOutSpecify,
  referredTo: H.referredTo,
  referredToOther: H.referredToOther,
  mdatSummary: H.mdatSummary,
  planNotes: { name: 'planNotes', concept: V.planNotes, kind: 'text', label: 'Plan' },
  nextAppointment: H.nextAppointment,
};

const F = OTHER_DIAGNOSIS_VISIT_FIELDS;

const PLAN = [F.individualCounselling, F.feedingCounselling, F.groupCounselling, F.playTherapy, F.continueFollowUp, F.physiotherapy, F.referredToPoser];

/** pdc-hb-and-other-laboratory-tests.xml, the cleft lip / palate card's lab form too: HB with its date and another test */
export const OTHER_DIAGNOSIS_LAB_FIELDS: Array<ArtField> = CLEFT_LAB_FIELDS;

const lab = (name: string) => OTHER_DIAGNOSIS_LAB_FIELDS.find((f) => f.name === name);

/**
 * The PDC Other Diagnosis eMastercard: pdc-other-diagnosis-emastercard.xml, other-diagnosis-visit.xml and
 * pdc-hb-and-other-laboratory-tests.xml. Its header asks only the patient and guardian details: its Patient Overview
 * is the PDC card's conditions at enrolment, which the page shows in its headline.
 */
export const OTHER_DIAGNOSIS_CONDITION: PdcCondition = {
  key: OTHER_DIAGNOSIS_CARD_KEY,
  prefix: 'otherDiagnosis',
  name: 'other diagnosis',
  title: 'Other Diagnosis',
  version: OTHER_DIAGNOSIS_CARD_VERSION,
  cardName: 'PDC Other Diagnosis eMastercard',
  forms: OTHER_DIAGNOSIS_FORMS,
  workspaces: {
    header: 'pihmalawi-other-diagnosis-header-workspace',
    visit: 'pihmalawi-other-diagnosis-visit-workspace',
    labs: 'pihmalawi-other-diagnosis-labs-workspace',
  },
  headerSections: {
    patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  },
  visitFields: OTHER_DIAGNOSIS_VISIT_FIELDS,
  visitSections: [
    {
      key: 'growth',
      title: 'Growth and Nutrition',
      rows: [[F.ageAdjusted, F.ageNonAdjusted], [F.weight, F.height, F.muac], [F.weightForAge, F.weightForHeight], F.headCircumference, F.malnutrition],
    },
    { key: 'assessments', title: 'Assessments', rows: [F.complications] },
    { key: 'convulsions', title: 'Convulsions', rows: [F.convulsions, F.anticonvulsants, F.drugAndDose, F.doseAdjusted] },
    { key: 'feedingConcerns', title: 'Feeding concerns', rows: FEEDING_CONCERNS },
    { key: 'plan', title: 'Plan', rows: [...PLAN, F.mdatSummary, F.planNotes] },
    { key: 'referral', title: 'Referral', rows: [F.referredOut, F.referredOutSpecify, F.referredTo, F.referredToOther, F.nextAppointment] },
  ],
  monitoring: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'headCircumference', label: 'Head circumference', fields: [F.headCircumference] },
    { key: 'weightForAge', label: 'W/A', fields: [F.weightForAge] },
    { key: 'weightForHeight', label: 'W/H', fields: [F.weightForHeight] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: trisomyMalnourished },
    { key: 'complications', label: 'Complications since last visit', fields: [F.complications] },
    { key: 'convulsions', label: 'Convulsions since last visit', fields: [F.convulsions] },
    { key: 'anticonvulsants', label: 'Anticonvulsants', fields: [F.anticonvulsants] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose, F.doseAdjusted], mode: 'drug' },
    { key: 'feedingConcerns', label: 'Feeding concerns', fields: FEEDING_CONCERNS, mode: 'yes' },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
  ],
  visitColumns: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'headCircumference', label: 'Head circumference', fields: [F.headCircumference] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: trisomyMalnourished },
    { key: 'convulsions', label: 'Convulsions since last visit', fields: [F.convulsions] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose, F.doseAdjusted], mode: 'drug' },
    { key: 'feedingConcerns', label: 'Feeding concerns', fields: FEEDING_CONCERNS, mode: 'yes' },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'recommendations', label: 'Recommendations', fields: PLAN, mode: 'yes' },
    { key: 'planNotes', label: 'Plan', fields: [F.planNotes] },
  ],
  malnourished: trisomyMalnourished,
  labs: {
    fields: OTHER_DIAGNOSIS_LAB_FIELDS,
    columns: [
      { key: 'hb', label: 'HB', items: [{ field: lab('hb') }] },
      { key: 'otherTest', label: 'Other test', items: [{ field: lab('otherTestDate') }, { field: lab('otherTestType') }, { field: lab('otherTestResult') }] },
    ],
  },
};
