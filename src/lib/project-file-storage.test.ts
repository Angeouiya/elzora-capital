import test from "node:test";
import assert from "node:assert/strict";
import {
  D1_PROJECT_FILE_PREFIX,
  PROJECT_FILE_CHUNK_SIZE,
  assembleProjectFile,
  d1ProjectFileKey,
  isD1ProjectFile,
  splitProjectFile,
} from "./project-file-storage";

test("project files are split and reassembled without altering their bytes", () => {
  const source = new Uint8Array(PROJECT_FILE_CHUNK_SIZE * 2 + 37);
  source.forEach((_, index) => { source[index] = index % 251; });
  const chunks = splitProjectFile(source.buffer);
  assert.equal(chunks.length, 3);
  assert.deepEqual(assembleProjectFile(chunks), source);
});

test("D1 project file keys are explicit and detectable", () => {
  const key = d1ProjectFileKey("document-1");
  assert.equal(key, `${D1_PROJECT_FILE_PREFIX}document-1`);
  assert.equal(isD1ProjectFile(key), true);
  assert.equal(isD1ProjectFile("projects/document-1"), false);
});
