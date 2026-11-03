import useSWR from 'swr';
import dayjs from 'dayjs';
import { launchWorkspace2, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface QuickProgramState {
  uuid: string;
  name: string;
}

export interface QuickProgramExitState extends QuickProgramState {
  /** The name of the workflow the state belongs to */
  workflow: string;
  kind: 'TRANSFER_OUT' | 'DIED' | 'COMPLETE';
}

export interface QuickProgramWorkflow {
  uuid: string;
  name: string;
  open: boolean;
  currentState: (QuickProgramState & { startDate: string }) | null;
  enrolStates: Array<QuickProgramState>;
  changeStates: Array<QuickProgramState>;
}

export interface QuickProgramEnrolment {
  uuid: string;
  dateEnrolled: string;
  location: { uuid: string; display: string } | null;
}

/** One of the patient dashboard's Quick Programs, as the pihmalawi/quickprograms endpoint returns it */
export interface QuickProgram {
  key: string;
  label: string;
  available: boolean;
  canEdit: boolean;
  /** True for programs with one workflow per condition, such as Chronic Care */
  multipleWorkflows: boolean;
  enrolment: QuickProgramEnrolment | null;
  lastEnrolment: (QuickProgramEnrolment & { dateCompleted: string | null; exitState: QuickProgramState | null }) | null;
  workflows: Array<QuickProgramWorkflow>;
  enrolStates: Array<QuickProgramState>;
  changeStates: Array<QuickProgramState>;
  exitStates: Array<QuickProgramExitState>;
}

export type EnrolmentMode = 'enrol' | 'change' | 'exit';

export const enrolmentWorkspace = 'pihmalawi-enrolment-workspace';

const quickProgramsUrl = `${restBaseUrl}/pihmalawi/quickprograms`;

export function useQuickPrograms(patientUuid: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: { results: Array<QuickProgram> } }, Error>(
    patientUuid ? `${quickProgramsUrl}?patient=${patientUuid}` : null,
    openmrsFetch,
  );
  return { programs: data?.data?.results ?? [], error, isLoading, mutate };
}

export function launchEnrolmentPanel(program: QuickProgram, mode: EnrolmentMode, patientUuid: string) {
  launchWorkspace2(enrolmentWorkspace, { program, mode, patientUuid });
}

/** What the card offers: the enroll, add condition, change state and exit actions Quick Programs has for it */
export function availableActions(program: QuickProgram) {
  if (!program.canEdit || !program.available) {
    return { enrol: false, setState: false, addCondition: false, change: false, exit: false };
  }
  const enrolled = Boolean(program.enrolment);
  const workflowToEnrol = program.workflows.some((w) => !w.open && w.enrolStates.length > 0);
  return {
    enrol: !enrolled && (program.enrolStates.length > 0 || workflowToEnrol),
    // an enrolment made without a state, e.g. from the Programs tab
    setState: enrolled && !program.multipleWorkflows && program.enrolStates.length > 0,
    addCondition: enrolled && program.multipleWorkflows && workflowToEnrol,
    change: enrolled && (program.changeStates.length > 0 || program.workflows.some((w) => w.changeStates.length > 0)),
    exit: enrolled && program.exitStates.length > 0,
  };
}

export function formatDate(date: string) {
  return dayjs(date).format('DD-MMM-YYYY');
}

function post(action: string, body: object) {
  return openmrsFetch(`${quickProgramsUrl}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export function enrol(patient: string, program: string, states: Array<string>, date: string, location: string | null) {
  return post('enrol', { patient, program, states, date, location });
}

/** Changes the states, one per workflow, in one request: all of them are saved, or none */
export function changeStates(patientProgram: string, states: Array<string>, date: string) {
  return post('change', { patientProgram, states, date });
}

export function exitProgram(patientProgram: string, state: string, date: string, transferredOutLocation?: string) {
  return post('exit', { patientProgram, state, date, transferredOutLocation });
}

/** The message the server gave for a failed action, or the error's own */
export function errorMessage(error: unknown) {
  const e = error as { responseBody?: { error?: { message?: string } }; message?: string };
  return e?.responseBody?.error?.message ?? e?.message ?? String(error);
}
