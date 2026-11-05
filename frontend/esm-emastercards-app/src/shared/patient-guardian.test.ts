import { type ArtEncounter } from '../art/art.resource';
import { type ArtField } from '../art/art-fields';
import { carryOver, PATIENT_GUARDIAN_CONCEPTS, pickPatientGuardian } from './patient-guardian';

const header = (uuid: string, date: string, obs: Array<[string, unknown]>): ArtEncounter => ({
  uuid,
  encounterDatetime: date,
  location: null,
  visit: null,
  form: null,
  obs: obs.map(([concept, value], i) => ({ uuid: `${uuid}-${i}`, obsDatetime: date, concept, value: value as any })),
});

describe('pickPatientGuardian', () => {
  it("takes each answer from the most recently started card that has one, whichever concept that card uses", () => {
    const carried = pickPatientGuardian([
      { card: 'ART eMastercard', encounter: header('a', '2024-01-01', [[PATIENT_GUARDIAN_CONCEPTS.patientPhone[0], '0999'], [PATIENT_GUARDIAN_CONCEPTS.guardianName[0], 'Old']]) },
      { card: 'Mental Health eMastercard', encounter: header('m', '2026-01-01', [[PATIENT_GUARDIAN_CONCEPTS.guardianName[0], 'New']]) },
    ]);
    expect(carried).toEqual({
      patientPhone: { value: '0999', from: 'ART eMastercard' },
      guardianName: { value: 'New', from: 'Mental Health eMastercard' },
    });
  });
});

describe('carryOver', () => {
  const fields: Array<ArtField> = [
    { name: 'patientPhone', concept: 'c1', kind: 'number', label: 'Patient phone' },
    { name: 'guardianName', concept: 'c2', kind: 'text', label: 'Guardian name' },
    { name: 'agreesToFollowUp', concept: 'c3', kind: 'coded', label: 'Agrees', options: [{ value: 'yes-uuid', label: 'Yes' }] },
  ];

  it('fills only the empty fields, as each field takes the value', () => {
    const result = carryOver(fields, { patientPhone: null, guardianName: 'Mine', agreesToFollowUp: null }, {
      patientPhone: { value: '0888-123', from: 'ART eMastercard' },
      guardianName: { value: 'Theirs', from: 'ART eMastercard' },
      agreesToFollowUp: { value: 'not-an-option', from: 'ART eMastercard' },
    });
    expect(result.values).toEqual({ patientPhone: 888123, guardianName: 'Mine', agreesToFollowUp: null });
    expect(result.filled.map((f) => f.name)).toEqual(['patientPhone']);
    expect(result.from).toEqual(['ART eMastercard']);
  });
});
