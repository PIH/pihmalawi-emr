import { ART_FORMS } from '../art/art-concepts';
import { MH_FORMS } from './mh-concepts';
import { mhPanelForEncounter } from './mh-panel-for-encounter';

describe('mhPanelForEncounter', () => {
  it('routes the screening type', () => {
    expect(mhPanelForEncounter({ encounterType: { uuid: MH_FORMS.header.encounterType.toUpperCase() } })).toBe('header');
    expect(mhPanelForEncounter({ encounterType: { uuid: MH_FORMS.visit.encounterType } })).toBe('visit');
    expect(mhPanelForEncounter({ encounterType: { uuid: '1ec34eeb-0776-4f58-871e-fe0026fda111' } })).toBe('screening');
    expect(mhPanelForEncounter({ encounterType: { uuid: ART_FORMS.visit.encounterType } })).toBeNull();
    expect(mhPanelForEncounter({ encounterType: null })).toBeNull();
  });
});
