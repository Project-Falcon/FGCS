import { readSettingsSync } from "./persistedSettings.js"

export const DEFAULT_GCS_SYSTEM_ID = 255
export const MIN_GCS_SYSTEM_ID = 1
export const MAX_GCS_SYSTEM_ID = 255

export function normaliseGcsSystemId(value) {
  const parsed = Number(value)

  if (
    !Number.isInteger(parsed) ||
    parsed < MIN_GCS_SYSTEM_ID ||
    parsed > MAX_GCS_SYSTEM_ID
  ) {
    return DEFAULT_GCS_SYSTEM_ID
  }

  return parsed
}

export function readGcsSystemIdSync() {
  const { readable, settings } = readSettingsSync()

  if (!readable) {
    return DEFAULT_GCS_SYSTEM_ID
  }

  return normaliseGcsSystemId(settings?.General?.gcsSystemId)
}
