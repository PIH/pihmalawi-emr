import { NO, YES } from '../art/art-concepts';
import { type ArtField, type Option } from '../art/art-fields';
import { medicationFields } from '../mental-health/mh-fields';
import { EP_HEADER, EP_VISIT, NON_REACTIVE, OTHER, REACTIVE, TRIGGERS, UNKNOWN } from './ep-concepts';

const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];
const YES_NO_UNKNOWN: Array<Option> = [...YES_NO, { value: UNKNOWN, label: 'Unknown' }];
const REACTIVE_OPTIONS: Array<Option> = [
  { value: REACTIVE, label: 'Reactive' },
  { value: NON_REACTIVE, label: 'Non-reactive' },
  { value: UNKNOWN, label: 'Unknown' },
];

/** The header's sections, each shown in its own card on the Epilepsy page and edited in its own panel */
export type EpHeaderSection = 'seizureTypes' | 'familyHistory' | 'history' | 'exposures' | 'patientGuardian';

const question = (name: string, concept: string, label: string, options: Array<Option>): ArtField => ({ name, concept, kind: 'coded', label, options });

/** A checkbox per answer, each with its date, in its own obs group, as the form's exposures and complications are */
function datedGroups(
  prefix: string,
  groupConcept: string,
  answerConcept: string,
  dateConcept: string,
  answers: Array<{ key: string; answer: string; label: string }>,
): Array<ArtField> {
  return answers.flatMap((a) => {
    const group = { concept: groupConcept, match: { concept: answerConcept, value: a.answer } };
    const name = `${prefix}_${a.key}`;
    return [
      {
        name,
        concept: answerConcept,
        kind: 'coded' as const,
        label: a.label,
        checkbox: true,
        options: [{ value: a.answer, label: a.label }],
        group,
        // the form's Other answer has a comment field for what it was
        ...(a.answer === OTHER ? { comment: `${name}Comment` } : {}),
      },
      { name: `${name}Date`, concept: dateConcept, kind: 'date' as const, label: `${a.label}: date`, future: true, group },
    ];
  });
}

