import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { visitFlags } from './visit-flags';
import { EncounterTable } from './ncd-card';
import { type ArtEncounter } from '../art/art.resource';

const visit = (uuid: string, date: string, height: number | null): ArtEncounter =>
  ({ uuid, encounterDatetime: `${date}T09:00:00.000+0200`, obs: [], height }) as unknown as ArtEncounter;
const heightOf = (v: any) => v.height;

describe('visitFlags', () => {
  it('flags a height more than one standard deviation from the others, at any age, as the legacy flowsheet does', () => {
    const visits = [visit('a', '2026-08-01', 162), visit('b', '2026-09-01', 163), visit('c', '2026-10-01', 162), visit('d', '2026-11-01', 126)];
    expect([...visitFlags(visits, heightOf).heightOutliers]).toEqual(['d']);
  });

  it('flags nothing for steady heights, a single height or a form without height', () => {
    expect(visitFlags([visit('a', '2026-08-01', 162), visit('b', '2026-09-01', 162)], heightOf).heightOutliers.size).toBe(0);
    expect(visitFlags([visit('a', '2026-08-01', 162)], heightOf).heightOutliers.size).toBe(0);
    expect(visitFlags([visit('a', '2026-08-01', null), visit('b', '2026-09-01', 120)]).heightOutliers.size).toBe(0);
  });

  it('judges heights by age at the visit when the birth date is known: adults by the standard deviation, children by an earlier taller height', () => {
    const adult = [visit('a', '2026-08-01', 162), visit('b', '2026-09-01', 162), visit('c', '2026-10-01', 162), visit('d', '2026-11-01', 126)];
    expect([...visitFlags(adult, heightOf, '1988-04-12').heightOutliers]).toEqual(['d']);
    // a growing child: none flagged, though the first and latest are a standard deviation from the mean
    const growing = [visit('a', '2026-08-01', 84), visit('b', '2026-09-01', 85), visit('c', '2026-10-01', 86)];
    expect(visitFlags(growing, heightOf, '2024-05-03').heightOutliers.size).toBe(0);
    expect(visitFlags(growing, heightOf).heightOutliers.size).toBe(2);
    // a child's height lower than one recorded at an earlier visit
    const shrinking = [visit('a', '2026-08-01', 84), visit('b', '2026-09-01', 80), visit('c', '2026-10-01', 86)];
    expect([...visitFlags(shrinking, heightOf, '2024-05-03').heightOutliers]).toEqual(['b']);
  });

  it('flags every encounter sharing its day with another', () => {
    const visits = [visit('a', '2026-08-01', null), visit('b', '2026-08-01', null), visit('c', '2026-09-01', null)];
    expect([...visitFlags(visits).duplicates].sort()).toEqual(['a', 'b']);
  });
});

describe('EncounterTable flags', () => {
  it('says which heights and days to check, and highlights them', () => {
    const visits = [
      visit('d', '2026-11-01', 126),
      visit('c', '2026-10-01', 162),
      visit('b', '2026-09-01', 163),
      visit('b2', '2026-09-01', 163),
      visit('a', '2026-08-01', 162),
    ];
    render(
      <EncounterTable
        label="Visits"
        columns={[
          { key: 'date', header: 'Date' },
          { key: 'height', header: 'Height' },
        ]}
        encounters={visits}
        cells={(v: any) => ({ date: v.encounterDatetime.slice(0, 10), height: v.height ? `${v.height} cm` : null })}
        heightOf={heightOf}
        empty="None"
      />,
    );
    expect(screen.getByText('Please check the height for 01-Nov-2026')).toBeInTheDocument();
    expect(screen.getByText('Please check the duplicate encounters on 01-Sep-2026')).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Visits' })).getAllByRole('row');
    expect(rows.filter((r) => r.getAttribute('data-flag') === 'duplicate')).toHaveLength(2);
    expect(within(rows[1]).getByText('126 cm')).toHaveAttribute('data-flag', 'height');
  });

  it('shows nothing extra when all is consistent', () => {
    render(
      <EncounterTable
        label="Visits"
        columns={[{ key: 'date', header: 'Date' }]}
        encounters={[visit('a', '2026-08-01', 162), visit('b', '2026-09-01', 162)]}
        cells={(v: any) => ({ date: v.encounterDatetime.slice(0, 10) })}
        heightOf={heightOf}
        empty="None"
      />,
    );
    expect(screen.queryByText(/Please check/)).not.toBeInTheDocument();
  });
});
