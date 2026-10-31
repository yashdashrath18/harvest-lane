import { EMBEDDED_ASSETS } from '../generated/embeddedAssets';

const cache = new Map<string, string>();

/**
 * Resolves a bundled binary asset ('models/Cow.glb', 'audio/click.ogg')
 * to a Blob URL decoded from the embedded base64 copy, so the game
 * ships as one self-contained bundle. Falls back to the plain path
 * when no embedded copy exists.
 */
export function assetUrl(path: string): string {
  const hit = cache.get(path);
  if (hit) return hit;
  const chunks = EMBEDDED_ASSETS[path];
  if (!chunks) return path;
  const b64 = chunks.join('');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const mime = path.endsWith('.glb')
    ? 'model/gltf-binary'
    : path.endsWith('.ogg')
      ? 'audio/ogg'
      : 'application/octet-stream';
  const url = URL.createObjectURL(new Blob([bytes.buffer], { type: mime }));
  cache.set(path, url);
  return url;
}
