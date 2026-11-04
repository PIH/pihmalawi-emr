import { NO, YES } from '../art/art-concepts';
import { type ArtField, type Option } from '../art/art-fields';
import {
  CURRENT,
  EXPOSURE,
  FINDINGS,
  MH_HEADER,
  MH_SCREENING,
  MH_VISIT,
  NEVER,
  NON_CODED_TEXT,
  OTHER_NON_CODED,
  PAST,
  UNKNOWN,
} from './mh-concepts';

const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];
const YES_NO_UNKNOWN: Array<Option> = [...YES_NO, { value: UNKNOWN, label: 'Unknown' }];
const CURRENT_PAST_NEVER: Array<Option> = [
  { value: CURRENT, label: 'Current' },
  { value: PAST, label: 'Past' },
  { value: NEVER, label: 'Never' },
];

/** The header's sections, each shown in its own card on the Mental health page and edited in its own panel */
export type MhHeaderSection = 'patientGuardian' | 'diagnoses' | 'presentingFeatures' | 'historyExposures';

const diagnosisFields: Array<ArtField> = MH_HEADER.diagnoses.flatMap((d) => {
  const group = { concept: MH_HEADER.diagnosisGroup, match: { concept: MH_HEADER.diagnosis, value: d.answer } };
  return [
    {
      name: `dx_${d.key}`,
      concept: MH_HEADER.diagnosis,
      kind: 'coded' as const,
      label: d.label,
      checkbox: true,
      options: [{ value: d.answer, label: d.label }],
      group,
    },
    ...(d.named ? [{ name: `dx_${d.key}Name`, concept: NON_CODED_TEXT, kind: 'text' as const, label: 'Specify', group }] : []),
    { name: `dx_${d.key}Date`, concept: MH_HEADER.diagnosisDate, kind: 'date' as const, label: `${d.label} date`, future: true, group },
  ];
});

const presentingFeatureFields: Array<ArtField> = MH_HEADER.presentingFeatures.flatMap((f) => {
  const group = { concept: MH_HEADER.presentingFeatureGroup, match: { concept: MH_HEADER.presentingFeature, value: f.answer } };
  return [
    {
      name: `pf_${f.key}`,
      concept: MH_HEADER.presentingFeature,
      kind: 'coded' as const,
      label: f.label,
      checkbox: true,
      options: [{ value: f.answer, label: f.label }],
      group,
      ...(f.answer === OTHER_NON_CODED ? { comment: 'pf_otherComment' } : {}),
    },
    { name: `pf_${f.key}Date`, concept: MH_HEADER.diagnosisDate, kind: 'date' as const, label: `${f.label} date`, future: true, group },
  ];
});

/** An exposure's group as the header asks it: current, past or never, for how many years, and when last used */
function exposureFields(
  key: string,
  label: string,
  groupConcept: string,
  historyConcept: string,
  lastUseFuture: boolean,
  named = false,
): Array<ArtField> {
  const group = { concept: groupConcept };
  return [
    ...(named ? [{ name: `${key}Name`, concept: NON_CODED_TEXT, kind: 'text' as const, label: `${label}: name`, group }] : []),
    { name: key, concept: historyConcept, kind: 'coded', label, options: CURRENT_PAST_NEVER, group },
    { name: `${key}Years`, concept: EXPOSURE.years, kind: 'number', label: `${label}: number of years`, group },
    { name: `${key}LastUse`, concept: EXPOSURE.lastUse, kind: 'date', label: `${label}: date of last use`, future: lastUseFuture, group },
  ];
}

