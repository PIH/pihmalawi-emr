import { type EMastercardCard } from '../emastercards.resource';

interface EncounterToEdit {
  form?: { uuid: string } | null;
  encounterType?: { uuid: string } | null;
}

/**
 * The patient's eMastercards an encounter belongs to: those whose forms include the encounter's form or, when no
 * card does, those whose encounter types include its type. Only cards the patient already has (that can be edited
 * or viewed) count.
 */
export function findCardsForEncounter(encounter: EncounterToEdit, cards: Array<EMastercardCard>): Array<EMastercardCard> {
  const existing = cards.filter((card) => card.state === 'EDIT' || card.state === 'VIEW');
  const formUuid = encounter.form?.uuid?.toLowerCase();
  const byForm = formUuid ? existing.filter((card) => card.formUuids.includes(formUuid)) : [];
  if (byForm.length) {
    return byForm;
  }
  const encounterTypeUuid = encounter.encounterType?.uuid?.toLowerCase();
  return encounterTypeUuid ? existing.filter((card) => card.encounterTypeUuids.includes(encounterTypeUuid)) : [];
}
