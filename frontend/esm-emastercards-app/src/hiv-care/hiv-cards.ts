import { type EMastercardCard, useEMastercards } from '../emastercards.resource';

/**
 * The HIV care page's cards, in its tabs' order: the ART patient card, and the teen club, pre-ART and exposed child
 * cards, which the eMastercards endpoint lists in groups of their own
 */
export const HIV_CARD_KEYS = ['art', 'teen-club', 'pre-art', 'exposed-child'];

/**
 * The patient's HIV cards: those available to them, and those not available because the patient's state in Enrolments
 * is not one the card is for (only cards the patient has a state for, e.g. defaulted, not every HIV card)
 */
export function useHivCards(patientUuid: string): { cards: Array<EMastercardCard>; inactive: Array<EMastercardCard>; isLoading: boolean } {
  const { cards, isLoading } = useEMastercards(patientUuid);
  const hiv = HIV_CARD_KEYS.map((key) => cards.find((c) => c.key === key)).filter(Boolean);
  return {
    cards: hiv.filter((c) => c.state !== 'UNAVAILABLE'),
    inactive: hiv.filter((c) => c.state === 'UNAVAILABLE' && /Inactive program state/i.test(c.message ?? '') && c.enrolment?.state),
    isLoading,
  };
}
