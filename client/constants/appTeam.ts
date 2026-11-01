/**
 * The PalyPress app developers, pinned to the top of the All Staff directory.
 * Each is backed by their real WordPress staff profile so their card opens a
 * genuine bio, but is shown here under the shared "App Developer" role.
 */
export interface AppTeamMemberRef {
  // Publication id (from PUBLICATIONS) that hosts this person's profile.
  publicationId: string;
  // WordPress staff_profile id within that publication.
  profileId: number;
  // Role label to display in the developers section.
  role: string;
}

export const APP_TEAM_SECTION_TITLE = "Meet the Developers";

export const APP_TEAM: AppTeamMemberRef[] = [
  { publicationId: "infocus", profileId: 1224, role: "App Developer" }, // Neel Satyavolu
  { publicationId: "palyvoice", profileId: 180386, role: "App Developer" }, // Priya Tamura
  { publicationId: "palyvoice", profileId: 186089, role: "App Developer" }, // Oscar Varodayan
];

/** Stable key set to suppress app-team members from their home-pub sections. */
export function appTeamKey(publicationId: string, profileId: number): string {
  return `${publicationId}:${profileId}`;
}
