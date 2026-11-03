import dayjs from 'dayjs';
import { type EMastercardCard } from '../emastercards.resource';

function format(date: string) {
  return dayjs(date).format('DD-MMM-YYYY');
}

/** When the card was created, last visited and the next appointment, worded as on the legacy dashboard */
export function visitDetails(card: EMastercardCard) {
  const visited = card.lastVisit ? `${format(card.lastVisit)} at ${card.lastVisitLocation}` : 'no';
  const appointment = card.appointment ? format(card.appointment) : 'none';
  return `Created: ${format(card.created)}, Visited: ${visited}, Appointment: ${appointment}`;
}
