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
