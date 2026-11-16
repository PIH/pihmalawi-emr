import { HIE_FORMS } from './hie-concepts';
import { conditionPanelForEncounter } from './launch-pdc-condition-panel';
import { HIE_CONDITION } from './hie-condition';

const hiePanelForEncounter = (e: { encounterType: { uuid: string } }) => conditionPanelForEncounter([HIE_CONDITION], e)?.panel ?? null;

describe('conditionPanelForEncounter', () => {
  it('finds the panel by encounter type, whatever its case', () => {
    expect(hiePanelForEncounter({ encounterType: { uuid: HIE_FORMS.visit.encounterType.toUpperCase() } })).toBe('visit');
    expect(hiePanelForEncounter({ encounterType: { uuid: HIE_FORMS.labs.encounterType } })).toBe('labs');
    expect(hiePanelForEncounter({ encounterType: { uuid: HIE_FORMS.header.encounterType } })).toBe('header');
  });

  it('leaves a cleft lip / palate visit alone, though its form UUID is this visit encounter type', () => {
    expect(hiePanelForEncounter({ encounterType: { uuid: 'cfca0af9-86c9-4717-83b7-74e61f1a7bbf' } })).toBeNull();
  });
});

describe('pdcSharedFormOf', () => {
  it('finds the shared PDC form an encounter was saved by, by its encounter type', async () => {
    const { pdcSharedFormOf, PDC_SHARED_FORMS } = await import('./pdc-shared-forms');
    expect(pdcSharedFormOf({ encounterType: { uuid: PDC_SHARED_FORMS.radiology.encounterType.toUpperCase() } })).toBe('radiology');
    expect(pdcSharedFormOf({ encounterType: { uuid: HIE_FORMS.visit.encounterType } })).toBeNull();
  });
});
