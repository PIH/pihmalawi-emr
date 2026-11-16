import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { type PdcCondition } from './pdc-condition';
import { HIE_LAB_FIELDS, HIE_PLAN_FIELDS, HIE_VISIT_FIELDS } from './hie-fields';
import { SEVERE_MALNUTRITION } from './hie-concepts';
import {
  TRISOMY_CARD_KEY,
  TRISOMY_CARD_VERSION,
  TRISOMY_FORMS,
  TRISOMY_HEADER,
  TRISOMY_LABS as L,
  TRISOMY_MODERATE_MALNUTRITION,
  TRISOMY_VISIT as V,
} from './trisomy-concepts';

const H = HIE_VISIT_FIELDS;

/** Questions asked Yes/No, each in a group of its own, groups of one set told apart by the question they hold */
const ownGroups = (groupConcept: string, items: Array<{ key: string; concept: string; label: string }>): Array<ArtField> =>
  items.map((i) => ({ ...question(i.key, i.concept, i.label, YES_NO), group: { concept: groupConcept, match: { concept: i.concept } } }));

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

const STOOL = ownGroups(V.stoolGroup, V.stool);
const EAR = ownGroups(V.earGroup, V.ear);
const SLEEP = ownGroups(V.sleepGroup, V.sleep);
const EXTREMITIES = ownGroups(V.extremitiesGroup, V.extremities);

/** The plan's questions this visit asks, in its order: the HIE visit's, but for play therapy's label */
const plan = (name: string) => HIE_PLAN_FIELDS.find((f) => f.name === name);
const PLAN: Array<ArtField> = [
  plan('individualCounselling'),
  plan('feedingCounselling'),
  plan('continueFollowUp'),
  plan('physiotherapy'),
  { ...plan('playTherapy'), label: 'Group counselling and play therapy' },
];

/**
 * pdc-trisomy-21-visit.xml's questions. Those it shares with the HIE / developmental delay visit (growth, MDAT,
 * treatment, the plan, referral out, the next appointment) save the same concepts in the same way.
 */
export const TRISOMY_VISIT_FIELDS: Record<string, ArtField> = {
  weight: H.weight,
  height: H.height,
  muac: H.muac,
  malnutrition: question('malnutrition', V.malnutrition, 'Malnutrition', V.malnutritionAnswers),
  ...Object.fromEntries(STOOL.map((f) => [f.name, f])),
  vomiting: yesNo('vomiting', V.vomiting, 'Vomiting'),
  ...Object.fromEntries(EAR.map((f) => [f.name, f])),
  ...Object.fromEntries(SLEEP.map((f) => [f.name, f])),
  ...Object.fromEntries(EXTREMITIES.map((f) => [f.name, f])),
  anticonvulsants: H.anticonvulsants,
  drugAndDose: H.drugAndDose,
  doseAdjusted: H.doseAdjusted,
  ...Object.fromEntries(PLAN.map((f) => [f.name, f])),
  mdatSummary: H.mdatSummary,
  referredToPoser: H.referredToPoser,
  referredOut: H.referredOut,
  referredOutSpecify: H.referredOutSpecify,
  referredTo: H.referredTo,
  referredToOther: H.referredToOther,
  nextAppointment: H.nextAppointment,
};

const F = TRISOMY_VISIT_FIELDS;

/** trisomy-21-laboratory-tests.xml: the full blood count, TSH with its date, another test; it refuses future dates */
export const TRISOMY_LAB_FIELDS: Array<ArtField> = [
  { name: 'wbc', concept: L.wbc, kind: 'number', label: 'WBC', unit: '/µL' },
  { name: 'rbc', concept: L.rbc, kind: 'number', label: 'RBC' },
  { name: 'hb', concept: L.hb, kind: 'number', label: 'Hb', unit: 'g/dL' },
  { name: 'mcv', concept: L.mcv, kind: 'number', label: 'MCV', unit: 'fL' },
  { name: 'platelets', concept: L.platelets, kind: 'number', label: 'Platelets', unit: '/µL' },
  { name: 'differential', concept: L.differential, kind: 'text', label: 'Differential' },
  { name: 'tsh', concept: L.tsh, kind: 'number', label: 'TSH', unit: 'mIU/L', obsDate: 'tshDate' },
  ...HIE_LAB_FIELDS.filter((f) => f.name.startsWith('otherTest')),
];

