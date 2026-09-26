export const D1_PROJECT_FILE_PREFIX = "d1:";
export const PROJECT_FILE_CHUNK_SIZE = 512 * 1024;

export function d1ProjectFileKey(documentId: string) {
  return `${D1_PROJECT_FILE_PREFIX}${documentId}`;
}

export function isD1ProjectFile(storageKey: string | null | undefined) {
  return Boolean(storageKey?.startsWith(D1_PROJECT_FILE_PREFIX));
}

export function splitProjectFile(buffer: ArrayBuffer): ArrayBuffer[] {
  const bytes = new Uint8Array(buffer);
  const chunks: ArrayBuffer[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += PROJECT_FILE_CHUNK_SIZE) {
    const part = bytes.slice(offset, Math.min(offset + PROJECT_FILE_CHUNK_SIZE, bytes.byteLength));
    chunks.push(part.buffer);
  }
  return chunks;
}

export function projectFileChunkStatements(
  database: D1Database,
  documentId: string,
  buffer: ArrayBuffer
) {
  return splitProjectFile(buffer).map((chunk, sequence) =>
    database
      .prepare(
        `INSERT INTO ProjectDocumentChunk (id, documentId, sequence, data)
         VALUES (?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), documentId, sequence, chunk)
  );
}

export function assembleProjectFile(chunks: ArrayBuffer[]) {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readD1ProjectFile(database: D1Database, documentId: string) {
  const result = await database
    .prepare(
      `SELECT data FROM ProjectDocumentChunk
       WHERE documentId = ? ORDER BY sequence ASC`
    )
    .bind(documentId)
    .all<{ data: ArrayBuffer }>();
  if (result.results.length === 0) return null;
  return assembleProjectFile(result.results.map((row) => row.data));
}
