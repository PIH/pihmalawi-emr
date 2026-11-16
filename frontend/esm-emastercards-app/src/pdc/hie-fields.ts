import { type ArtField } from '../art/art-fields';
import { NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { HIE_HEADER, HIE_LABS, HIE_VISIT } from './hie-concepts';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type HieHeaderSection = 'patientGuardian' | 'overview';

const yesNo = (name: string, concept: string, label: string, group?: ArtField['group']): ArtField => ({
  ...question(name, concept, label, YES_NO),
  ...(group ? { group } : {}),
});

/** A question asked in a group of its own, groups of one concept told apart by the question they hold */
const ownGroup = (groupConcept: string, concept: string) => ({ concept: groupConcept, match: { concept } });

/**
 * pdc-developmental-delay-emastercard.xml's questions, by the card on the page that shows and edits them. Its
 * conditions at enrolment are the PDC card's, which the page shows but this card doesn't save.
 */
export const HIE_HEADER_SECTIONS: Record<HieHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  overview: {
    title: 'Patient Overview',
    fields: [
      yesNo('geneticSyndromeSuspected', HIE_HEADER.suspected, 'Genetic syndrome: suspected', ownGroup(HIE_HEADER.geneticSyndromeGroup, HIE_HEADER.suspected)),
      yesNo('geneticSyndromeConfirmed', HIE_HEADER.confirmed, 'Genetic syndrome: confirmed', ownGroup(HIE_HEADER.geneticSyndromeGroup, HIE_HEADER.confirmed)),
    ],
  },
};

const asked = (items: Array<{ key: string; concept: string; label: string }>, groupConcept?: string): Record<string, ArtField> =>
  Object.fromEntries(items.map((i) => [i.key, yesNo(i.key, i.concept, i.label, groupConcept ? ownGroup(groupConcept, i.concept) : undefined)]));

const referredOut = { concept: HIE_VISIT.referredOutGroup };
const referredTo = { concept: HIE_VISIT.referredToGroup };

/**
 * developmental-delay-visit.xml's questions, in its order. Its height and weight are obsreference fields: a value
 * recorded the same day in another encounter is shown instead.
 */
export const HIE_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: HIE_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: HIE_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  muac: { name: 'muac', concept: HIE_VISIT.muac, kind: 'number', label: 'MUAC', unit: 'cm' },
  weightForAge: {
    name: 'weightForAge',
    concept: HIE_VISIT.numericValue,
    kind: 'number',
    label: 'Weight for age (W/A)',
    group: { concept: HIE_VISIT.weightForAgeGroup },
  },
  weightForHeight: {
    name: 'weightForHeight',
    concept: HIE_VISIT.numericValue,
    kind: 'number',
    label: 'Weight for height (W/H)',
    group: { concept: HIE_VISIT.weightForHeightGroup },
  },
  malnutrition: question('malnutrition', HIE_VISIT.malnutrition, 'Malnutrition', HIE_VISIT.malnutritionAnswers),
  mdatSummary: yesNo('mdatSummary', HIE_VISIT.mdatSummary, 'MDAT assessment summary normal'),
  ...asked(HIE_VISIT.tone, HIE_VISIT.toneGroup),
  ...asked(HIE_VISIT.feeding, HIE_VISIT.feedingGroup),
  signsOfCerebralPalsy: yesNo('signsOfCerebralPalsy', HIE_VISIT.signsOfCerebralPalsy, 'Signs of cerebral palsy'),
  underMentalHealthCare: yesNo('underMentalHealthCare', HIE_VISIT.underMentalHealthCare, 'Under mental health care'),
  anticonvulsants: yesNo('anticonvulsants', HIE_VISIT.anticonvulsants, 'Anticonvulsants'),
  drugAndDose: { name: 'drugAndDose', concept: HIE_VISIT.medicationDispensed, kind: 'text', label: 'Drug and dose' },
  doseAdjusted: yesNo('doseAdjusted', HIE_VISIT.doseAdjusted, 'Dose adjusted'),
  ...asked(HIE_VISIT.plan),
  referredOut: yesNo('referredOut', HIE_VISIT.referredOut, 'Referred out', referredOut),
  referredOutSpecify: { name: 'referredOutSpecify', concept: HIE_VISIT.otherText, kind: 'text', label: 'Referred out: specify', group: referredOut },
  referredTo: { ...question('referredTo', HIE_VISIT.referredOut, 'If referred out, to', HIE_VISIT.referredToAnswers), group: referredTo },
  referredToOther: { name: 'referredToOther', concept: HIE_VISIT.otherText, kind: 'text', label: 'If referred out, other: specify', group: referredTo },
  nextAppointment: { name: 'nextAppointment', concept: HIE_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

const F = HIE_VISIT_FIELDS;
export const HIE_TONE_FIELDS = HIE_VISIT.tone.map((x) => F[x.key]);
export const HIE_FEEDING_FIELDS = HIE_VISIT.feeding.map((x) => F[x.key]);
export const HIE_PLAN_FIELDS = HIE_VISIT.plan.map((x) => F[x.key]);

const tsh = { concept: HIE_LABS.tshGroup };
const otherTest = { concept: HIE_LABS.otherTestGroup };

/** hie-developmental-delay-lab-tests.xml: HB with its date, TSH and another test; it refuses future dates */
export const HIE_LAB_FIELDS: Array<ArtField> = [
  { name: 'hb', concept: HIE_LABS.hb, kind: 'number', label: 'HB', unit: 'g/dL', obsDate: 'hbDate' },
  { name: 'tshDate', concept: HIE_LABS.tshDate, kind: 'date', label: 'TSH: date', group: tsh },
  yesNo('tshDone', HIE_LABS.tshDone, 'TSH: done', tsh),
  yesNo('tshNormal', HIE_LABS.tshNormal, 'TSH: result normal', tsh),
  { name: 'otherTestDate', concept: HIE_LABS.otherTestDate, kind: 'date', label: 'Other test: date', group: otherTest },
  { name: 'otherTestType', concept: HIE_LABS.otherTestType, kind: 'text', label: 'Other test: type of test', group: otherTest },
  { name: 'otherTestResult', concept: HIE_LABS.otherTestResult, kind: 'text', label: 'Other test: result', group: otherTest },
];