/** mental-health-emastercard.xml's questions, by the card on the Mental health page that shows and edits them */
export const MH_HEADER_SECTIONS: Record<MhHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Patient and guardian',
    fields: [
      { name: 'transferInDate', concept: MH_HEADER.transferInDate, kind: 'date', label: 'Transfer-in date', future: true },
      { name: 'patientPhone', concept: MH_HEADER.patientPhone, kind: 'number', label: 'Patient phone' },
      { name: 'guardianName', concept: MH_HEADER.guardianName, kind: 'text', label: 'Guardian name' },
      { name: 'guardianPhone', concept: MH_HEADER.guardianPhone, kind: 'text', label: 'Guardian phone' },
      { name: 'guardianRelation', concept: MH_HEADER.relationToPatient, kind: 'text', label: 'Guardian relation to patient' },
      {
        name: 'agreesToFollowUp',
        concept: MH_HEADER.agreesToFollowUp,
        kind: 'coded',
        label: 'Agrees to follow-up',
        required: true,
        options: [
          { value: NO, label: 'No' },
          { value: YES, label: 'Yes' },
        ],
      },
    ],
  },
  diagnoses: { title: 'Diagnoses', fields: diagnosisFields },
  presentingFeatures: {
    title: 'Presenting features',
    fields: presentingFeatureFields,
  },
  historyExposures: {
    title: 'History and exposures',
    fields: [
      { name: 'familyEpilepsy', concept: MH_HEADER.familyHistory.epilepsy, kind: 'coded', label: 'Family history: epilepsy', options: YES_NO_UNKNOWN },
      { name: 'familyMentalIllness', concept: MH_HEADER.familyHistory.mentalIllness, kind: 'coded', label: 'Family history: mental illness', options: YES_NO_UNKNOWN },
      { name: 'familyBehaviour', concept: MH_HEADER.familyHistory.behaviour, kind: 'coded', label: 'Family history: behaviour problems', options: YES_NO_UNKNOWN },
      {
        name: 'hivStatus',
        concept: MH_HEADER.hivStatus,
        kind: 'coded',
        label: 'HIV status',
        options: [
          { value: MH_HEADER.hivStatusAnswers.reactive, label: 'Reactive' },
          { value: MH_HEADER.hivStatusAnswers.nonReactive, label: 'Non-reactive' },
          { value: UNKNOWN, label: 'Unknown' },
        ],
      },
      { name: 'hivTestDate', concept: MH_HEADER.hivTestDate, kind: 'date', label: 'HIV test date', future: true },
      { name: 'artStartDate', concept: MH_HEADER.artStartDate, kind: 'date', label: 'ART start date', future: true },
      {
        name: 'tbStatus',
        concept: MH_HEADER.tbStatus,
        kind: 'coded',
        label: 'TB',
        options: [
          { value: MH_HEADER.tbStatusAnswers.smearPositive, label: 'smear pos' },
          { value: MH_HEADER.tbStatusAnswers.smearNegative, label: 'smear neg' },
          { value: MH_HEADER.tbStatusAnswers.eptb, label: 'EPTB' },
          { value: UNKNOWN, label: 'never had TB' },
        ],
      },
      { name: 'tbYear', concept: MH_HEADER.tbYear, kind: 'number', label: 'TB year' },
      ...exposureFields('alcohol', 'Alcohol', EXPOSURE.alcoholGroup, EXPOSURE.alcoholHistory, false),
      ...exposureFields('chamba', 'Chamba (marijuana)', EXPOSURE.chambaGroup, EXPOSURE.history, true),
      ...exposureFields('otherDrugs', 'Other drugs', EXPOSURE.otherDrugsGroup, EXPOSURE.history, true, true),
      ...exposureFields('tradMeds', 'Traditional medicine', EXPOSURE.tradMedsGroup, EXPOSURE.history, true),
    ],
  },
};

/** The fields a clinician starts the card with, which the legacy form requires on its first save */
export const MH_START_FIELDS: Array<ArtField> = [
  MH_HEADER_SECTIONS.patientGuardian.fields.find((f) => f.name === 'agreesToFollowUp'),
  ...diagnosisFields,
];

