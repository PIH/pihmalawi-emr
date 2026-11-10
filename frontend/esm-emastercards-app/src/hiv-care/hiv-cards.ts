import { type EMastercardCard, useEMastercards } from '../emastercards.resource';

/**
 * The HIV care page's cards, in its tabs' order: the ART patient card, and the teen club, pre-ART and exposed child
 * cards, which the eMastercards endpoint lists in groups of their own
 */
export const HIV_CARD_KEYS = ['art', 'teen-club', 'pre-art', 'exposed-child'];

/** HIV cards whose program has been retired: no new card is started, and existing ones are shown view-only */
const RETIRED_CARDS: Record<string, string> = {
  'pre-art': 'The Pre-ART program has been retired: this card is view-only.',
};

/** Whether the patient already has the card, i.e. it has been started */
const started = (card: EMastercardCard) => card.state === 'VIEW' || card.state === 'EDIT';

/**
 * The patient's HIV cards: those available to them, and those not available because the patient's state in Enrolments
 * is not one the card is for (only cards the patient has a state for, e.g. defaulted, not every HIV card). A retired
 * card is listed only for patients who already have it, view-only.
 */
export function useHivCards(patientUuid: string): { cards: Array<EMastercardCard>; inactive: Array<EMastercardCard>; isLoading: boolean } {
  const { cards, isLoading } = useEMastercards(patientUuid);
  const hiv = HIV_CARD_KEYS.map((key) => cards.find((c) => c.key === key)).filter(Boolean);
  return {
    cards: hiv
      .filter((c) => (RETIRED_CARDS[c.key] ? started(c) : c.state !== 'UNAVAILABLE'))
      .map((c) => (RETIRED_CARDS[c.key] ? { ...c, state: 'VIEW' as const, message: RETIRED_CARDS[c.key] } : c)),
    inactive: hiv.filter(
      (c) => !RETIRED_CARDS[c.key] && c.state === 'UNAVAILABLE' && /Inactive program state/i.test(c.message ?? '') && c.enrolment?.state,
    ),
    isLoading,
  };
}
