import { followUpTests, initial, viralLoad, visits } from '../art/test-art-data';
import { card } from '../test-cards';
import { chronicCareEnrolledInHtnDm, hivOnArt, tbCompleted, chronicCare } from '../enrolments/test-programs';
import { recordableCards } from './record-visit';
import { careCardRows, dueItems, programRows, summarizeArt, visitContents, visitGroups } from './summary.resource';

describe('summarizeArt', () => {
  const summary = summarizeArt(initial, visits, [viralLoad('vl-1', '2025-09-02', { ldl: true })], followUpTests, '2026-11-10');

  it('gives the regimen, the ART start date and the years on ART', () => {
    expect(summary.regimen.regimen.label).toBe('13A');
    expect(summary.regimen.since).toContain('2026-05-06');
    expect(summary.artStart).toContain('2019-02-18');
    expect(summary.yearsOnArt).toBe(7);
  });

  it('gives the latest viral load and CD4 count', () => {
    expect(summary.latestViralLoad).toEqual({ date: expect.stringContaining('2025-09-02'), result: 'LDL' });
    expect(summary.cd4).toEqual({ value: 540, date: expect.stringContaining('2025-09-02') });
  });

  it("works out adherence from the latest pill count and the previous visit's tablets", () => {
    // 90 dispensed on 06-May, 4 left on 05-Aug, 91 days later
    expect(summary.adherence).toBe(95);
    expect(summary.nextAppointment).toContain('2026-11-04');
  });

  it('says a routine viral load is due when the last is over a year old', () => {
    expect(summary.viralLoadDue).toBe(true);
    expect(summarizeArt(initial, visits, [viralLoad('vl-2', '2026-06-01', { numeric: 40 })], [], '2026-11-10').viralLoadDue).toBe(false);
  });
});

describe('dueItems', () => {
  const today = '2026-11-10';
  it('lists each card whose appointment is today or has passed, the longest overdue first', () => {
    const cards = [
      card({ key: 'art', state: 'EDIT', appointment: '2026-11-10' }),
      card({ key: 'htn-dm', label: 'Hypertension and Diabetes eMastercard', state: 'EDIT', appointment: '2026-10-01' }),
      card({ key: 'asthma', label: 'Chronic Lung Disease eMastercard', state: 'EDIT', appointment: '2026-12-01' }),
      card({ key: 'epilepsy', label: 'Epilepsy eMastercard', state: 'VIEW', appointment: '2026-10-01' }),
    ];
    expect(dueItems(cards, today)).toEqual([
      { key: 'htn-dm', label: 'Hypertension and Diabetes appointment · 01-Oct-2026', status: 'overdue' },
      { key: 'art', label: 'ART appointment', status: 'today' },
    ]);
  });
});

describe('careCardRows', () => {
  it('lists every eMastercard the patient has, not only ART, with its last visit and next appointment', () => {
    const cards = [
      card({ key: 'art', state: 'EDIT', created: '2019-02-18', lastVisit: '2026-08-05', appointment: '2026-12-02' }),
      card({ key: 'htn-dm', label: 'Hypertension and Diabetes eMastercard', state: 'EDIT', created: '2026-10-30', appointment: '2026-10-01' }),
      card({ key: 'pre-art', label: 'Pre-ART eMastercard', state: 'VIEW', created: '2015-03-02', appointment: '2015-12-02' }),
      card({ key: 'asthma', label: 'Chronic Lung Disease eMastercard', state: 'CREATE' }),
    ];
    expect(careCardRows(cards, '2026-11-10')).toEqual([
      { key: 'art', name: 'ART', lastVisit: '2026-08-05', appointment: '2026-12-02', overdue: false },
      { key: 'htn-dm', name: 'Hypertension and Diabetes', lastVisit: null, appointment: '2026-10-01', overdue: true },
      { key: 'pre-art', name: 'Pre-ART', lastVisit: null, appointment: '2015-12-02', overdue: false },
    ]);
  });
});

describe('visitGroups', () => {
  it("groups a visit's forms by the eMastercard they belong to, others by their own name", () => {
    const chf = card({ key: 'chf', label: 'Cardiac and Vascular Disease eMastercard', formUuids: ['CHF-VISIT', 'chf-echo'], encounterTypeUuids: [] });
    const groups = visitGroups(
      {
        uuid: 'v',
        startDatetime: '2026-11-09',
        stopDatetime: '2026-11-09',
        visitType: { display: 'Clinic or Hospital Visit' },
        encounters: [
          { encounterType: { uuid: 't1', display: 'CHF_FOLLOWUP' }, form: { uuid: 'chf-visit', display: 'Cardiac and Vascular Disease Visit' } },
          { encounterType: { uuid: 't2', display: 'CHF_ECHOCARDIOGRAM' }, form: { uuid: 'CHF-ECHO', display: 'Echocardiogram' } },
          { encounterType: { uuid: 't3', display: 'VITALS' }, form: null },
        ],
      },
      [chf],
    );
    expect(groups).toEqual([
      { name: 'Cardiac and Vascular Disease', forms: 2 },
      { name: 'VITALS', forms: 1 },
    ]);
  });
});

describe('programRows', () => {
  it('lists the active programs with their states, then the completed ones with the outcome and year', () => {
    expect(programRows([chronicCare(), hivOnArt(), chronicCareEnrolledInHtnDm(), tbCompleted()])).toEqual([
      { key: 'hiv', label: 'HIV Program', details: ['On antiretrovirals'], active: true },
      { key: 'chronic-care', label: 'Chronic Care Program', details: ['Hypertension and Diabetes · On treatment'], active: true },
      { key: 'tb', label: 'TB Program', details: ['Treatment complete · 2021'], active: false },
    ]);
  });
});

describe('visitContents', () => {
  it('names each form once, else the encounter type, leaving out voided encounters', () => {
    expect(
      visitContents({
        uuid: 'v',
        startDatetime: '2026-11-10',
        stopDatetime: null,
        visitType: { display: 'Outpatient' },
        encounters: [
          { encounterType: { display: 'VITALS' }, form: null },
          { encounterType: { display: 'ART_FOLLOWUP' }, form: { display: 'ART Visit' } },
          { encounterType: { display: 'ART_FOLLOWUP' }, form: { display: 'ART Visit' } },
          { voided: true, encounterType: { display: 'X' }, form: null },
        ],
      }),
    ).toEqual(['VITALS', 'ART Visit']);
  });
});

describe('recordableCards', () => {
  it('offers a visit on each native card the patient has started and may change', () => {
    const cards = [
      card({ key: 'art', state: 'EDIT' }),
      card({ key: 'htn-dm', state: 'CREATE' }),
      card({ key: 'pre-art', state: 'EDIT' }),
      card({ key: 'epilepsy', state: 'VIEW' }),
      card({ key: 'ckd', state: 'EDIT' }),
    ];
    expect(recordableCards(cards).map((c) => c.key)).toEqual(['art', 'ckd']);
  });
});
