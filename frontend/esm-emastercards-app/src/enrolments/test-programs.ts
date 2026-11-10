import { type QuickProgram } from './enrolments.resource';

const htnDm = {
  uuid: 'htn-dm-workflow',
  name: 'Hypertension and Diabetes',
  open: false,
  currentState: null,
  enrolStates: [{ uuid: 'htn-dm-on-treatment', name: 'On treatment' }],
  changeStates: [],
};

const asthma = {
  uuid: 'asthma-workflow',
  name: 'Chronic Lung Disease',
  open: false,
  currentState: null,
  enrolStates: [{ uuid: 'asthma-on-treatment', name: 'On treatment' }],
  changeStates: [],
};

/** A Chronic Care Program, as the quickprograms endpoint returns it for a patient not enrolled, for tests */
export function chronicCare(overrides: Partial<QuickProgram> = {}): QuickProgram {
  return {
    key: 'chronic-care',
    label: 'Chronic Care Program',
    available: true,
    canEdit: true,
    multipleWorkflows: true,
    enrolment: null,
    lastEnrolment: null,
    workflows: [htnDm, asthma],
    enrolStates: [],
    changeStates: [],
    exitStates: [],
    ...overrides,
  };
}

/** The same patient enrolled in Hypertension and Diabetes only */
export function chronicCareEnrolledInHtnDm(): QuickProgram {
  return chronicCare({
    enrolment: { uuid: 'enrolment-uuid', dateEnrolled: '2026-11-02', location: { uuid: 'neno', display: 'Neno District Hospital' } },
    workflows: [
      {
        ...htnDm,
        open: true,
        currentState: { uuid: 'htn-dm-on-treatment', name: 'On treatment', startDate: '2026-11-02' },
        enrolStates: [],
        changeStates: [{ uuid: 'htn-dm-advanced', name: 'In advanced care' }],
      },
      asthma,
    ],
    exitStates: [
      { uuid: 'htn-dm-died', name: 'Patient died', workflow: 'Hypertension and Diabetes', kind: 'DIED' },
      { uuid: 'htn-dm-transferred', name: 'Patient transferred out', workflow: 'Hypertension and Diabetes', kind: 'TRANSFER_OUT' },
    ],
  });
}

const neno = { uuid: 'neno', display: 'Neno District Hospital' };

/** A single-workflow program, the HIV Program, with the patient on antiretrovirals */
export function hivOnArt(overrides: Partial<QuickProgram> = {}): QuickProgram {
  return {
    key: 'hiv',
    label: 'HIV Program',
    available: true,
    canEdit: true,
    multipleWorkflows: false,
    enrolment: { uuid: 'hiv-enrolment', dateEnrolled: '2019-02-18', location: neno },
    lastEnrolment: null,
    workflows: [
      {
        uuid: 'hiv-workflow',
        name: 'Treatment status',
        open: true,
        currentState: { uuid: 'on-art', name: 'On antiretrovirals', startDate: '2019-02-18' },
        enrolStates: [],
        changeStates: [{ uuid: 'defaulted', name: 'Defaulted' }],
      },
    ],
    enrolStates: [],
    changeStates: [{ uuid: 'defaulted', name: 'Defaulted' }],
    exitStates: [{ uuid: 'hiv-died', name: 'Patient died', workflow: 'Treatment status', kind: 'DIED' }],
    ...overrides,
  };
}

/** A program the patient was enrolled in and left: the TB Program, treatment complete */
export function tbCompleted(): QuickProgram {
  return {
    ...hivOnArt(),
    key: 'tb',
    label: 'TB Program',
    enrolment: null,
    lastEnrolment: {
      uuid: 'tb-old',
      dateEnrolled: '2021-03-03',
      dateCompleted: '2021-09-01',
      location: neno,
      exitState: { uuid: 'tb-complete', name: 'Treatment complete' },
    },
    workflows: [],
    enrolStates: [{ uuid: 'tb-on-treatment', name: 'On treatment' }],
    changeStates: [],
    exitStates: [],
  };
}