/** epilepsy-emastercard.xml's questions, by the card on the Epilepsy page that shows and edits them */
export const EP_HEADER_SECTIONS: Record<EpHeaderSection, { title: string; fields: Array<ArtField> }> = {
  seizureTypes: {
    title: 'Seizure Types',
    fields: EP_HEADER.seizureTypes.map((s) => question(`seizure_${s.key}`, s.concept, s.label, YES_NO)),
  },
  familyHistory: {
    title: 'Family History and HIV',
    fields: [
      question('familyEpilepsy', EP_HEADER.familyHistory.epilepsy, 'Family history: epilepsy', YES_NO_UNKNOWN),
      question('familyMentalIllness', EP_HEADER.familyHistory.mentalIllness, 'Family history: mental illness', YES_NO_UNKNOWN),
      question('familyBehaviour', EP_HEADER.familyHistory.behaviour, 'Family history: behavioural problems', YES_NO_UNKNOWN),
      question('hivStatus', EP_HEADER.hivStatus, 'HIV status', REACTIVE_OPTIONS),
      { name: 'hivTestDate', concept: EP_HEADER.hivTestDate, kind: 'date', label: 'HIV test date', future: true },
      { name: 'artStartDate', concept: EP_HEADER.artStartDate, kind: 'date', label: 'ART start date', future: true },
      question('vdrl', EP_HEADER.vdrl, 'VDRL', REACTIVE_OPTIONS),
    ],
  },
  history: {
    title: 'History at Enrolment',
    fields: [
      { name: 'onsetMonth', concept: EP_HEADER.onsetMonth, kind: 'number', label: 'Month of onset' },
      { name: 'onsetYear', concept: EP_HEADER.onsetYear, kind: 'number', label: 'Year of onset' },
      { name: 'ageAtOnset', concept: EP_HEADER.ageAtOnset, kind: 'number', label: 'Age at onset', unit: 'yrs' },
      { name: 'maritalStatus', concept: EP_HEADER.maritalStatus, kind: 'coded', label: 'Marital status', options: EP_HEADER.maritalStatuses, select: true },
      { name: 'occupation', concept: EP_HEADER.occupation, kind: 'coded', label: 'Occupation', options: EP_HEADER.occupations, select: true },
      { name: 'education', concept: EP_HEADER.education, kind: 'coded', label: 'Education level', options: EP_HEADER.educationLevels, select: true },
      { name: 'medicationHistory', concept: EP_HEADER.medicationHistory, kind: 'text', label: 'Medication history' },
      ...EP_HEADER.medicalHistory.map((h) => question(`medical_${h.key}`, h.concept, h.label, YES_NO_UNKNOWN)),
      question('preIctalWarning', EP_HEADER.preIctalWarning, 'Pre-ictal warning', YES_NO_UNKNOWN),
      ...EP_HEADER.postIctalFeatures.map((p) => question(`postIctal_${p.key}`, p.concept, `Post-ictal: ${p.label.toLowerCase()}`, YES_NO_UNKNOWN)),
    ],
  },
  exposures: {
    title: 'Exposures, Triggers and Complications',
    fields: [
      ...datedGroups('exposure', EP_HEADER.exposureGroup, EP_HEADER.exposure, EP_HEADER.exposureDate, EP_HEADER.exposures),
      ...TRIGGERS.map((tr) => question(`trigger_${tr.key}`, tr.answer, `Trigger: ${tr.label.toLowerCase()}`, YES_NO_UNKNOWN)),
      ...datedGroups('complication', EP_HEADER.complicationGroup, EP_HEADER.complication, EP_HEADER.complicationDate, EP_HEADER.complications),
    ],
  },
  patientGuardian: {
    title: 'Patient and Guardian Details',
    fields: [
      { name: 'transferInDate', concept: EP_HEADER.transferInDate, kind: 'date', label: 'Transfer-in date', future: true },
      { name: 'patientPhone', concept: EP_HEADER.patientPhone, kind: 'number', label: 'Patient phone' },
      { name: 'guardianName', concept: EP_HEADER.guardianName, kind: 'text', label: 'Guardian name' },
      { name: 'guardianPhone', concept: EP_HEADER.guardianPhone, kind: 'text', label: 'Guardian phone' },
      { name: 'guardianRelation', concept: EP_HEADER.relationToPatient, kind: 'text', label: 'Guardian relation to patient' },
      {
        name: 'agreesToFollowUp',
        concept: EP_HEADER.agreesToFollowUp,
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
};

/**
 * The card's diagnosis, epilepsy, which the form saves in a hidden obs group on every card; the header panel adds it
 * when it creates the card
 */
export const EP_DIAGNOSIS_FIELD: ArtField = {
  name: 'diagnosis',
  concept: EP_HEADER.diagnosis,
  kind: 'coded',
  label: 'Diagnosis',
  checkbox: true,
  options: [{ value: EP_HEADER.epilepsy, label: 'Epilepsy' }],
  group: { concept: EP_HEADER.diagnosisGroup },
};

/** The section the card is started with: what the legacy form requires on its first save, the follow-up agreement */
export const EP_START_SECTION: EpHeaderSection = 'patientGuardian';

export const EP_MEDICATIONS = EP_VISIT.medications;

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

/** epilepsy-visit.xml's questions, in its order (medications are medicationFields) */
export const EP_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: EP_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: EP_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  bmi: { name: 'bmi', concept: EP_VISIT.bmi, kind: 'coded', label: 'BMI', options: EP_VISIT.bmiAnswers },
  anySeizures: yesNo('anySeizures', EP_VISIT.anySeizures, 'Seizures since last visit'),
  numberOfSeizures: { name: 'numberOfSeizures', concept: EP_VISIT.numberOfSeizures, kind: 'number', label: 'Number of seizures' },
  anyTriggers: yesNo('anyTriggers', EP_VISIT.anyTriggers, 'Any triggers'),
  triggers: {
    name: 'triggers',
    concept: EP_VISIT.trigger,
    kind: 'multi',
    label: 'Seizure triggers',
    options: TRIGGERS.map((tr) => ({ value: tr.answer, label: tr.label })),
  },
  silentMarkers: { name: 'silentMarkers', concept: EP_VISIT.silentMarker, kind: 'multi', label: 'Silent markers', options: EP_VISIT.silentMarkers },
  hospitalised: yesNo('hospitalised', EP_VISIT.hospitalised, 'Hospitalised since last visit'),
  pregnant: { name: 'pregnant', concept: EP_VISIT.pregnant, kind: 'coded', label: 'Pregnant', checkbox: true, options: [{ value: YES, label: 'Yes' }] },
  familyPlanning: yesNo('familyPlanning', EP_VISIT.familyPlanning, 'On family planning'),
  comments: { name: 'comments', concept: EP_VISIT.comments, kind: 'text', label: 'Comment' },
  nextAppointment: { name: 'nextAppointment', concept: EP_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

export const EP_MEDICATION_FIELDS: Array<ArtField> = EP_MEDICATIONS.flatMap(medicationFields);
