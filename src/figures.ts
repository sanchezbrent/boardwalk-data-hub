/** Stable identities from Boardwalk's existing compiled reader. No editorial values. */
export const FIGURE_IDS = [
  "unemployment",
  "industryjobs",
  "minimumwage",
  "medianincome",
  "propertytax",
  "electricity",
  "medianrent",
  "housingpermits",
  "inflationmetro",
  "precipitation",
  "temperature",
  "voterregistration",
  "statebudget",
  "familycare",
  "uninsured",
  "snap",
  "schoolabsence",
  "graduation",
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];
