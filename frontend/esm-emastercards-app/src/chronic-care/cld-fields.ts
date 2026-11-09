import { type ArtField } from '../art/art-fields';
import { type FieldValue } from '../art/obs-diff';
import { medicationFields } from '../mental-health/mh-fields';
import { datedGroups, NCD_HEADER, NCD_HIV_TB_FIELDS, NCD_PATIENT_GUARDIAN_FIELDS, question, YES_NO } from '../shared/ncd';
import { CLD_HEADER, CLD_PEAK_FLOW, CLD_VISIT, COPD } from './cld-concepts';
import { HTN_HOSPITALISATION_FIELDS } from './htn-fields';

/** The header's sections, each shown in its own card on the page and edited in its own panel */
export type CldHeaderSection = 'patientGuardian' | 'diagnoses' | 'history';

const has = (name: string) => (values: Record<string, FieldValue>) => !!values[name];

/** chronic-lung-disease-emastercard.xml's questions, by the card on the page that shows and edits them */
export const CLD_HEADER_SECTIONS: Record<CldHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: { title: 'Patient and Guardian Details', fields: NCD_PATIENT_GUARDIAN_FIELDS },
  diagnoses: {
    title: 'Diagnoses and Family History',
    fields: [
      // the form allows future diagnosis dates
      ...datedGroups('diagnosis', NCD_HEADER.diagnosisGroup, NCD_HEADER.diagnosis, NCD_HEADER.diagnosisDate, CLD_HEADER.diagnoses, { future: true }),
      question('familyAsthma', CLD_HEADER.familyAsthma, 'Family history: asthma', CLD_HEADER.familyHistoryAnswers),
      question('familyCopd', CLD_HEADER.familyCopd, 'Family history: COPD', CLD_HEADER.familyHistoryAnswers),
    ],
  },
  history: {
    title: 'Patient History and Exposures',
    fields: [
      ...NCD_HIV_TB_FIELDS,
      {
        name: 'dryCough',
        concept: CLD_HEADER.symptom,
        kind: 'coded',
        label: 'Chronic dry cough',
        checkbox: true,
        options: [{ value: CLD_HEADER.dryCough, label: 'Chronic dry cough' }],
      },
      // asked of the cough, once it is ticked
      {
        name: 'coughDuration',
        concept: CLD_HEADER.coughDuration,
        kind: 'number',
        label: 'Cough duration',
        unit: 'months',
        shownWhen: has('dryCough'),
      },
      { name: 'ageAtOnset', concept: CLD_HEADER.ageAtOnset, kind: 'number', label: 'Age at onset', unit: 'yrs', shownWhen: has('dryCough') },
      ...datedGroups('exposure', CLD_HEADER.exposureGroup, CLD_HEADER.exposure, CLD_HEADER.exposureDate, CLD_HEADER.exposures, {
        future: true,
        heading: 'Exposures',
      }),
      {
        name: 'cooking',
        concept: CLD_HEADER.cooking,
        kind: 'multi',
        label: 'Cooking',
        options: [
          { value: CLD_HEADER.indoors, label: 'Indoor' },
          { value: CLD_HEADER.outdoors, label: 'Outdoor' },
        ],
      },
      {
        name: 'smoking',
        concept: CLD_HEADER.smokingHistory,
        kind: 'coded',
        label: 'Smoking',
        checkbox: true,
        options: [{ value: CLD_HEADER.smokedInPast, label: 'Smoking' }],
      },
      { name: 'lastSmoked', concept: CLD_HEADER.lastSmoked, kind: 'date', label: 'Smoking: date', future: true, shownWhen: has('smoking') },
      { name: 'occupation', concept: CLD_HEADER.occupation, kind: 'coded', label: 'Occupation', options: CLD_HEADER.occupations, select: true },
    ],
  },
};

export const CLD_DIAGNOSES = CLD_HEADER_SECTIONS.diagnoses.fields.filter((f) => f.checkbox).map((f) => f.name);

export const CLD_MEDICATIONS = CLD_VISIT.medications;

