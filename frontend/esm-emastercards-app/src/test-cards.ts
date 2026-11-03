import { type EMastercardCard } from './emastercards.resource';

/** An eMastercard as the eMastercards endpoint returns it, for tests */
export function card(overrides: Partial<EMastercardCard> = {}): EMastercardCard {
  return {
    key: 'art',
    group: 'ART Patient Card',
    label: 'ART eMastercard',
    state: 'CREATE',
    message: null,
    readonlyNote: false,
    initialEncounterUuid: null,
    created: null,
    lastVisit: null,
    lastVisitLocation: null,
    appointment: null,
    flowsheetPath:
      'htmlformentryui/htmlform/flowsheet.page?headerForm=file:configuration/htmlforms/art-emastercard.xml&dashboardUrl=legacyui&patientId=7',
    formUuids: ['64db7fd5-c28d-4b85-87c4-d01e92ae004a'],
    encounterTypeUuids: ['664b8574-977f-11e1-8993-905e29aff6c1', '664b8650-977f-11e1-8993-905e29aff6c1'],
    ...overrides,
  };
}
