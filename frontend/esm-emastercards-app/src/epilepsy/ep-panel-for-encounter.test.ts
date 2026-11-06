import { MH_FORMS } from '../mental-health/mh-concepts';
import { EP_FORMS } from './ep-concepts';
import { epPanelForEncounter } from './ep-panel-for-encounter';

describe('epPanelForEncounter', () => {
  it('routes the epilepsy header and visit by encounter type', () => {
    expect(epPanelForEncounter({ encounterType: { uuid: EP_FORMS.header.encounterType.toUpperCase() } })).toBe('header');
    expect(epPanelForEncounter({ encounterType: { uuid: EP_FORMS.visit.encounterType } })).toBe('visit');
    expect(epPanelForEncounter({ encounterType: { uuid: MH_FORMS.visit.encounterType } })).toBeNull();
    expect(epPanelForEncounter({ encounterType: null })).toBeNull();
  });
});
