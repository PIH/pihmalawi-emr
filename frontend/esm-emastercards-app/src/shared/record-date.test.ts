import dayjs from 'dayjs';
import { openmrsFetch } from '@openmrs/esm-framework';
import { checkRecordDay, resolveVisit } from './record-date';

vi.mock('@openmrs/esm-patient-common-lib', () => ({ usePatientChartStore: vi.fn() }));

const mockFetch = vi.mocked(openmrsFetch);
const today = { uuid: 'visit-today', startDatetime: '2026-11-04T08:00:00.000+0200', visitType: { uuid: 'clinic' } };
const options = { visitContext: today, locationUuid: 'neno-dh', visitTypeUuid: 'past-type' };

describe('resolveVisit', () => {
  it("records on the chart's current visit when it is that day's", async () => {
    expect(await resolveVisit('p1', '2026-11-04', options)).toEqual({ visitUuid: 'visit-today', datetime: today.startDatetime });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("records a past day in the patient's visit on that day", async () => {
    mockFetch.mockResolvedValueOnce({
      data: { results: [{ uuid: 'visit-oct', startDatetime: '2026-10-08T09:30:00.000+0200', stopDatetime: '2026-10-08T16:00:00.000+0200' }] },
    } as any);
    const resolved = await resolveVisit('p1', '2026-10-08', options);
    expect(resolved.visitUuid).toBe('visit-oct');
    expect(dayjs(resolved.datetime).isSame(dayjs('2026-10-08T09:30:00.000+0200'))).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('creates a visit for a past day the patient has none on, as O3 records a past visit', async () => {
    mockFetch
      .mockResolvedValueOnce({ data: { results: [{ uuid: 'visit-sep', startDatetime: '2026-09-10T09:00:00.000+0200', stopDatetime: '2026-09-10T15:00:00.000+0200' }] } } as any)
      .mockResolvedValueOnce({ data: { uuid: 'visit-new' } } as any);
    const resolved = await resolveVisit('p1', '2026-10-01', { ...options, visitContext: null });
    expect(resolved.visitUuid).toBe('visit-new');
    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toContain('/visit');
    const body = (init as any).body;
    expect(body).toMatchObject({ patient: 'p1', visitType: 'past-type', location: 'neno-dh' });
    expect(dayjs(body.startDatetime).format('YYYY-MM-DD HH:mm')).toBe('2026-10-01 00:00');
    expect(dayjs(body.stopDatetime).format('YYYY-MM-DD HH:mm')).toBe('2026-10-01 23:59');
    expect(dayjs(resolved.datetime).format('YYYY-MM-DD')).toBe('2026-10-01');
  });

  it('a new past visit takes the visit type of the current one', async () => {
    mockFetch.mockResolvedValueOnce({ data: { results: [] } } as any).mockResolvedValueOnce({ data: { uuid: 'visit-new' } } as any);
    await resolveVisit('p1', '2026-10-01', options);
    expect((mockFetch.mock.calls[1][1] as any).body.visitType).toBe('clinic');
  });
});

describe('checkRecordDay', () => {
  it('a past day is not in the future, nor before the patient was born', () => {
    expect(checkRecordDay('2026-10-01', '1990-01-01')).toBeNull();
    expect(checkRecordDay(dayjs().add(1, 'day').format('YYYY-MM-DD'))?.message).toBe('Cannot be in the future');
    expect(checkRecordDay('1980-01-01', '1990-01-01')?.message).toBe('Cannot be before the patient was born');
    expect(checkRecordDay(null)?.message).toBe('Required');
  });
});
