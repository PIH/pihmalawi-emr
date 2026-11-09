import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@carbon/react';
import { type ArtField } from '../art/art-fields';
import { type RuleResult } from '../art/art-rules';
import { type FieldValue } from '../art/obs-diff';
import { ArtFieldInput } from '../art/fields';
import styles from '../art/art-panel.scss';

const groupKey = (f: ArtField) => (f.group ? `${f.group.concept}|${f.group.match?.value ?? ''}`.toLowerCase() : null);

/**
 * The checkbox a field depends on: the forms show a diagnosis's date, a drug's dose and an "Other" answer's text only
 * once its checkbox in the same group is ticked
 */
export function leaderOf(field: ArtField, fields: Array<ArtField>): ArtField | null {
  const key = groupKey(field);
  return (key && !field.checkbox && fields.find((f) => f.checkbox && groupKey(f) === key)) || null;
}

/** Changes one field, clearing what depends on it when a checkbox is unticked */
export function changeField(fields: Array<ArtField>, values: Record<string, FieldValue>, field: ArtField, value: FieldValue) {
  const next = { ...values, [field.name]: value };
  if (field.checkbox && !value) {
    fields.filter((f) => leaderOf(f, fields) === field).forEach((f) => (next[f.name] = null));
    if (field.comment) {
      next[field.comment] = null;
    }
  }
  return next;
}

interface GroupedFieldsProps {
  fields: Array<ArtField>;
  values: Record<string, FieldValue>;
  onChange: (values: Record<string, FieldValue>) => void;
  rules?: Record<string, RuleResult>;
  references?: Record<string, FieldValue>;
  readOnly?: boolean;
}

/** A panel's fields, each shown once the checkbox it depends on is ticked, with its "specify" comment */
export const GroupedFields: React.FC<GroupedFieldsProps> = ({ fields, values, onChange, rules = {}, references = {}, readOnly }) => {
  const { t } = useTranslation();
  return (
    <>
      {fields.map((f) => {
        const leader = leaderOf(f, fields);
        if (leader && !values[leader.name]) {
          return null;
        }
        return (
          <div key={f.name} className={leader ? styles.dependent : undefined}>
            {f.heading && <p className={styles.legend}>{t(`heading_${f.heading}`, f.heading)}</p>}
            <ArtFieldInput
              field={f}
              value={values[f.name] ?? null}
              reference={references[f.name]}
              readOnly={readOnly}
              rule={rules[f.name] ?? null}
              onChange={(value) => onChange(changeField(fields, values, f, value))}
            />
            {f.comment && values[f.name] && (
              <TextInput
                id={`mh-${f.comment}`}
                labelText={t('specify', 'Specify')}
                value={(values[f.comment] as string) ?? ''}
                readOnly={readOnly}
                onChange={(e) => onChange({ ...values, [f.comment]: e.target.value || null })}
              />
            )}
          </div>
        );
      })}
    </>
  );
};
