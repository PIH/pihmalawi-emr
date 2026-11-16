import { type ArtField } from '../art/art-fields';
import { type CardForm, type FieldValue } from '../art/obs-diff';

/**
 * A PDC condition card (HIE / developmental delay, trisomy 21, cleft lip / palate, other diagnosis): each is a header,
 * a visit form and a lab form of its own, plus the forms every condition card shares (pdc-shared-forms.ts). This
 * describes one, so that the page, its panels and the summary are the same code for all of them.
 */

export type PdcConditionForm = 'header' | 'visit' | 'labs';

/**
 * A row of the monitoring table or a column of the visits table. 'value' shows the first field's answer; 'yes' the
 * labels of those answered Yes (e.g. a Hypo tone); 'drug' the drug and dose, and whether the dose was adjusted
 */
export interface PdcSummaryItem {
  key: string;
  label: string;
  fields: Array<ArtField>;
  mode?: 'value' | 'yes' | 'drug';
  /** In red when the raw answer of the first field is a worrying one, e.g. severe malnutrition */
  alert?: (value: FieldValue) => boolean;
}

/** A column of the lab tests table: its fields' answers joined, each with its own date when it carries one */
export interface PdcLabColumn {
  key: string;
  label: string;
  items: Array<{ field: ArtField; prefix?: string }>;
}

/** A part of the visit panel: a title, then its fields, rows of fields side by side, or a legend over those after it */
export interface PdcVisitSection {
  key: string;
  title: string;
  rows: Array<ArtField | Array<ArtField> | { legend: string }>;
}

export interface PdcCondition {
  /** The eMastercards endpoint's key, e.g. pdc-trisomy */
  key: string;
  /** The translation keys' prefix, e.g. trisomy for trisomyPatientCard, recordTrisomyVisit, trisomySection_overview */
  prefix: string;
  /** The condition as a sentence names it, e.g. trisomy 21, and as a title does, e.g. Trisomy 21 */
  name: string;
  title: string;
  /** The paper card's version, which the page names under its title */
  version: string;
  /** The card's form name, for the message when it has several headers */
  cardName: string;
  forms: Record<PdcConditionForm, CardForm>;
  workspaces: Record<PdcConditionForm, string>;
  headerSections: Record<string, { title: string; fields: Array<ArtField> }>;
  /** Every question of the visit form, by name; height, weight, muac, malnutrition, mdatSummary and nextAppointment are expected */
  visitFields: Record<string, ArtField>;
  visitSections: Array<PdcVisitSection>;
  /** The form's description of what the visit saves, for the panel's documentation */
  monitoring: Array<PdcSummaryItem>;
  /** The visits table's columns between the date and location and the referral and next appointment */
  visitColumns: Array<PdcSummaryItem>;
  /** Whether a malnutrition answer is moderate or severe, as the card flags it in red */
  malnourished: (value: FieldValue) => boolean;
  labs: { fields: Array<ArtField>; columns: Array<PdcLabColumn> };
}

export const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The translation key of one of the card's own strings, e.g. recordTrisomyVisit */
export const conditionKey = (c: PdcCondition, pattern: string) => pattern.replace('{P}', capitalized(c.prefix)).replace('{p}', c.prefix);
