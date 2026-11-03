import { card } from '../test-cards';
import { findCardsForEncounter } from './find-cards-for-encounter';

const ART_VISIT_FORM = '64db7fd5-c28d-4b85-87c4-d01e92ae004a';
const ART_FOLLOWUP = '664b8650-977f-11e1-8993-905e29aff6c1';
const PDC_HOSPITALIZATION_FORM = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('findCardsForEncounter', () => {
  const art = card({ key: 'art', state: 'EDIT' });

  it('finds the card whose forms include the encounter form', () => {
    const encounter = { form: { uuid: ART_VISIT_FORM.toUpperCase() }, encounterType: { uuid: ART_FOLLOWUP } };
    expect(findCardsForEncounter(encounter, [art]).map((c) => c.key)).toEqual(['art']);
  });

  it('finds every card a shared form belongs to', () => {
    const delay = card({ key: 'pdc-developmental-delay', state: 'EDIT', formUuids: [PDC_HOSPITALIZATION_FORM] });
    const trisomy = card({ key: 'pdc-trisomy', state: 'VIEW', formUuids: [PDC_HOSPITALIZATION_FORM] });
    const encounter = { form: { uuid: PDC_HOSPITALIZATION_FORM }, encounterType: { uuid: 'pdc-type' } };
    expect(findCardsForEncounter(encounter, [art, delay, trisomy]).map((c) => c.key)).toEqual([
      'pdc-developmental-delay',
      'pdc-trisomy',
    ]);
  });

  it('falls back to the encounter type for an encounter without a known form', () => {
    const encounter = { form: null, encounterType: { uuid: ART_FOLLOWUP } };
    expect(findCardsForEncounter(encounter, [art]).map((c) => c.key)).toEqual(['art']);
  });

  it('only offers cards the patient already has', () => {
    const encounter = { form: { uuid: ART_VISIT_FORM }, encounterType: { uuid: ART_FOLLOWUP } };
    expect(findCardsForEncounter(encounter, [card({ state: 'UNAVAILABLE' }), card({ state: 'CREATE' })])).toEqual([]);
  });
});
