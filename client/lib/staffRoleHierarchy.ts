export enum StaffTier {
  TIER_1_LEADERSHIP = 0, // EICs, Executive Producers
  TIER_2_SENIOR = 1, // Associate Producers, Managing Editors
  TIER_3_EDITORS = 2, // Editors, Managers
  TIER_4_CONTRIBUTORS = 3, // Reporters, Writers, Everyone Else
  TIER_5_ADVISERS = 4, // Advisers (special category)
}

export function getUnifiedRoleRank(role: string): StaffTier {
  const roleLower = role.toLowerCase();

  // Tier 1: Top leadership
  if (
    roleLower.includes("editor-in-chief") ||
    roleLower.includes("eic") ||
    roleLower.includes("executive producer")
  ) {
    return StaffTier.TIER_1_LEADERSHIP;
  }

  // Tier 2: Senior leadership
  if (
    roleLower.includes("managing editor") ||
    roleLower.includes("associate producer")
  ) {
    return StaffTier.TIER_2_SENIOR;
  }

  // Tier 3: Editors and managers
  if (roleLower.includes("editor") || roleLower.includes("manager")) {
    return StaffTier.TIER_3_EDITORS;
  }

  // Tier 5: Advisers (special)
  if (roleLower.includes("adviser") || roleLower.includes("advisor")) {
    return StaffTier.TIER_5_ADVISERS;
  }

  // Tier 4: Default (reporters, writers, etc.)
  return StaffTier.TIER_4_CONTRIBUTORS;
}

export function getTierLabel(tier: StaffTier): string {
  switch (tier) {
    case StaffTier.TIER_1_LEADERSHIP:
      return "Leadership";
    case StaffTier.TIER_2_SENIOR:
      return "Senior Staff";
    case StaffTier.TIER_3_EDITORS:
      return "Editors & Managers";
    case StaffTier.TIER_4_CONTRIBUTORS:
      return "Contributors";
    case StaffTier.TIER_5_ADVISERS:
      return "Advisers";
  }
}