/** The visit's mental status examination findings, in its order */
export const MSE_FINDINGS: Array<{ key: string; answer: string; label: string }> = [
  { key: 'depressed', answer: FINDINGS.depressive, label: 'Depressed mood' },
  { key: 'elevated', answer: FINDINGS.elevatedMood, label: 'Elevated mood' },
  { key: 'disruptive', answer: FINDINGS.disruptive, label: 'Disruptive behavior' },
  { key: 'speech', answer: FINDINGS.disorganisedSpeech, label: 'Disorganized speech' },
  { key: 'delusions', answer: FINDINGS.delusions, label: 'Delusions' },
  { key: 'hallucinations', answer: FINDINGS.hallucinations, label: 'Hallucinations' },
  { key: 'insight', answer: FINDINGS.lacksInsight, label: 'Lack of insight' },
  { key: 'other', answer: OTHER_NON_CODED, label: 'Other' },
];

export const MEDICATIONS = MH_VISIT.medications;

/** A medication's dispensing group as the visit asks it */
export function medicationFields(m: (typeof MEDICATIONS)[number]): Array<ArtField> {
  const group = { concept: MH_VISIT.dispensingGroup, match: { concept: MH_VISIT.medication, value: m.drug } };
  const name = `med_${m.key}`;
  return [
    { name, concept: MH_VISIT.medication, kind: 'coded', label: m.label, checkbox: true, options: [{ value: m.drug, label: m.label }], group },
    ...(m.key === 'other' ? [{ name: `${name}Name`, concept: NON_CODED_TEXT, kind: 'text' as const, label: 'Other medication: specify', group }] : []),
    { name: `${name}Dose`, concept: MH_VISIT.dose, kind: 'number', label: `${m.label} dose`, group },
    { name: `${name}DoseUnit`, concept: MH_VISIT.doseUnit, kind: 'coded', label: `${m.label} unit`, options: MH_VISIT.doseUnits, select: true, group },
    { name: `${name}Route`, concept: MH_VISIT.route, kind: 'coded', label: `${m.label} route`, options: MH_VISIT.routes, select: true, group },
    { name: `${name}Frequency`, concept: MH_VISIT.frequency, kind: 'coded', label: `${m.label} frequency`, options: MH_VISIT.frequencies, select: true, group },
    { name: `${name}Duration`, concept: MH_VISIT.duration, kind: 'number', label: `${m.label} duration`, group },
    { name: `${name}DurationUnit`, concept: MH_VISIT.durationUnit, kind: 'coded', label: `${m.label} duration unit`, options: MH_VISIT.durationUnits, select: true, group },
  ];
}

const mseOptions: Array<Option> = MSE_FINDINGS.map((f) => ({ value: f.answer, label: f.label }));
const yesNo = (name: string, concept: string, label: string): ArtField => ({ name, concept, kind: 'coded', label, options: YES_NO });

