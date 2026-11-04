import {
  ART_INITIAL,
  ART_VISIT,
  CURRENTLY_LACTATING,
  CURRENTLY_PREGNANT,
  NEGATIVE,
  NO,
  POSITIVE,
  REGIMENS,
  YES,
} from './art-concepts';
import { type FieldSpec } from './obs-diff';

export interface Option {
  value: string;
  label: string;
}

/** A question as a panel asks it and the HIV care page shows it */
export interface ArtField extends FieldSpec {
  label: string;
  options?: Array<Option>;
  /** Asked only for female patients, as the forms' includeIf on gender does */
  femaleOnly?: boolean;
  required?: boolean;
  unit?: string;
  /** Future dates allowed (the forms' allowFutureDates) */
  future?: boolean;
}

export const REGIMEN_OPTIONS: Array<Option> = REGIMENS.map((r) => ({ value: r.uuid, label: r.label }));
const YES_NO: Array<Option> = [
  { value: YES, label: 'Yes' },
  { value: NO, label: 'No' },
];

/** The CPT/IPT drugs of the ART visit, each saved as its own obs group */
export const PREVENTIVE_THERAPIES: Array<{ key: string; drug: string; label: string }> = [
  { key: 'ctx', drug: ART_VISIT.preventiveTherapies.ctx, label: 'CTX 960' },
  { key: 'inh', drug: ART_VISIT.preventiveTherapies.inh, label: 'INH 300' },
  { key: 'rfp', drug: ART_VISIT.preventiveTherapies.rfp, label: 'RFP 150' },
  { key: 'threeHp', drug: ART_VISIT.preventiveTherapies.threeHp, label: 'RFP/INH (3HP)' },
  { key: 'pyridoxine', drug: ART_VISIT.preventiveTherapies.pyridoxine, label: 'Pyridoxine' },
];

export const TB_STATUS_OPTIONS: Array<Option> = [
  { value: ART_VISIT.tbStatusAnswers.notSuspected, label: 'TB not suspected' },
  { value: ART_VISIT.tbStatusAnswers.suspected, label: 'TB suspected' },
  { value: ART_VISIT.tbStatusAnswers.confirmedNoRx, label: 'Confirmed TB, not on Rx' },
  { value: ART_VISIT.tbStatusAnswers.confirmedRx, label: 'Confirmed TB, on Rx' },
];

/** The form's short labels, with what they stand for */
export const SIDE_EFFECT_OPTIONS: Array<Option & { title: string }> = [
  { value: ART_VISIT.sideEffectAnswers.no, label: 'No', title: 'No side effects' },
  { value: ART_VISIT.sideEffectAnswers.pn, label: 'PN', title: 'Peripheral neuropathy' },
  { value: ART_VISIT.sideEffectAnswers.hp, label: 'HP', title: 'Hepatitis' },
  { value: ART_VISIT.sideEffectAnswers.sk, label: 'SK', title: 'Skin rash' },
  { value: ART_VISIT.sideEffectAnswers.lip, label: 'Lip', title: 'Lipodystrophy' },
  { value: ART_VISIT.sideEffectAnswers.other, label: 'Oth', title: 'Other (specify in notes)' },
];

export const PREGNANT_LACTATING_OPTIONS: Array<Option> = [
  { value: CURRENTLY_PREGNANT, label: 'Preg' },
  { value: CURRENTLY_LACTATING, label: 'Bf' },
];

