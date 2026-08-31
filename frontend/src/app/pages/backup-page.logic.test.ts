import assert from "node:assert/strict";
import test from "node:test";
import {
  backupCopy,
  backupErrorMessage,
  backupResultState,
  formatBackupSize,
  isBackupActionDisabled,
} from "./backup-page.logic.ts";

test("provides complete Arabic RTL and French user-facing copy", () => {
  assert.equal(backupCopy.ar.title, "النسخ الاحتياطي والاستعادة");
  assert.equal(backupCopy.fr.title, "Sauvegarde et restauration");
  assert.match(backupCopy.ar.externalDescription, /USB/);
  assert.match(backupCopy.fr.externalDescription, /USB/);
  assert.equal(backupCopy.ar.autoTitle, "النسخ الاحتياطي التلقائي");
  assert.equal(backupCopy.fr.historyTitle, "Dernières sauvegardes");
  assert.match(backupCopy.ar.externalReminder, /14/);
});

test("disables backup actions while create or inspection is active", () => {
  assert.equal(isBackupActionDisabled(false, false, false), true);
  assert.equal(isBackupActionDisabled(true, true, false), true);
  assert.equal(isBackupActionDisabled(true, false, true), true);
  assert.equal(isBackupActionDisabled(true, false, false), false);
  assert.equal(isBackupActionDisabled(true, false, false, true), true);
});

test("distinguishes success, cancellation and errors", () => {
  assert.equal(backupResultState({ success: true }), "success");
  assert.equal(
    backupResultState({ success: false, cancelled: true }),
    "cancelled",
  );
  assert.equal(backupResultState({ success: false }), "error");
});

test("maps safe localized errors and formats file size", () => {
  assert.equal(
    backupErrorMessage("INSUFFICIENT_SPACE", "fr"),
    "Espace disque insuffisant.",
  );
  assert.equal(
    backupErrorMessage("BACKUP_IN_PROGRESS", "ar"),
    "يتم إنشاء نسخة احتياطية حاليًا.",
  );
  assert.match(
    backupErrorMessage("SAFETY_BACKUP_FAILED", "fr"),
    /sauvegarde de sécurité/i,
  );
  assert.match(backupErrorMessage("RESTORE_FAILED", "ar"), /استعادة/);
  assert.match(formatBackupSize(2048, "fr"), /2\sKo/);
});
