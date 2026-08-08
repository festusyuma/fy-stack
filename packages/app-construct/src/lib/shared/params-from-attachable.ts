import { Attachable } from '@fy-stack/types';

export function paramsFromAttachable(attachable: Record<string, Attachable>) {
  return Object.entries(attachable).map(([key, val]) => {
    return Object.fromEntries(
      Object.entries(val?.attachable() ?? {}).map(([subKey, subVal]) => [
        `${key}_${subKey}`.toUpperCase(),
        subVal,
      ])
    );
  });
}
