import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question } from '../shared/ncd';
import { CNS_INFECTION, MONTHS, OTHER_DIAGNOSIS, PDC_CONDITIONS, PDC_HEADER as H, WEEKS, YES, YES_NO } from './pdc-concepts';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type PdcHeaderSection = 'patientGuardian' | 'caretaker' | 'referral' | 'hivServices' | 'history' | 'conditions' | 'summary';

const common = (name: string) => NCD_PATIENT_GUARDIAN_FIELDS.find((f) => f.name === name);

/** The age at intake: one group per unit, the unit ticked and the number, as the form's two checkboxes save it */
const ageAtIntake = (key: 'weeks' | 'months', unit: string, label: string, heading?: string): Array<ArtField> => {
  const group = { concept: H.ageAtIntakeGroup, match: { concept: H.timeUnits, value: unit } };
  return [
    {
      name: `ageAtIntake_${key}Unit`,
      concept: H.timeUnits,
      kind: 'coded',
      label,
      checkbox: true,
      options: [{ value: unit, label }],
      group,
      ...(heading ? { heading } : {}),
    },
    { name: `ageAtIntake_${key}`, concept: H.ageOfChild, kind: 'number', label: `Age at intake (${key})`, group },
  ];
};

/** Each reason for referral ticked is its own group; CNS infection and Other are specified in the reason's comment */
const referralReasons: Array<ArtField> = PDC_CONDITIONS.map((c, i) => ({
  name: `reason_${c.key}`,
  concept: H.reasonForReferral,
  kind: 'coded',
  label: c.label,
  checkbox: true,
  options: [{ value: c.value, label: c.label }],
  group: { concept: H.reasonForReferralGroup, match: { concept: H.reasonForReferral, value: c.value } },
  ...([CNS_INFECTION, OTHER_DIAGNOSIS].includes(c.value) ? { comment: `reason_${c.key}Specify` } : {}),
  ...(i === 0 ? { heading: 'Reasons for referral' } : {}),
}));

const motherHiv = { concept: H.motherHivGroup };
const childHiv = { concept: H.childHivGroup };
const perinatal = { concept: H.perinatalInfectionGroup };
const antibiotics = { concept: H.antibioticsGroup };

/** Whether an answer is Yes */
const yes = (value: unknown) => String(value ?? '').toLowerCase() === YES;

/** pdc-emastercard.xml's questions, by the card on the page that shows and edits them */
export const PDC_HEADER_SECTIONS: Record<PdcHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Patient and Guardian Details',
    fields: [
      common('transferInDate'),
      common('patientPhone'),
      common('guardianName'),
      common('guardianPhone'),
      common('guardianRelation'),
      common('agreesToFollowUp'),
      ...ageAtIntake('weeks', WEEKS, 'Weeks', 'Age at intake'),
      ...ageAtIntake('months', MONTHS, 'Months'),
    ],
  },
  caretaker: {
    title: 'Caretaker Details',
    fields: [
      { name: 'guardianAge', concept: H.ageOfGuardian, kind: 'number', label: 'Guardian age', unit: 'years' },
      question('maritalStatus', H.maritalStatus, 'Marital status', H.maritalStatuses),
      question('educationLevel', H.educationLevel, 'Level of education', H.educationLevels),
      { name: 'numberOfChildren', concept: H.numberOfChildren, kind: 'number', label: 'Number of children' },
      { name: 'incomeSource', concept: H.incomeSource, kind: 'text', label: 'Income source' },
    ],
  },
  referral: {
    title: 'Referral',
    fields: [
      { ...question('sourceOfReferral', H.sourceOfReferral, 'Source of referral', H.sourcesOfReferral), group: { concept: H.sourceOfReferralGroup } },
      question('referralFormFilled', H.referralFormFilled, 'Referral form filled', YES_NO),
      question('eligibleForPoser', H.eligibleForPoser, 'Eligible for POSER', YES_NO),
      ...referralReasons,
    ],
  },
  hivServices: {
    title: 'HIV Services',
    fields: [
      { ...question('motherHivStatus', H.hivStatus, 'Mother: HIV status', H.hivStatuses), group: motherHiv },
      { ...question('motherArt', H.motherArt, 'Mother: if reactive, ART', H.artStatuses), group: motherHiv },
      { ...question('childHivStatus', H.hivStatus, 'Child: HIV status', H.hivStatuses), group: childHiv },
      { ...question('childArt', H.childArt, 'Child: if reactive, ART', H.artStatuses), group: childHiv },
    ],
  },
  history: {
    title: 'History of Illness and Feeding',
    fields: [
      question('siteOfBirth', H.siteOfBirth, 'Birth site', H.sitesOfBirth),
      { name: 'modeOfDelivery', concept: H.modeOfDelivery, kind: 'multi', label: 'Mode of delivery', options: H.modesOfDelivery },
      { ...question('perinatalInfection', H.perinatalInfection, 'Perinatal infection', YES_NO), group: perinatal },
      { name: 'perinatalInfectionSpecify', concept: H.otherText, kind: 'text', label: 'Perinatal infection: specify', group: perinatal },
      { ...question('antibiotics', H.antibiotics, 'Antibiotics', YES_NO), group: antibiotics },
      { ...question('antibioticsDuration', H.antibioticsDuration, 'Antibiotics: duration', H.antibioticsDurations), group: antibiotics },
      { name: 'typeOfFeed', concept: H.typeOfFeed, kind: 'multi', label: 'Type of feed', options: H.typesOfFeed, group: { concept: H.feedGroup } },
      { name: 'feedingMethod', concept: H.feedingMethod, kind: 'multi', label: 'Feeding method', options: H.feedingMethods },
      { name: 'otherFeedingMethod', concept: H.otherText, kind: 'text', label: 'Other feeding method', group: { concept: H.otherFeedingGroup } },
    ],
  },
  conditions: {
    title: 'Conditions at Enrolment',
    fields: [
      {
        name: 'conditions',
        concept: H.diagnosis,
        kind: 'multi',
        label: 'Conditions',
        options: PDC_CONDITIONS.map(({ value, label }) => ({ value, label })),
        comments: [
          { answer: CNS_INFECTION, key: 'conditionCnsSpecify' },
          { answer: OTHER_DIAGNOSIS, key: 'conditionOtherSpecify' },
        ],
      },
      question('currentMedication', H.currentMedication, 'Current medication', YES_NO),
      {
        name: 'drugs',
        concept: H.drugs,
        kind: 'text',
        label: 'Current medication: specify',
        shownWhen: (values) => yes(values.currentMedication),
      },
    ],
  },
  summary: {
    title: 'Summary',
    fields: [
      question('enrolledInPdc', H.enrolledInPdc, 'Enrolled in PDC', YES_NO),
      // the form shows the date only once Enrolled is Yes, and clears it otherwise
      {
        name: 'dateOfEnrollment',
        concept: H.dateOfEnrollment,
        kind: 'date',
        label: 'Date of enrolment',
        shownWhen: (values) => yes(values.enrolledInPdc),
      },
      question('careLinked', H.careLinked, 'Care linked', YES_NO),
      { name: 'linkedTo', concept: H.linkedTo, kind: 'multi', label: 'Linked to', options: H.linkedToAnswers },
      { name: 'otherSupport', concept: H.otherSupport, kind: 'text', label: 'Other support' },
      { name: 'notes', concept: H.notes, kind: 'text', label: 'Notes' },
    ],
  },
};

/** Every question the header asks */
export const PDC_HEADER_FIELDS: Array<ArtField> = Object.values(PDC_HEADER_SECTIONS).flatMap((s) => s.fields);
