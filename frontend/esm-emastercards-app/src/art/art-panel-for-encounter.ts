import { ART_FORMS } from './art-concepts';
import { type ArtPanel } from './launch-art-panel';

/**
 * The native ART panel an encounter is edited in, by its encounter type, whatever form saved it (encounters of
 * deprecated ART forms included); null for every other encounter
 */
export function artPanelForEncounter(encounter: { encounterType?: { uuid: string } | null }): ArtPanel | null {
  const type = encounter.encounterType?.uuid?.toLowerCase();
  const found = (Object.keys(ART_FORMS) as Array<ArtPanel>).find((kind) => ART_FORMS[kind].encounterType === type);
  return found ?? null;
}