/** art-visit.xml's questions, in its order */
export const ART_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: ART_VISIT.height, kind: 'number', reference: 'override', label: 'Height', unit: 'cm' },
  weight: { name: 'weight', concept: ART_VISIT.weight, kind: 'number', reference: 'override', label: 'Weight', unit: 'kg' },
  systolicBp: { name: 'systolicBp', concept: ART_VISIT.systolicBp, kind: 'number', reference: 'readonly', label: 'Systolic BP', unit: 'mmHg' },
  diastolicBp: { name: 'diastolicBp', concept: ART_VISIT.diastolicBp, kind: 'number', reference: 'readonly', label: 'Diastolic BP', unit: 'mmHg' },
  pregnantLactating: {
    name: 'pregnantLactating',
    concept: ART_VISIT.pregnantLactating,
    kind: 'multi',
    label: 'Pregnant / breastfeeding',
    options: PREGNANT_LACTATING_OPTIONS,
    femaleOnly: true,
  },
  tbStatus: { name: 'tbStatus', concept: ART_VISIT.tbStatus, kind: 'coded', label: 'TB status', options: TB_STATUS_OPTIONS },
  sideEffects: { name: 'sideEffects', concept: ART_VISIT.sideEffects, kind: 'multi', label: 'Side effects (current)', options: SIDE_EFFECT_OPTIONS },
  pillCount: { name: 'pillCount', concept: ART_VISIT.pillCount, kind: 'number', label: 'Pill count' },
  dosesMissed: { name: 'dosesMissed', concept: ART_VISIT.dosesMissed, kind: 'number', label: 'Doses missed' },
  artRegimen: { name: 'artRegimen', concept: ART_VISIT.artRegimen, kind: 'coded', label: 'ART regimen', options: REGIMEN_OPTIONS, required: true },
  numArvsGiven: { name: 'numArvsGiven', concept: ART_VISIT.numArvsGiven, kind: 'number', label: 'ARVs given (tablets)', required: true },
  arvsGivenTo: { name: 'arvsGivenTo', concept: ART_VISIT.arvsGivenTo, kind: 'boolean', label: 'Given to' },
  nextAppointment: { name: 'nextAppointment', concept: ART_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', required: true, future: true },
};

/** The CPT/IPT obs groups' fields: the drug (as the status answer) and its number of pills */
export const PREVENTIVE_THERAPY_FIELDS: Array<ArtField> = PREVENTIVE_THERAPIES.flatMap((p) => {
  const group = { concept: ART_VISIT.preventiveTherapyGroup, match: { concept: ART_VISIT.preventiveTherapyStatus, value: p.drug } };
  return [
    { name: `${p.key}Status`, concept: ART_VISIT.preventiveTherapyStatus, kind: 'coded' as const, label: p.label, group },
    { name: `${p.key}Pills`, concept: ART_VISIT.preventiveTherapyPills, kind: 'number' as const, label: `${p.label} pills`, group },
  ];
});

export type InitialSection = 'status' | 'confirmatoryTest' | 'patientGuardian' | 'regimens';

const init = (name: string, kind: ArtField['kind'], label: string, extra: Partial<ArtField> = {}): ArtField => ({
  name,
  concept: ART_INITIAL[name],
  kind,
  label,
  ...extra,
});

