import React from 'react';
import { type ArtEncounter, memberValue, obsGroups } from '../art/art.resource';
import { MH_VISIT, NON_CODED_TEXT } from '../mental-health/mh-concepts';

/**
 * The medications a card's visit dispenses, each in its own dispensing group: the mental health and epilepsy visits
 * share the groups and their concepts, each with its own drugs
 */
export interface CardMedication {
  key: string;
  drug: string;
  label: string;
  /** As the card writes it, e.g. RIS */
  short: string;
  /** As the medication history spells it out, e.g. Risperidone */
  name: string;
}

const same = (a: unknown, b: string) => String(a ?? '').toLowerCase() === b.toLowerCase();
const label = (options: Array<{ value: string; label: string }>, value: unknown) => options.find((o) => same(value, o.value))?.label ?? null;

/** The dose units the cards' visits offer: the mental health ones, and the chronic lung disease visit's puffs */
const DOSE_UNITS = [...MH_VISIT.doseUnits, { value: '162372aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', label: 'puff(s)' }];

/** A visit's medications, as the card writes them: e.g. RIS 2 mg, with its frequency */
export function medicationsOf(visit: ArtEncounter, medications: Array<CardMedication>) {
  return obsGroups(visit, MH_VISIT.dispensingGroup)
    .map((g) => {
      const med = medications.find((m) => same(memberValue(g, MH_VISIT.medication), m.drug));
      if (!med) {
        return null;
      }
      const name = med.key === 'other' ? (memberValue(g, NON_CODED_TEXT) as string) || med.short : med.short;
      const dose = [memberValue(g, MH_VISIT.dose), label(DOSE_UNITS, memberValue(g, MH_VISIT.doseUnit))]
        .filter((x) => x !== null && x !== '')
        .join(' ');
      const amount = [name, dose].filter(Boolean).join(' ');
      const frequency = MH_VISIT.frequencies.find((f) => same(memberValue(g, MH_VISIT.frequency), f.value));
      return {
        amount,
        short: name,
        dose,
        name: med.key === 'other' ? name : med.name,
        frequency: frequency?.label ?? null,
        frequencyWords: frequency?.words ?? null,
      };
    })
    .filter(Boolean);
}

export type Medication = ReturnType<typeof medicationsOf>[number];

export const medicationText = (m: { amount: string; frequency: string | null }) => [m.amount, m.frequency].filter(Boolean).join(' ');

/** A medication as the medication history writes it, as in the mockup: RIS · risperidone 2 mg twice daily */
export const MedicationEntry: React.FC<{ medication: Medication }> = ({ medication: m }) => {
  const fullName = m.name && m.name.toLowerCase() !== m.short.toLowerCase() ? m.name.toLowerCase() : null;
  const rest = [fullName, m.dose, m.frequencyWords].filter(Boolean).join(' ');
  return (
    <span>
      <b>{m.short}</b>
      {rest && ` · ${rest}`}
    </span>
  );
};

/** The visits at which the medications changed (the first visit with any counting as one), newest first */
export function medicationChanges(visits: Array<ArtEncounter>, medications: Array<CardMedication>) {
  const changes: Array<{ date: string; text: string; medications: Array<Medication> }> = [];
  [...visits].reverse().forEach((v) => {
    const meds = medicationsOf(v, medications);
    if (!meds.length) {
      return;
    }
    const sorted = [...meds].sort((a, b) => medicationText(a).localeCompare(medicationText(b)));
    const text = sorted.map(medicationText).join(', ');
    if (changes[changes.length - 1]?.text !== text) {
      changes.push({ date: v.encounterDatetime, text, medications: sorted });
    }
  });
  return changes.reverse();
}

/** The current medication headline's detail: each drug's name and how often, e.g. Risperidone · twice daily */
export const medicationDetail = (meds: Array<Medication>) =>
  meds.map((m) => [m.name, m.frequencyWords].filter(Boolean).join(' · ')).join(', ') || null;
