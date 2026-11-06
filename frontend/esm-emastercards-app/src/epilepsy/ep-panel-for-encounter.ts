import { EP_FORMS } from './ep-concepts';
import { type EpPanel } from './launch-ep-panel';

/** The native epilepsy panel an encounter is edited in, by its encounter type, whatever form saved it; else null */
export function epPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): EpPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  return (Object.keys(EP_FORMS) as Array<EpPanel>).find((panel) => EP_FORMS[panel].encounterType === type) ?? null;
}
