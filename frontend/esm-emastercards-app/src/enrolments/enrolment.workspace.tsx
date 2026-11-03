import React, { useState } from 'react';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Checkbox, InlineNotification, Select, SelectItem, TextInput } from '@carbon/react';
import {
  openmrsFetch,
  restBaseUrl,
  useSession,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import {
  type EnrolmentMode,
  type QuickProgram,
  changeStates,
  enrol,
  errorMessage,
  exitProgram,
} from './enrolments.resource';
import styles from './enrolments.scss';

export interface EnrolmentWorkspaceProps {
  program: QuickProgram;
  mode: EnrolmentMode;
  patientUuid: string;
}

/**
 * Enrolls the patient in a Quick Programs program, adds a condition to it, changes their states or exits them, on
 * a date, offering only the states Quick Programs offers
 */
const EnrolmentWorkspace: React.FC<Workspace2DefinitionProps<EnrolmentWorkspaceProps>> = ({
  closeWorkspace,
  workspaceProps: { program, mode, patientUuid },
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const session = useSession();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [location, setLocation] = useState<string>(program.enrolment?.location?.uuid ?? session?.sessionLocation?.uuid ?? '');
  // enrol and change: the state chosen for each workflow (single-workflow programs use the program's key)
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [exitState, setExitState] = useState('');
  const [transferredTo, setTransferredTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: locations } = useSWR(
    mode === 'enrol' && !program.enrolment ? `${restBaseUrl}/location?v=custom:(uuid,display)&limit=500` : null,
    (url: string) =>
      openmrsFetch<{ results: Array<{ uuid: string; display: string }> }>(url).then((res) => res.data?.results ?? []),
  );

  const enrolWorkflows = program.workflows.filter((w) => !w.open && w.enrolStates.length > 0);
  const changeWorkflows = program.workflows.filter((w) => w.open && w.changeStates.length > 0);
  const chosenExit = program.exitStates.find((s) => s.uuid === exitState);
  const title = {
    enrol: !program.enrolment
      ? t('enrolIn', 'Enrol in {{program}}', { program: program.label })
      : program.multipleWorkflows
        ? t('addConditionTo', 'Add a condition to {{program}}', { program: program.label })
        : t('setStateIn', 'Set the state in {{program}}', { program: program.label }),
    change: t('changeStateIn', 'Change state in {{program}}', { program: program.label }),
    exit: t('exitFrom', 'Exit from {{program}}', { program: program.label }),
  }[mode];

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      if (mode === 'enrol') {
        const ticked = enrolWorkflows.filter((w) => checked[w.uuid]);
        const withoutState = ticked.find((w) => !chosen[w.uuid]);
        if (program.multipleWorkflows && withoutState) {
          throw new Error(t('chooseStateFor', 'Choose a state for {{workflow}}', { workflow: withoutState.name }));
        }
        const states = program.multipleWorkflows
          ? ticked.map((w) => chosen[w.uuid])
          : [chosen[program.key]].filter(Boolean);
        await enrol(patientUuid, program.key, states, date, program.enrolment ? null : location);
      } else if (mode === 'change') {
        const states = program.multipleWorkflows
          ? changeWorkflows.map((w) => chosen[w.uuid]).filter(Boolean)
          : [chosen[program.key]].filter(Boolean);
        if (!states.length) {
          throw new Error(t('chooseState', 'Choose a state'));
        }
        await changeStates(program.enrolment.uuid, states, date);
      } else {
        if (!exitState) {
          throw new Error(t('chooseExitState', 'Choose how the patient leaves the program'));
        }
        await exitProgram(program.enrolment.uuid, exitState, date, chosenExit?.kind === 'TRANSFER_OUT' ? transferredTo : undefined);
      }
      mutate(() => true);
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const stateSelect = (id: string, label: string, states: Array<{ uuid: string; name: string }>, emptyText: string) => (
    <Select
      id={`state-${id}`}
      labelText={label}
      value={chosen[id] ?? ''}
      onChange={(e) => {
        setChosen({ ...chosen, [id]: e.target.value });
        // choosing a condition's state means enrolling in it
        if (mode === 'enrol' && e.target.value) {
          setChecked({ ...checked, [id]: true });
        }
      }}
    >
      <SelectItem value="" text={emptyText} />
      {states.map((s) => (
        <SelectItem key={s.uuid} value={s.uuid} text={s.name} />
      ))}
    </Select>
  );

  return (
    <Workspace2 title={title}>
      <div className={styles.panel}>
        {mode === 'enrol' &&
          (program.multipleWorkflows ? (
            enrolWorkflows.map((w) => (
              <div key={w.uuid} className={styles.condition}>
                <Checkbox
                  id={`condition-${w.uuid}`}
                  labelText={w.name}
                  checked={Boolean(checked[w.uuid])}
                  onChange={(_, { checked: isChecked }) => setChecked({ ...checked, [w.uuid]: isChecked })}
                />
                {stateSelect(w.uuid, t('workflowStateLabel', '{{workflow}} state', { workflow: w.name }), w.enrolStates, t('chooseAState', 'Choose a state'))}
              </div>
            ))
          ) : (
            stateSelect(program.key, t('stateLabel', 'State'), program.enrolStates, t('chooseAState', 'Choose a state'))
          ))}

        {mode === 'change' &&
          (program.multipleWorkflows
            ? changeWorkflows.map((w) => (
                <div key={w.uuid}>
                  {stateSelect(w.uuid, t('workflowStateLabel', '{{workflow}} state', { workflow: w.name }), w.changeStates, t('noChange', 'No change'))}
                </div>
              ))
            : stateSelect(program.key, t('changeTo', 'Change to'), program.changeStates, t('chooseAState', 'Choose a state')))}

        {mode === 'exit' && (
          <>
            <Select id="exit-state" labelText={t('exitWith', 'Exit with')} value={exitState} onChange={(e) => setExitState(e.target.value)}>
              <SelectItem value="" text={t('chooseAState', 'Choose a state')} />
              {program.exitStates.map((s) => (
                <SelectItem key={s.uuid} value={s.uuid} text={program.multipleWorkflows ? `${s.workflow}: ${s.name}` : s.name} />
              ))}
            </Select>
            {chosenExit?.kind === 'TRANSFER_OUT' && (
              <TextInput
                id="transferred-to"
                labelText={t('transferredTo', 'Transferred to')}
                value={transferredTo}
                onChange={(e) => setTransferredTo(e.target.value)}
              />
            )}
            {program.multipleWorkflows && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title={t('endsWholeEnrolment', 'This ends the whole {{program}} enrolment.', { program: program.label })}
              />
            )}
          </>
        )}

        <TextInput id="enrolment-date" type="date" labelText={t('date', 'Date')} value={date} onChange={(e) => setDate(e.target.value)} />

        {mode === 'enrol' && !program.enrolment && (
          <Select id="enrolment-location" labelText={t('location', 'Location')} value={location} onChange={(e) => setLocation(e.target.value)}>
            <SelectItem value="" text={t('chooseLocation', 'Choose a location')} />
            {(locations ?? []).map((l) => (
              <SelectItem key={l.uuid} value={l.uuid} text={l.display} />
            ))}
          </Select>
        )}

        {error && <InlineNotification kind="error" lowContrast hideCloseButton title={error} />}

        <ButtonSet>
          <Button kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" onClick={save} disabled={saving}>
            {t('save', 'Save')}
          </Button>
        </ButtonSet>
      </div>
    </Workspace2>
  );
};

export default EnrolmentWorkspace;