/** art-emastercard.xml's questions, by the card on the HIV care page that shows and edits them */
export const INITIAL_SECTIONS: Record<InitialSection, { title: string; fields: Array<ArtField> }> = {
  status: {
    title: 'Status at ART initiation',
    fields: [
      init('hivRelatedDiseases', 'text', 'HIV-related diseases'),
      init('urineLamCrag', 'coded', 'Urine LAM / CrAg result', {
        options: [
          { value: POSITIVE, label: 'Positive' },
          { value: NEGATIVE, label: 'Negative' },
        ],
      }),
      init('whoStage', 'coded', 'WHO stage', {
        options: [
          { value: ART_INITIAL.whoStageAnswers.stage1, label: 'Stage 1' },
          { value: ART_INITIAL.whoStageAnswers.stage2, label: 'Stage 2' },
          { value: ART_INITIAL.whoStageAnswers.stage3, label: 'Stage 3' },
          { value: ART_INITIAL.whoStageAnswers.stage4, label: 'Stage 4' },
        ],
      }),
      init('presumedSevereHiv', 'coded', 'Presumed severe HIV', { options: [{ value: YES, label: 'Yes' }] }),
      init('ks', 'boolean', 'KS'),
      init('tbStatus', 'coded', 'TB status at initiation', {
        options: [
          { value: ART_INITIAL.tbStatusAnswers.never, label: 'Never' },
          { value: ART_INITIAL.tbStatusAnswers.last, label: 'Last' },
          { value: ART_INITIAL.tbStatusAnswers.current, label: 'Current' },
        ],
      }),
      init('pregnantLactating', 'coded', 'Pregnant / breastfeeding', {
        options: [{ value: NO, label: 'No' }, ...PREGNANT_LACTATING_OPTIONS],
        femaleOnly: true,
      }),
      init('cd4Count', 'number', 'CD4 count'),
      init('cd4Percent', 'number', 'CD4 %'),
      init('cd4Date', 'date', 'CD4 date'),
      init('height', 'number', 'Height', { reference: 'readonly', unit: 'cm' }),
      init('weight', 'number', 'Weight', { reference: 'readonly', unit: 'kg' }),
      init('everTakenArvs', 'coded', 'Ever taken ARVs', { options: YES_NO }),
      init('ageAtInitiation', 'number', 'Age at initiation', { unit: 'yrs' }),
      init('lastArvsTaken', 'text', 'Last ARVs taken'),
      init('lastArvsDate', 'date', 'Last ARVs date'),
      init('transferInDate', 'date', 'Transfer-in date', { future: true }),
      init('childHccNumber', 'text', 'Child HCC no.'),
      init('tbRegistrationNumber', 'text', 'TB registration no.'),
      init('tbTreatmentStartDate', 'date', 'TB treatment start'),
    ],
  },
  confirmatoryTest: {
    title: 'Confirmatory HIV test',
    fields: [
      init('confirmatoryTestLocation', 'text', 'Facility'),
      init('linkId', 'text', 'Link ID / HTC serial no.'),
      init('confirmatoryTestDate', 'date', 'Test date'),
      init('confirmatoryTestType', 'coded', 'Test type', {
        options: [
          { value: ART_INITIAL.confirmatoryTestTypeAnswers.rapid, label: 'Rapid' },
          { value: ART_INITIAL.confirmatoryTestTypeAnswers.pcr, label: 'PCR' },
        ],
      }),
      init('artEducationDone', 'coded', 'ART education done', { options: YES_NO }),
      init('artEducationDate', 'date', 'ART education date', { future: true }),
    ],
  },
  patientGuardian: {
    title: 'Patient and guardian',
    fields: [
      init('patientPhone', 'text', 'Patient phone'),
      init('guardianName', 'text', 'Guardian name'),
      init('guardianPhone', 'text', 'Guardian phone'),
      init('guardianRelation', 'text', 'Guardian relation to patient'),
      init('agreesToFollowUp', 'coded', 'Agrees to follow-up', { options: YES_NO, required: true }),
    ],
  },
  regimens: {
    title: 'ART regimens at initiation',
    fields: ART_INITIAL.regimens.flatMap((slot, i) => {
      const label = ['First line', 'Alternative first line', 'Second line'][i];
      return [
        { name: `regimen${i + 1}`, concept: slot.regimen, kind: 'coded' as const, label, options: REGIMEN_OPTIONS },
        { name: `regimen${i + 1}Start`, concept: slot.startDate, kind: 'date' as const, label: `${label} start date`, future: true },
      ];
    }),
  },
};

/** A field's value as the page shows it */
export function displayValue(field: ArtField, value: unknown): string | null {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) {
    return null;
  }
  if (field.kind === 'boolean') {
    return value === true || value === 'true' ? 'Yes' : 'No';
  }
  if (field.options) {
    const values = (Array.isArray(value) ? value : [value]).map((v) => String(v).toLowerCase());
    return values.map((v) => field.options.find((o) => o.value.toLowerCase() === v)?.label ?? v).join(', ');
  }
  if (field.kind === 'date') {
    return formatDay(String(value));
  }
  return [String(value), field.unit].filter(Boolean).join(' ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A date as the chart shows dates, e.g. 04-Nov-2026 */
export function formatDay(date: string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  const [y, m, d] = String(date).slice(0, 10).split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}
