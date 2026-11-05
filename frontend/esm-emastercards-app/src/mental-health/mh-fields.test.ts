import { buildObsPayload } from '../art/obs-diff';
import { CURRENT, EXPOSURE, MH_HEADER, MH_VISIT } from './mh-concepts';
import { MEDICATIONS, medicationFields, MH_HEADER_SECTIONS, MH_VISIT_FIELDS, MSE_FINDINGS } from './mh-fields';
import { obs } from './test-mh-data';

const SCHIZO = MH_HEADER.diagnoses[0].answer;
const exposures = MH_HEADER_SECTIONS.historyExposures.fields;

describe('mental health fields', () => {
  it('header sections', () => {
    const dx = MH_HEADER_SECTIONS.diagnoses.fields.filter((f) => f.checkbox);
    expect(dx).toHaveLength(21);
    expect(dx[0].label).toBe('Schizophrenia');
    expect(dx.slice(-2).map((f) => f.label)).toEqual(['Other', 'Other']);
    expect(MH_HEADER_SECTIONS.presentingFeatures.fields.filter((f) => f.checkbox)).toHaveLength(6);
    expect(MSE_FINDINGS).toHaveLength(8);
    expect(MEDICATIONS).toHaveLength(13);
    expect(MEDICATIONS[12].key).toBe('other');
  });

  it('diagnosis group payloads', () => {
    const fields = MH_HEADER_SECTIONS.diagnoses.fields;
    const added = buildObsPayload(fields, { dx_schizophrenia: SCHIZO, dx_schizophreniaDate: '2025-03-12' }, [], {});
    expect(added).toEqual({
      add: [
        {
          concept: MH_HEADER.diagnosisGroup,
          groupMembers: [
            { concept: MH_HEADER.diagnosis, value: SCHIZO },
            { concept: MH_HEADER.diagnosisDate, value: '2025-03-12' },
          ],
        },
      ],
      void: [],
    });
    const existing = [obs(MH_HEADER.diagnosisGroup, null, [obs(MH_HEADER.diagnosis, SCHIZO), obs(MH_HEADER.diagnosisDate, '2025-03-12')])];
    expect(buildObsPayload(fields, { dx_schizophrenia: null, dx_schizophreniaDate: null }, existing, {})).toEqual({
      add: [],
      void: [existing[0].uuid],
    });
  });

  it('keeps unasked members', () => {
    const existing = [obs(EXPOSURE.otherDrugsGroup, null, [obs(EXPOSURE.history, CURRENT), obs('concept-x', 'kept')])];
    const payload = buildObsPayload(exposures, { otherDrugs: CURRENT, otherDrugsYears: 3 }, existing, {});
    expect(payload.void).toEqual([existing[0].uuid]);
    expect(payload.add[0].groupMembers).toEqual(
      expect.arrayContaining([
        { concept: EXPOSURE.years, value: 3 },
        { concept: 'concept-x', value: 'kept' },
      ]),
    );
  });

  it('medication group', () => {
    const ris = MEDICATIONS.find((m) => m.key === 'ris');
    const mg = MH_VISIT.doseUnits[0].value;
    const bid = MH_VISIT.frequencies[1].value;
    const payload = buildObsPayload(medicationFields(ris), { med_ris: ris.drug, med_risDose: 2, med_risDoseUnit: mg, med_risFrequency: bid }, [], {});
    expect(payload.add).toEqual([
      {
        concept: MH_VISIT.dispensingGroup,
        groupMembers: [
          { concept: MH_VISIT.medication, value: ris.drug },
          { concept: MH_VISIT.dose, value: 2 },
          { concept: MH_VISIT.doseUnit, value: mg },
          { concept: MH_VISIT.frequency, value: bid },
        ],
      },
    ]);
  });

  it('current use other drugs carries its comment', () => {
    const payload = buildObsPayload([MH_VISIT_FIELDS.useOtherDrugs], { useOtherDrugs: CURRENT, useOtherDrugsComment: 'kachasu' }, [], {});
    expect(payload.add).toEqual([
      { concept: EXPOSURE.otherDrugsGroup, groupMembers: [{ concept: EXPOSURE.history, value: CURRENT, comment: 'kachasu' }] },
    ]);
  });
});
