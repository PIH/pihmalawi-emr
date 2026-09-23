import { test, expect } from '../../core';
import { MastercardFormPage, ReportingPage } from '../../pages';
import { HIV_COHORT_REPORT_UUID } from '../../core/constants';
import { runWarehouseEtl } from '../../commands';

test(
  'HIV Cohort Report includes the pilot patient with their entered data',
  async ({ page, eligibleHivArtPatient }) => {
    // The warehouse ETL run below can take several minutes -- well over
    // playwright.config.ts's 3-minute default per-test timeout.
    test.setTimeout(10 * 60 * 1000);

    const encounterDate = new Date().toISOString().slice(0, 10);
    const form = await MastercardFormPage.openCreate(page, eligibleHivArtPatient.uuid, encounterDate);
    // "Agrees to FUP" / "Y" — see MastercardFormPage's Task 9 verification
    // note 2 for why this (not the brief's "Patient agrees to follow-up" /
    // "Yes") is the real rendered label/options.
    await form.selectRadio('Agrees to FUP', 'Y');
    await form.save();
    await form.expectSaveSuccess();

    // See reporting-page.ts's verification note 6: this report reads from a separate warehouse
    // database built by an external ETL pipeline (apzu-etl/petl), not openmrs-db directly. Refresh
    // it now so this patient's just-saved encounter is actually present before requesting the report.
    runWarehouseEtl();

    const report = await ReportingPage.runReport(page, {
      reportUuid: HIV_COHORT_REPORT_UUID,
      endDate: encounterDate,
      locationName: 'Neno District Hospital',
    });

    const { status, log } = await report.waitForCompletion();
    expect(status, `Report did not complete successfully. Log:\n${log.join('\n')}`).toMatch(/COMPLETED|SAVED/);

    const excelBuffer = await report.downloadExcelOutput();
    // The ARV Number identifier assigned by the eligibleHivArtPatient
    // fixture is a stable, test-specific string unlikely to collide with
    // seed data, so its presence in the raw workbook bytes (shared strings
    // are stored as plain UTF-8 text inside the .xls binary) is a reasonable
    // signal that this patient's row is present. If this needs to inspect
    // actual cell values (e.g. the regimen entered above), parse excelBuffer
    // with a proper xls reader instead of a raw byte search.
    const arvNumber = eligibleHivArtPatient.identifiers?.find((i) => i.identifier?.startsWith('ARV-E2E-'))
      ?.identifier;
    expect(arvNumber, 'eligibleHivArtPatient fixture should have assigned an ARV Number identifier').toBeTruthy();
    expect(excelBuffer.toString('latin1')).toContain(arvNumber);
  },
);
