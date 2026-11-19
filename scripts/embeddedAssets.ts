// Stub populated temporarily during `bun run build:exe` with base64-encoded `dist/` assets.
export interface EmbeddedAsset {
  mime: string;
  base64: string;
}

export const EMBEDDED_DIST_ASSETS: Record<string, EmbeddedAsset> = {};
