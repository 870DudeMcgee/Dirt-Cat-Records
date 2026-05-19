const recordsDefault = require("../db/studio-records");
const driveDefault = require("../google/drive");
const { markCleanup } = require("./test-report");

async function cleanupAutomationTestRun({
  report,
  records = recordsDefault,
  drive = driveDefault,
} = {}) {
  if (!report?.id) throw new Error("test_run_id is required for cleanup.");
  const errors = [];

  for (const folder of report.createdDriveFolders || []) {
    if (!folder.id || typeof drive.deleteDriveFolder !== "function") continue;
    try {
      await drive.deleteDriveFolder(folder.id);
    } catch (error) {
      errors.push(`Drive folder ${folder.id}: ${error.message}`);
    }
  }

  for (const record of [...(report.createdRecords || [])].reverse()) {
    if (
      record.table === "projects" ||
      !record.table ||
      !record.id ||
      typeof records.deleteStudioRecord !== "function"
    )
      continue;
    try {
      await records.deleteStudioRecord(record.table, record.id);
    } catch (error) {
      errors.push(`${record.table} ${record.id}: ${error.message}`);
    }
  }

  for (const record of [...(report.createdRecords || [])].reverse()) {
    if (record.table !== "projects" || !record.id) continue;
    if (typeof records.deleteStudioRecord === "function") {
      try {
        await records.deleteStudioRecord("projects", record.id);
        continue;
      } catch (_deleteError) {
        // Fall through to non-destructive project close.
      }
    }
    if (typeof records.updateProject === "function") {
      try {
        await records.updateProject(record.id, {
          status: "closed",
          final_delivery_locked: true,
        });
        continue;
      } catch (error) {
        errors.push(`Project ${record.id}: ${error.message}`);
      }
    }
  }

  const cleanupStatus = errors.length ? "failed" : "cleaned";
  const cleanedReport = markCleanup(
    { ...report, errors: [...(report.errors || []), ...errors] },
    cleanupStatus
  );
  if (typeof records.updateAutomationTestRun === "function") {
    await records.updateAutomationTestRun(report.id, {
      status:
        cleanupStatus === "cleaned" ? "cleaned" : report.status || "failed",
      cleanupStatus,
      report: cleanedReport,
    });
  }
  return cleanedReport;
}

module.exports = {
  cleanupAutomationTestRun,
};