const lab = (name: string) => TRISOMY_LAB_FIELDS.find((f) => f.name === name);

/** Whether the child is malnourished, moderately or severely, as the card flags it in red */
export const trisomyMalnourished = (value: FieldValue) =>
  [TRISOMY_MODERATE_MALNUTRITION, SEVERE_MALNUTRITION].includes(String(value ?? '').toLowerCase());

/** The Trisomy 21 eMastercard: pdc-trisomy-emastercard.xml, pdc-trisomy-21-visit.xml and trisomy-21-laboratory-tests.xml */
export const TRISOMY_CONDITION: PdcCondition = {
  key: TRISOMY_CARD_KEY,
  prefix: 'trisomy',
  name: 'trisomy 21',
  title: 'Trisomy 21',
  version: TRISOMY_CARD_VERSION,
  cardName: 'PDC Trisomy eMastercard',
  forms: TRISOMY_FORMS,
  workspaces: {
    header: 'pihmalawi-trisomy-header-workspace',
    visit: 'pihmalawi-trisomy-visit-workspace',
    labs: 'pihmalawi-trisomy-labs-workspace',
  },
  headerSections: {
    patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
    overview: { title: 'Patient Overview', fields: [yesNo('meconiumDelayed', TRISOMY_HEADER.meconiumDelayed, 'Meconium delayed')] },
  },
  visitFields: TRISOMY_VISIT_FIELDS,
  visitSections: [
    { key: 'growth', title: 'Growth and Nutrition', rows: [[F.weight, F.height, F.muac], F.malnutrition] },
    {
      key: 'symptoms',
      title: 'Symptoms',
      rows: [{ legend: 'Stool' }, ...STOOL, F.vomiting, { legend: 'Ear' }, ...EAR, { legend: 'Sleep' }, ...SLEEP, { legend: 'Extremities' }, ...EXTREMITIES],
    },
    { key: 'treatment', title: 'Treatment', rows: [F.anticonvulsants, F.drugAndDose, F.doseAdjusted] },
    { key: 'plan', title: 'Plan', rows: [...PLAN, F.mdatSummary, F.referredToPoser] },
    { key: 'referral', title: 'Referral', rows: [F.referredOut, F.referredOutSpecify, F.referredTo, F.referredToOther, F.nextAppointment] },
  ],
  monitoring: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: trisomyMalnourished },
    { key: 'stool', label: 'Stool', fields: STOOL, mode: 'yes' },
    { key: 'vomiting', label: 'Vomiting', fields: [F.vomiting] },
    { key: 'ear', label: 'Ear', fields: EAR, mode: 'yes' },
    { key: 'sleep', label: 'Sleep', fields: SLEEP, mode: 'yes' },
    { key: 'extremities', label: 'Extremities', fields: EXTREMITIES, mode: 'yes' },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'anticonvulsants', label: 'Anticonvulsants', fields: [F.anticonvulsants] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose] },
  ],
  visitColumns: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: trisomyMalnourished },
    { key: 'symptoms', label: 'Symptoms', fields: [...STOOL.slice(1), F.vomiting, ...EAR, ...SLEEP, ...EXTREMITIES], mode: 'yes' },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'drugAndDose', label: 'Drug and dose', fields: [F.drugAndDose, F.doseAdjusted], mode: 'drug' },
    { key: 'plan', label: 'Plan', fields: [...PLAN, F.referredToPoser], mode: 'yes' },
  ],
  malnourished: trisomyMalnourished,
  labs: {
    fields: TRISOMY_LAB_FIELDS,
    columns: [
      {
        key: 'fbc',
        label: 'Full blood count',
        items: ['wbc', 'rbc', 'hb', 'mcv', 'platelets', 'differential'].map((n) => ({ field: lab(n), prefix: lab(n).label })),
      },
      { key: 'tsh', label: 'TSH', items: [{ field: lab('tsh') }] },
      { key: 'otherTest', label: 'Other test', items: [{ field: lab('otherTestDate') }, { field: lab('otherTestType') }, { field: lab('otherTestResult') }] },
    ],
  },
};
