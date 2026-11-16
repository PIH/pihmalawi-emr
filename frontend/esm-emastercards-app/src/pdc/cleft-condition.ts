import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { type PdcCondition } from './pdc-condition';
import { HIE_LAB_FIELDS, HIE_VISIT_FIELDS } from './hie-fields';
import { malnourished } from './hie-rules';
import { CLEFT_CARD_KEY, CLEFT_CARD_VERSION, CLEFT_FORMS, CLEFT_HEADER, CLEFT_VISIT as V } from './cleft-concepts';

const H = HIE_VISIT_FIELDS;

const yesNo = (name: string, concept: string, label: string, group?: ArtField['group']): ArtField => ({
  ...question(name, concept, label, YES_NO),
  ...(group ? { group } : {}),
});

const facial = { concept: CLEFT_HEADER.facialGroup };

/** pdc-cleft-lip-palate-emastercard.xml's Patient Overview: its facial abnormalities, in one Facial set group */
const FACIAL_FIELDS: Array<ArtField> = [
  yesNo('smallJaw', CLEFT_HEADER.smallJaw, 'Facial abnormalities: small jaw', facial),
  yesNo('facialOther', CLEFT_HEADER.other, 'Facial abnormalities: other', facial),
  { name: 'facialOtherSpecify', concept: CLEFT_HEADER.otherSpecify, kind: 'text', label: 'Facial abnormalities: specify', group: facial },
];

/** Ear pain and discharge, each in an Ear set group of its own, told apart by the question it holds */
const EAR: Array<ArtField> = V.ear.map((i) => yesNo(i.key, i.concept, i.label, { concept: V.earGroup, match: { concept: i.concept } }));

const surgery = { concept: V.surgeryGroup };
const PLAN: Array<ArtField> = V.plan.map((i) => yesNo(i.key, i.concept, i.label));

/**
 * cleft-lip-palate-visit.xml's questions, in its order. Those it shares with the HIE / developmental delay visit
 * (growth, MDAT, referral out, the next appointment) save the same concepts in the same way.
 */
export const CLEFT_VISIT_FIELDS: Record<string, ArtField> = {
  weight: H.weight,
  height: H.height,
  muac: H.muac,
  weightForAge: H.weightForAge,
  weightForHeight: H.weightForHeight,
  malnutrition: H.malnutrition,
  feedingProblems: yesNo('feedingProblems', V.feedingProblems, 'Feeding problems'),
  difficultBreathing: yesNo('difficultBreathing', V.difficultBreathing, 'Difficult breathing'),
  heartMurmur: yesNo('heartMurmur', V.heartMurmur, 'Heart murmur'),
  ...Object.fromEntries(EAR.map((f) => [f.name, f])),
  otherProblem: yesNo('otherProblem', V.other, 'Other'),
  surgeryScheduled: yesNo('surgeryScheduled', V.surgeryScheduled, 'Surgery scheduled', surgery),
  surgeryDate: { name: 'surgeryDate', concept: V.surgeryDate, kind: 'date', label: 'Date of surgery', future: true, group: surgery },
  ...Object.fromEntries(PLAN.map((f) => [f.name, f])),
  mdatSummary: H.mdatSummary,
  poser: yesNo('poser', V.poser, 'POSER'),
  referredOut: H.referredOut,
  referredOutSpecify: H.referredOutSpecify,
  referredTo: H.referredTo,
  referredToOther: H.referredToOther,
  planNotes: { name: 'planNotes', concept: V.planNotes, kind: 'text', label: 'Plan' },
  nextAppointment: H.nextAppointment,
};

const F = CLEFT_VISIT_FIELDS;

/** pdc-hb-and-other-laboratory-tests.xml: HB with its date and another test; it refuses future dates */
export const CLEFT_LAB_FIELDS: Array<ArtField> = HIE_LAB_FIELDS.filter((f) => f.name === 'hb' || f.name.startsWith('otherTest'));

const lab = (name: string) => CLEFT_LAB_FIELDS.find((f) => f.name === name);

const SYMPTOMS = [F.feedingProblems, F.difficultBreathing, F.heartMurmur, ...EAR, F.otherProblem];

/** The Cleft Lip / Palate eMastercard: pdc-cleft-lip-palate-emastercard.xml, cleft-lip-palate-visit.xml and pdc-hb-and-other-laboratory-tests.xml */
export const CLEFT_CONDITION: PdcCondition = {
  key: CLEFT_CARD_KEY,
  prefix: 'cleft',
  name: 'cleft lip / palate',
  title: 'Cleft Lip / Palate',
  version: CLEFT_CARD_VERSION,
  cardName: 'PDC Cleft Lip / Palate eMastercard',
  forms: CLEFT_FORMS,
  workspaces: {
    header: 'pihmalawi-cleft-header-workspace',
    visit: 'pihmalawi-cleft-visit-workspace',
    labs: 'pihmalawi-cleft-labs-workspace',
  },
  headerSections: {
    patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
    overview: { title: 'Patient Overview', fields: FACIAL_FIELDS },
  },
  visitFields: CLEFT_VISIT_FIELDS,
  visitSections: [
    { key: 'growth', title: 'Growth and Nutrition', rows: [[F.weight, F.height, F.muac], [F.weightForAge, F.weightForHeight], F.malnutrition] },
    { key: 'assessments', title: 'Assessments', rows: [F.feedingProblems, F.difficultBreathing, F.heartMurmur, ...EAR, F.otherProblem] },
    { key: 'surgery', title: 'Surgery', rows: [[F.surgeryScheduled, F.surgeryDate]] },
    { key: 'plan', title: 'Plan', rows: [...PLAN, F.mdatSummary, F.poser, F.planNotes] },
    { key: 'referral', title: 'Referral', rows: [F.referredOut, F.referredOutSpecify, F.referredTo, F.referredToOther, F.nextAppointment] },
  ],
  monitoring: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'weightForAge', label: 'W/A', fields: [F.weightForAge] },
    { key: 'weightForHeight', label: 'W/H', fields: [F.weightForHeight] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: malnourished },
    { key: 'problems', label: 'Problems', fields: SYMPTOMS, mode: 'yes' },
    { key: 'surgeryScheduled', label: 'Surgery scheduled', fields: [F.surgeryScheduled] },
    { key: 'surgeryDate', label: 'Date of surgery', fields: [F.surgeryDate] },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
  ],
  visitColumns: [
    { key: 'weight', label: 'Weight', fields: [F.weight] },
    { key: 'height', label: 'Height', fields: [F.height] },
    { key: 'muac', label: 'MUAC', fields: [F.muac] },
    { key: 'malnutrition', label: 'Malnutrition', fields: [F.malnutrition], alert: malnourished },
    { key: 'problems', label: 'Problems', fields: SYMPTOMS, mode: 'yes' },
    { key: 'surgeryDate', label: 'Date of surgery', fields: [F.surgeryDate] },
    { key: 'mdatSummary', label: 'MDAT summary normal', fields: [F.mdatSummary] },
    { key: 'cleftPlan', label: 'Recommendations', fields: [...PLAN, F.poser], mode: 'yes' },
    { key: 'planNotes', label: 'Plan', fields: [F.planNotes] },
  ],
  malnourished,
  labs: {
    fields: CLEFT_LAB_FIELDS,
    columns: [
      { key: 'hb', label: 'HB', items: [{ field: lab('hb') }] },
      { key: 'otherTest', label: 'Other test', items: [{ field: lab('otherTestDate') }, { field: lab('otherTestType') }, { field: lab('otherTestResult') }] },
    ],
  },
};
