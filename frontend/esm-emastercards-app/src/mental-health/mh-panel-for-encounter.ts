import { MH_FORMS } from './mh-concepts';
import { type MhPanel } from './launch-mh-panel';

/**
 * The native mental health panel an encounter is edited in, by its encounter type, whatever form saved it (the
 * screening's type included, though the card's own encounter types leave it out); null for every other encounter
 */
export function mhPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): MhPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  const found = (Object.keys(MH_FORMS) as Array<MhPanel>).find((panel) => MH_FORMS[panel].encounterType === type);
  return found ?? null;
}