/** mental-health-visit.xml's questions, in its order (medications are medicationFields) */
export const MH_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: MH_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: MH_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  phq9Score: { name: 'phq9Score', concept: MH_VISIT.phq9Score, kind: 'number', label: 'PHQ-9 score', reference: 'readonly' },
  msePresent: { name: 'msePresent', concept: MH_VISIT.msePresent, kind: 'multi', label: 'MSE findings present', options: mseOptions },
  mseAbsent: { name: 'mseAbsent', concept: MH_VISIT.mseAbsent, kind: 'multi', label: 'MSE findings absent', options: mseOptions },
  stable: yesNo('stable', MH_VISIT.stable, 'Patient stable?'),
  dailyActivities: yesNo('dailyActivities', MH_VISIT.dailyActivities, 'Able to do activities of daily living'),
  useChamba: {
    name: 'useChamba',
    concept: EXPOSURE.history,
    kind: 'coded',
    label: 'Chamba (Marijuana)',
    checkbox: true,
    options: [{ value: CURRENT, label: 'Chamba (Marijuana)' }],
    group: { concept: EXPOSURE.chambaGroup },
  },
  useAlcohol: {
    name: 'useAlcohol',
    concept: EXPOSURE.alcoholHistory,
    kind: 'coded',
    label: 'Alcohol',
    checkbox: true,
    options: [{ value: CURRENT, label: 'Alcohol' }],
    group: { concept: EXPOSURE.alcoholGroup },
  },
  useOtherDrugs: {
    name: 'useOtherDrugs',
    concept: EXPOSURE.history,
    kind: 'coded',
    label: 'Other drugs',
    checkbox: true,
    options: [{ value: CURRENT, label: 'Other drugs' }],
    group: { concept: EXPOSURE.otherDrugsGroup },
    comment: 'useOtherDrugsComment',
  },
  pregnant: { name: 'pregnant', concept: MH_VISIT.pregnant, kind: 'coded', label: 'Pregnant?', checkbox: true, options: [{ value: YES, label: 'Yes' }] },
  familyPlanning: yesNo('familyPlanning', MH_VISIT.familyPlanning, 'On family planning?'),
  suicideRisk: yesNo('suicideRisk', MH_VISIT.suicideRisk, 'Suicide risk?'),
  sideEffects: { name: 'sideEffects', concept: MH_VISIT.sideEffects, kind: 'boolean', label: 'Medication side effects?' },
  hospitalised: yesNo('hospitalised', MH_VISIT.hospitalised, 'Hospitalised since last visit due to this condition?'),
  counselling: yesNo('counselling', MH_VISIT.counselling, 'Counselling provided?'),
  comments: { name: 'comments', concept: MH_VISIT.comments, kind: 'text', label: 'Comments' },
  nextAppointment: { name: 'nextAppointment', concept: MH_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true, required: true },
};

/** mental-health-screening.xml's questions, in its order */
export const MH_SCREENING_FIELDS: Array<ArtField> = [
  { name: 'diagnosis', concept: MH_SCREENING.diagnosis, kind: 'multi', label: 'Diagnosis', options: MH_SCREENING.diagnoses },
  {
    name: 'otherDiagnosis',
    concept: MH_SCREENING.diagnosis,
    kind: 'coded',
    label: 'Other diagnosis',
    checkbox: true,
    options: [{ value: MH_SCREENING.other, label: 'Other' }],
    group: { concept: MH_SCREENING.otherDiagnosisGroup },
  },
  { name: 'otherDiagnosisText', concept: NON_CODED_TEXT, kind: 'text', label: 'Other diagnosis: specify', group: { concept: MH_SCREENING.otherDiagnosisGroup } },
  { name: 'intervention', concept: MH_SCREENING.intervention, kind: 'multi', label: 'Intervention', options: MH_SCREENING.interventions },
  {
    name: 'otherIntervention',
    concept: MH_SCREENING.intervention,
    kind: 'coded',
    label: 'Other intervention',
    checkbox: true,
    options: [{ value: MH_SCREENING.other, label: 'Other' }],
    group: { concept: MH_SCREENING.otherInterventionGroup },
  },
  { name: 'otherInterventionText', concept: NON_CODED_TEXT, kind: 'text', label: 'Other intervention: specify', group: { concept: MH_SCREENING.otherInterventionGroup } },
  { name: 'session', concept: MH_SCREENING.session, kind: 'coded', label: 'Session', options: MH_SCREENING.sessions },
  { name: 'sessionNotes', concept: MH_SCREENING.sessionNotes, kind: 'text', label: 'Session notes' },
  { name: 'outcome', concept: MH_SCREENING.outcome, kind: 'coded', label: 'Outcome', options: MH_SCREENING.outcomes, select: true },
  { name: 'outcomeDate', concept: MH_SCREENING.outcomeDate, kind: 'date', label: 'Outcome date' },
  { name: 'comments', concept: MH_SCREENING.comments, kind: 'text', label: 'Comments' },
  { name: 'nextAppointment', concept: MH_SCREENING.nextAppointment, kind: 'date', label: 'Next appointment', future: true, required: true },
];
