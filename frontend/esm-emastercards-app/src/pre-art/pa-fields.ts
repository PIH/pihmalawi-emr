import { type ArtField } from '../art/art-fields';
import { question } from '../shared/ncd';
import { PA_HEADER, PA_VISIT, YES, YES_NO } from './pa-concepts';

/** The header's sections, each shown in its own card on the page */
export type PaHeaderSection = 'patientGuardian' | 'status';

const H = PA_HEADER;

/** pre-art-emastercard.xml's questions, by the card on the page that shows them */
export const PA_HEADER_SECTIONS: Record<PaHeaderSection, { title: string; fields: Array<ArtField> }> = {
  patientGuardian: {
    title: 'Patient / Guardian Details',
    fields: [
      { name: 'guardianName', concept: H.guardianName, kind: 'text', label: 'Guardian name' },
      { name: 'guardianPhone', concept: H.guardianPhone, kind: 'text', label: 'Guardian phone' },
      { name: 'patientPhone', concept: H.patientPhone, kind: 'text', label: 'Patient phone' },
      question('agreesToFollowUp', H.agreesToFollowUp, 'Agrees to follow-up', YES_NO),
      { name: 'guardianRelation', concept: H.guardianRelation, kind: 'text', label: 'Guardian relation to patient' },
      { name: 'chwName', concept: H.chwName, kind: 'text', label: 'CHW name' },
    ],
  },
  status: {
    title: 'Status at Enrolment',
    fields: [
      { name: 'testSite', concept: H.testSite, kind: 'text', label: 'Confirmatory HIV test: site / HTC serial no' },
      { name: 'testDate', concept: H.testDate, kind: 'date', label: 'Confirmatory HIV test: date' },
      question('testType', H.testType, 'Confirmatory HIV test: type', H.testTypes),
      { name: 'clinicalConditions', concept: H.clinicalConditions, kind: 'text', label: 'Clinical conditions' },
      question('whoStage', H.whoStage, 'WHO stage', H.whoStages),
      { name: 'age', concept: H.age, kind: 'number', label: 'Age', unit: 'years' },
      question('everIpt', H.everIpt, 'Ever taken IPT', YES_NO),
      { name: 'iptDate', concept: H.iptDate, kind: 'date', label: 'IPT: date last taken' },
      question('everTbTreatment', H.everTbTreatment, 'Ever taken TB treatment', YES_NO),
      { name: 'tbStartDate', concept: H.tbStartDate, kind: 'date', label: 'TB treatment: start date' },
      { name: 'tbRegistrationNumber', concept: H.tbRegistrationNumber, kind: 'text', label: 'TB registration number' },
      question('everArvs', H.everArvs, 'Ever taken any ARVs', YES_NO),
      { name: 'lastArvsDate', concept: H.lastArvsDate, kind: 'date', label: 'ARVs: date last taken' },
      { name: 'lastArvsTaken', concept: H.lastArvsTaken, kind: 'text', label: 'ARV type' },
    ],
  },
};

const ticked = (name: string, concept: string, label: string): ArtField => ({
  ...question(name, concept, label, [{ value: YES, label: 'Yes' }]),
  checkbox: true,
});

/** pre-art-visit.xml's questions, in its order */
export const PA_VISIT_FIELDS: Record<string, ArtField> = {
  height: { name: 'height', concept: PA_VISIT.height, kind: 'number', label: 'Height', unit: 'cm' },
  weight: { name: 'weight', concept: PA_VISIT.weight, kind: 'number', label: 'Weight', unit: 'kg' },
  wasting: question('wasting', PA_VISIT.wasting, 'Wasting/malnutrition', PA_VISIT.wastingAnswers),
  tbStatus: question('tbStatus', PA_VISIT.tbStatus, 'TB status', PA_VISIT.tbStatuses),
  whoStage: question('whoStage', PA_VISIT.whoStage, 'WHO stage', PA_VISIT.whoStages),
  cd4SampleTaken: ticked('cd4SampleTaken', PA_VISIT.cd4SampleTaken, 'CD4 bled'),
  cd4: { name: 'cd4', concept: PA_VISIT.cd4, kind: 'number', label: 'CD4' },
  pregnant: question('pregnant', PA_VISIT.pregnant, 'Pregnant', YES_NO),
  ipt: { name: 'ipt', concept: PA_VISIT.ipt, kind: 'number', label: 'IPT', unit: 'tablets' },
  cpt: { name: 'cpt', concept: PA_VISIT.cpt, kind: 'number', label: 'CPT', unit: 'tablets' },
  depoGiven: ticked('depoGiven', PA_VISIT.depoGiven, 'Depo given'),
  condoms: { name: 'condoms', concept: PA_VISIT.condoms, kind: 'number', label: 'Condoms' },
  sideEffects: { name: 'sideEffects', concept: PA_VISIT.sideEffects, kind: 'multi', label: 'Side effects', options: PA_VISIT.sideEffectAnswers },
  nextAppointment: { name: 'nextAppointment', concept: PA_VISIT.nextAppointment, kind: 'date', label: 'Next appointment', future: true },
};
