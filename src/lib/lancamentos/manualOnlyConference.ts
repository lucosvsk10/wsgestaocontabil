export interface ManualConferenceEntry {
  source?: string | null;
}

export function isManualOnlyConference(entries: ManualConferenceEntry[]) {
  if (!entries.length) return false;
  return entries.every(entry => String(entry.source ?? "").trim().toLocaleLowerCase("pt-BR") === "manual");
}
