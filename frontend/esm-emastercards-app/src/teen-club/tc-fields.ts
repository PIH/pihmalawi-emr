import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { TC_HEADER, TC_VISIT } from './tc-concepts';

/** The header's one section, the intake / referral form's patient and guardian details */
export type TcHeaderSection = 'patientGuardian';

/** The age at intake in weeks or in months, each its own group of the unit and the number, as the form asks it */
const ageAtIntake = (key: 'weeks' | 'months', unit: string, label: string): Array<ArtField> => {
  const group = { concept: TC_HEADER.ageAtIntakeGroup, match: { concept: TC_HEADER.timeUnit, value: unit } };
  return [
    {
      name: `ageIn_${key}`,
      concept: TC_HEADER.timeUnit,
      kind: 'coded',
      label: `Age at intake in ${key}`,
      checkbox: true,
      options: [{ value: unit, label }],
      group,
    },
    { name: `ageIn_${key}Number`, concept: TC_HEADER.age, kind: 'number', label: `Age at intake: ${key}`, group },
  ];
};

const patientGuardian = (name: string) => NCD_PATIENT_GUARDIAN_FIELDS.find((f) => f.name === name);

/** teen-club-emastercard.xml's questions; it has no guardian name or phone, as the other cards do */
export const TC_HEADER_SECTIONS: Record<TcHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Patient and Guardian Details',
    fields: [
      patientGuardian('transferInDate'),
      ...ageAtIntake('weeks', TC_HEADER.weeks, 'Weeks'),
      ...ageAtIntake('months', TC_HEADER.months, 'Months'),
      patientGuardian('patientPhone'),
      patientGuardian('guardianRelation'),
      patientGuardian('agreesToFollowUp'),
    ],
  },
};

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);

/**
 * teen-club-visit.xml's questions, in its order. Its height, weight, MUAC/BMI and TB status are obsreference fields: a
 * value recorded the same day in another encounter, such as vitals or the ART visit, is shown instead; its next
 * appointment is one that may be changed.
 */
export const TC_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: TC_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: TC_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  muacBmi: { name: 'muacBmi', concept: TC_VISIT.muacBmi, kind: 'number', label: 'MUAC/BMI', reference: 'readonly' },
  tbStatus: {
    name: 'tbStatus',
    concept: TC_VISIT.tbStatus,
    kind: 'coded',
    label: 'TB status (current)',
    options: TC_VISIT.tbStatuses,
    reference: 'readonly',
  },
  tbScreeningOutcome: question('tbScreeningOutcome', TC_VISIT.tbScreeningOutcome, 'TB screening outcome', TC_VISIT.outcomes),
  sputumCollected: yesNo('sputumCollected', TC_VISIT.sputumCollected, 'Sputum collected'),
  muacNormal: yesNo('muacNormal', TC_VISIT.muacNormal, 'Nutrition screening outcome for MUAC normal'),
  nutritionReferral: yesNo('nutritionReferral', TC_VISIT.nutritionReferral, 'Nutrition referred'),
  mentalHealthScreened: yesNo('mentalHealthScreened', TC_VISIT.mentalHealthScreened, 'Mental health screened'),
  mentalHealthReferred: yesNo('mentalHealthReferred', TC_VISIT.mentalHealthReferred, 'Mental health referred'),
  mentalHealthRegistered: yesNo('mentalHealthRegistered', TC_VISIT.mentalHealthRegistered, 'Mental health registered'),
  stiScreeningOutcome: question('stiScreeningOutcome', TC_VISIT.stiScreeningOutcome, 'STI screening outcome', TC_VISIT.outcomes),
  stiReferral: yesNo('stiReferral', TC_VISIT.stiReferral, 'Referred to STI clinic'),
  hospitalised: yesNo('hospitalised', TC_VISIT.hospitalised, 'Hospitalised'),
  nextAppointment: {
    name: 'nextAppointment',
    concept: TC_VISIT.nextAppointment,
    kind: 'date',
    label: 'Next appointment',
    future: true,
    reference: 'override',
  },
};
