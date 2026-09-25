import test from "node:test";
import assert from "node:assert/strict";
import {
  canManageProjectDocuments,
  hasValidProjectFileMagic,
  isEditableProjectStatus,
  validateProjectFile,
} from "./project-documents";

test("project documents can only be changed by authorized company mandates", () => {
  assert.equal(canManageProjectDocuments("manage"), true);
  assert.equal(canManageProjectDocuments("sign"), true);
  assert.equal(canManageProjectDocuments("submit"), true);
  assert.equal(canManageProjectDocuments("view"), false);
});

test("documents remain editable only while the company owns the dossier", () => {
  assert.equal(isEditableProjectStatus("draft"), true);
  assert.equal(isEditableProjectStatus("complement_requested"), true);
  assert.equal(isEditableProjectStatus("submitted"), false);
});

test("file signatures are checked for cover images and PDF applications", () => {
  assert.equal(hasValidProjectFileMagic(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"), true);
  assert.equal(
    hasValidProjectFileMagic(new TextEncoder().encode("%PDF-1.7"), "application/pdf"),
    true
  );
  assert.equal(hasValidProjectFileMagic(new TextEncoder().encode("not-a-pdf"), "application/pdf"), false);
});

test("project gallery accepts images but never documents", () => {
  const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "atelier.jpg", { type: "image/jpeg" });
  const pdf = new File([new TextEncoder().encode("%PDF-1.7")], "presentation.pdf", { type: "application/pdf" });
  assert.equal(validateProjectFile(image, "gallery"), null);
  assert.match(validateProjectFile(pdf, "gallery") ?? "", /image JPG/);
});

test("investor documents accept authentic DOCX and XLSX containers", () => {
  const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  assert.equal(
    hasValidProjectFileMagic(
      zipHeader,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ),
    true
  );
  assert.equal(
    hasValidProjectFileMagic(
      zipHeader,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ),
    true
  );
});
