import { ART_FORMS } from './art-concepts';
import { artPanelForEncounter } from './art-panel-for-encounter';

describe('artPanelForEncounter', () => {
  it('maps each ART encounter type, including deprecated-form encounters, and returns null otherwise', () => {
    expect(artPanelForEncounter({ encounterType: { uuid: ART_FORMS.visit.encounterType } })).toBe('visit');
    expect(artPanelForEncounter({ encounterType: { uuid: ART_FORMS.initial.encounterType.toUpperCase() } })).toBe('initial');
    expect(artPanelForEncounter({ encounterType: { uuid: '9959A261-2122-4AE1-A89D-1CA444B712EA' } })).toBe('viralLoad');
    expect(artPanelForEncounter({ encounterType: { uuid: ART_FORMS.followUpTesting.encounterType }, form: { uuid: 'z-deprecated' } } as any)).toBe(
      'followUpTesting',
    );
    expect(artPanelForEncounter({ encounterType: { uuid: 'some-other-type' } })).toBeNull();
    expect(artPanelForEncounter({ encounterType: null })).toBeNull();
  });
});