/** The visit's medications, as the other NCD visits ask them, with puffs among the dose units */
export const CLD_MEDICATION_FIELDS: Array<ArtField> = CLD_MEDICATIONS.flatMap((m) =>
  medicationFields(m).map((f) => (f.name.endsWith('DoseUnit') ? { ...f, options: CLD_VISIT.doseUnits } : f)),
);

const yesNo = (name: string, concept: string, label: string): ArtField => question(name, concept, label, YES_NO);
const count = (name: string, concept: string, label: string, unit: string): ArtField => ({ name, concept, kind: 'number', label, unit });

/** chronic-lung-disease-visit.xml's questions, in its order (medications are CLD_MEDICATION_FIELDS) */
export const CLD_VISIT_FIELDS: Record<string, ArtField> = {
  plannedVisit: { name: 'plannedVisit', concept: CLD_VISIT.plannedVisit, kind: 'boolean', label: 'Planned visit' },
  height: { name: 'height', concept: CLD_VISIT.height, kind: 'number', label: 'Height', unit: 'cm', reference: 'readonly' },
  weight: { name: 'weight', concept: CLD_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg', reference: 'readonly' },
  daySymptoms: count('daySymptoms', CLD_VISIT.daySymptoms, 'Day symptoms', 'per week'),
  nightSymptoms: count('nightSymptoms', CLD_VISIT.nightSymptoms, 'Night symptoms', 'per week'),
  inhalerPerDay: count('inhalerPerDay', CLD_VISIT.inhalerPerDay, 'Beta-agonist inhaler: daily', 'per day'),
  inhalerPerWeek: count('inhalerPerWeek', CLD_VISIT.inhalerPerWeek, 'Beta-agonist inhaler: weekly', 'per week'),
  inhalerPerMonth: count('inhalerPerMonth', CLD_VISIT.inhalerPerMonth, 'Beta-agonist inhaler: monthly', 'per month'),
  inhalerPerYear: count('inhalerPerYear', CLD_VISIT.inhalerPerYear, 'Beta-agonist inhaler: yearly', 'per year'),
  steroidDaily: yesNo('steroidDaily', CLD_VISIT.steroidDaily, 'Steroid inhaler daily'),
  cigarettes: count('cigarettes', CLD_VISIT.cigarettes, 'Smoking', 'cigarettes per day'),
  passiveSmoking: yesNo('passiveSmoking', CLD_VISIT.passiveSmoking, 'Passive smoking'),
  indoorCooking: question('indoorCooking', CLD_VISIT.cooking, 'Indoor cooking', CLD_VISIT.indoorCookingAnswers),
  exacerbation: yesNo('exacerbation', CLD_VISIT.exacerbation, 'Exacerbation today'),
  asthmaSeverity: {
    name: 'asthmaSeverity',
    concept: CLD_VISIT.asthmaSeverity,
    kind: 'coded',
    label: 'Asthma severity',
    options: CLD_VISIT.severities,
    select: true,
  },
  copd: { name: 'copd', concept: CLD_VISIT.diagnosis, kind: 'coded', label: 'COPD', checkbox: true, options: [{ value: COPD, label: 'COPD' }] },
  otherDiagnosis: { name: 'otherDiagnosis', concept: CLD_VISIT.otherDiagnosis, kind: 'text', label: 'Other diagnosis' },
  comments: { name: 'comments', concept: CLD_VISIT.comments, kind: 'text', label: 'Comments' },
  nextAppointment: { name: 'nextAppointment', concept: CLD_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};

export const INHALER_FIELDS = ['inhalerPerDay', 'inhalerPerWeek', 'inhalerPerMonth', 'inhalerPerYear'].map((n) => CLD_VISIT_FIELDS[n]);

/** chronic-lung-disease-peak-flow.xml */
export const CLD_PEAK_FLOW_FIELDS: Array<ArtField> = [{ name: 'peakFlow', concept: CLD_PEAK_FLOW.result, kind: 'number', label: 'Peak flow result' }];

/** chronic-lung-disease-hospitalization.xml, which asks what the hypertension and diabetes one does */
export const CLD_HOSPITALISATION_FIELDS = HTN_HOSPITALISATION_FIELDS;
