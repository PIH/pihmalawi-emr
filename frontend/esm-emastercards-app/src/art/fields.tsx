import React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, RadioButton, RadioButtonGroup, Select, SelectItem, TextInput } from '@carbon/react';
import { type ArtField, displayValue } from './art-fields';
import { type RuleResult } from './art-rules';
import { type FieldValue } from './obs-diff';
import styles from './art-panel.scss';

interface ArtFieldInputProps {
  field: ArtField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  /** The value recorded the same day in another encounter, for obsreference fields */
  reference?: FieldValue;
  rule?: RuleResult;
  readOnly?: boolean;
  /** Labels for a boolean's false and true, e.g. P and G */
  booleanLabels?: [string, string];
}

function ruleProps(rule: RuleResult) {
  if (rule?.level === 'error') {
    return { invalid: true, invalidText: rule.message };
  }
  if (rule?.level === 'warning') {
    return { warn: true, warnText: rule.message };
  }
  return {};
}

/**
 * One ART card question as a Carbon input. Reference fields show the same-day value; a read-only reference field
 * can't be changed while there is one, as the HTML forms' obsreference without allowOverride
 */
export const ArtFieldInput: React.FC<ArtFieldInputProps> = ({ field, value, onChange, reference, rule, readOnly, booleanLabels }) => {
  const { t } = useTranslation();
  const id = `art-${field.name}`;
  const hasReference = field.reference && reference !== null && reference !== undefined && reference !== '';
  const locked = readOnly || (hasReference && field.reference === 'readonly');
  const shown = hasReference && field.reference === 'readonly' ? reference : value;
  const label = field.required ? `${field.label} *` : field.label;
  const helper = hasReference
    ? t('fromSameDay', 'Recorded today in another form: {{value}}', { value: displayValue(field, reference) })
    : field.unit;
  const message = rule ? <span className={rule.level === 'error' ? styles.error : styles.warning}>{rule.message}</span> : null;

  if (field.kind === 'multi') {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{label}</legend>
        <div className={styles.options}>
          {field.options.map((o) => {
            const checked = Array.isArray(value) && value.some((v) => v.toLowerCase() === o.value.toLowerCase());
            return (
              <Checkbox
                key={o.value}
                id={`${id}-${o.value}`}
                labelText={'title' in o ? `${o.label} (${(o as { title: string }).title})` : o.label}
                checked={checked}
                disabled={locked}
                onChange={(_, { checked: ticked }) => {
                  const rest = (Array.isArray(value) ? value : []).filter((v) => v.toLowerCase() !== o.value.toLowerCase());
                  onChange(ticked ? [...rest, o.value] : rest);
                }}
              />
            );
          })}
        </div>
        {message}
      </fieldset>
    );
  }

  if (field.kind === 'boolean' && field.checkbox) {
    return (
      <div>
        <Checkbox
          id={id}
          labelText={label}
          checked={value === true || value === 'true'}
          disabled={locked}
          onChange={(_, { checked }) => onChange(checked ? true : null)}
        />
        {message}
      </div>
    );
  }

  if (field.kind === 'boolean') {
    const [no, yes] = booleanLabels ?? [t('no', 'No'), t('yes', 'Yes')];
    return (
      <fieldset className={styles.fieldset}>
        <RadioButtonGroup
          legendText={label}
          name={id}
          valueSelected={value === null || value === undefined ? '' : String(value === true || value === 'true')}
          onChange={(selected) => onChange(selected === 'true')}
          disabled={locked}
        >
          <RadioButton id={`${id}-false`} labelText={no} value="false" />
          <RadioButton id={`${id}-true`} labelText={yes} value="true" />
        </RadioButtonGroup>
        {message}
      </fieldset>
    );
  }

  if (field.kind === 'coded' && !field.select && field.options.length <= 4) {
    return (
      <fieldset className={styles.fieldset}>
        <RadioButtonGroup
          legendText={label}
          name={id}
          valueSelected={(value as string) ?? ''}
          onChange={(selected) => onChange(String(selected))}
          disabled={locked}
          orientation={field.options.length > 3 ? 'vertical' : 'horizontal'}
        >
          {field.options.map((o) => (
            <RadioButton key={o.value} id={`${id}-${o.value}`} labelText={o.label} value={o.value} />
          ))}
        </RadioButtonGroup>
        {!locked && value && !field.required && (
          <button type="button" className={styles.clear} onClick={() => onChange(null)}>
            {t('clear', 'Clear')}
          </button>
        )}
        {message}
      </fieldset>
    );
  }

  if (field.kind === 'coded') {
    return (
      <Select
        id={id}
        labelText={label}
        value={(value as string) ?? ''}
        disabled={locked}
        onChange={(e) => onChange(e.target.value || null)}
        {...ruleProps(rule)}
      >
        <SelectItem value="" text={t('choose', 'Choose')} />
        {field.options.map((o) => (
          <SelectItem key={o.value} value={o.value} text={o.label} />
        ))}
      </Select>
    );
  }

  return (
    <TextInput
      id={id}
      labelText={label}
      type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
      value={shown === null || shown === undefined ? '' : String(shown).slice(0, field.kind === 'date' ? 10 : undefined)}
      readOnly={locked}
      helperText={helper}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? null : field.kind === 'number' ? Number(raw) : raw);
      }}
      {...ruleProps(rule)}
    />
  );
};
