export interface WalletCursor {
  createdAt: string;
  id: string;
}

export function encodeWalletCursor(cursor: WalletCursor): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export function decodeWalletCursor(value: string | null): WalletCursor | null {
  if (!value || value.length > 180) return null;
  const separator = value.lastIndexOf("|");
  if (separator < 1) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!Number.isFinite(new Date(createdAt).getTime())) return null;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  return { createdAt, id };
}
