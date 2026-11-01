// Publication configuration for all PALY journalism publications
// All publications use the same WordPress REST API structure

import type { SnoAdConfig } from "@/lib/articleAds";

export interface MenuItem {
  label: string;
  route: string;
  // WordPress page slug (for pages loaded via WordPressPageScreen)
  pageSlug?: string;
}

export interface Publication {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  apiBaseUrl: string;
  // Colors for branding (primary accent color)
  primaryColor: string;
  // Favicon URL from the publication's website
  logoUrl: string;
  // Default "current year" ID for staff (varies by publication)
  currentYearId: number;
  externalFeedType?: "soundcloud" | "issuu";
  sourceType?: "podcast" | "issue" | "article";
  // SNO Distribution Network in-content ad spot, when the site runs one.
  // Only present for publications with an in-article ad on their website.
  snoAds?: SnoAdConfig;
  // Menu items for the drawer - each publication can have different pages
  menuItems: MenuItem[];
}

// Special "Home" publication that shows unified feed from all publications
export const HOME_PUBLICATION: Publication = {
  id: "home",
  name: "Home",
  shortName: "Home",
  domain: "",
  apiBaseUrl: "", // Not used - unified feed handles fetching from all publications
  primaryColor: "#000000",
  logoUrl: "", // Uses home icon instead
  currentYearId: 0,
  menuItems: [
    { label: "ALL STAFF", route: "AllStaff" },
    { label: "ABOUT", route: "About" },
  ],
};

export const PUBLICATIONS: Publication[] = [
  {
    id: "palyvoice",
    name: "The Paly Voice",
    shortName: "Paly Voice",
    domain: "palyvoice.com",
    apiBaseUrl: "https://palyvoice.com/wp-json/wp/v2",
    primaryColor: "#0D724D",
    logoUrl: "https://www.google.com/s2/favicons?domain=palyvoice.com&sz=128",
    currentYearId: 113558,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
      { label: "POLICIES", route: "Policies", pageSlug: "policies" },
      { label: "CONTACT US", route: "ContactUs", pageSlug: "contact" },
      { label: "CORRECTIONS", route: "Corrections", pageSlug: "corrections" },
      { label: "ARCHIVES", route: "Archives", pageSlug: "archives" },
      { label: "ADVERTISING", route: "Advertising", pageSlug: "ads" },
      { label: "SPONSOR", route: "Sponsor", pageSlug: "sponsor" },
    ],
  },
  {
    id: "infocus",
    name: "InFocus",
    shortName: "InFocus",
    domain: "infocusnews.tv",
    apiBaseUrl: "https://infocusnews.tv/wp-json/wp/v2",
    primaryColor: "#38A300",
    logoUrl: "https://www.google.com/s2/favicons?domain=infocusnews.tv&sz=128",
    currentYearId: 119,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
      { label: "CONTACT US", route: "ContactUs", pageSlug: "contact-us" },
    ],
  },
  {
    id: "campanile",
    name: "The Campanile",
    shortName: "Campanile",
    domain: "thecampanile.org",
    apiBaseUrl: "https://thecampanile.org/wp-json/wp/v2",
    primaryColor: "#1A3175",
    logoUrl:
      "https://www.google.com/s2/favicons?domain=thecampanile.org&sz=128",
    currentYearId: 3937,
    snoAds: { clientId: "2101", inContentSpotId: "5915" },
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about-us" },
      { label: "STAFF", route: "Staff" },
      { label: "ADVERTISE", route: "Advertising", pageSlug: "advertise" },
      { label: "SPONSOR", route: "Sponsor", pageSlug: "sponsor" },
    ],
  },
  {
    id: "verde",
    name: "Verde Magazine",
    shortName: "Verde",
    domain: "verdemagazine.com",
    apiBaseUrl: "https://verdemagazine.com/wp-json/wp/v2",
    primaryColor: "#1AA351",
    logoUrl:
      "https://www.google.com/s2/favicons?domain=verdemagazine.com&sz=128",
    currentYearId: 18763,
    menuItems: [
      { label: "STAFF", route: "Staff" },
      {
        label: "POLICIES",
        route: "Policies",
        pageSlug: "verde-magazine-policies",
      },
      { label: "SPONSORS", route: "Sponsor", pageSlug: "sponsors" },
    ],
  },
  {
    id: "cmag",
    name: "C Magazine",
    shortName: "C Mag",
    domain: "cmagazine.org",
    apiBaseUrl: "https://cmagazine.org/wp-json/wp/v2",
    primaryColor: "#4F90BC",
    logoUrl: "https://www.google.com/s2/favicons?domain=cmagazine.org&sz=128",
    currentYearId: 424,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
      {
        label: "POLICIES",
        route: "Policies",
        pageSlug: "policies-and-standards",
      },
      {
        label: "ADVERTISE",
        route: "Advertising",
        pageSlug: "advertise-and-sponsor",
      },
    ],
  },
  {
    id: "viking",
    name: "Viking Sports Magazine",
    shortName: "Viking",
    domain: "vikingsportsmag.com",
    apiBaseUrl: "https://vikingsportsmag.com/wp-json/wp/v2",
    primaryColor: "#1F4723",
    logoUrl:
      "https://www.google.com/s2/favicons?domain=vikingsportsmag.com&sz=128",
    currentYearId: 4164,
    menuItems: [
      {
        label: "GENERAL INFO",
        route: "GeneralInfo",
        pageSlug: "general-information",
      },
      { label: "STAFF", route: "Staff" },
      {
        label: "SPONSORSHIPS",
        route: "Sponsorships",
        pageSlug: "sponsorships",
      },
    ],
  },
  {
    id: "anthro",
    name: "Anthro Magazine",
    shortName: "Anthro",
    domain: "anthromagazine.org",
    apiBaseUrl: "https://anthromagazine.org/wp-json/wp/v2",
    primaryColor: "#1E73BE",
    logoUrl:
      "https://www.google.com/s2/favicons?domain=anthromagazine.org&sz=128",
    currentYearId: 922,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
      { label: "POLICIES", route: "Policies", pageSlug: "ethics-policy" },
      { label: "SPONSOR", route: "Sponsor", pageSlug: "sponsor" },
      { label: "ADVERTISE", route: "Advertising", pageSlug: "advertising" },
    ],
  },
  {
    id: "archive",
    name: "Paly Journalism Archive",
    shortName: "Archive",
    domain: "palyjournalismarchive.pausd.org",
    apiBaseUrl: "",
    primaryColor: "#316D43",
    logoUrl:
      "https://palyjournalismarchive.pausd.org/custom/paloalto/web/favicon.ico?lmd=1643853978",
    currentYearId: 0,
    menuItems: [],
  },
  {
    id: "ink",
    name: "Ink Literary Magazine",
    shortName: "Ink",
    domain: "inkliterarymag.org",
    apiBaseUrl: "https://inkliterarymag.org/wp-json/wp/v2",
    primaryColor: "#008000",
    logoUrl:
      "https://www.google.com/s2/favicons?domain=inkliterarymag.org&sz=128",
    currentYearId: 52,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
      { label: "SUBMIT", route: "Submit", pageSlug: "submit" },
      { label: "POLICIES", route: "Policies", pageSlug: "mission-statement" },
      { label: "ADVERTISE", route: "Advertising", pageSlug: "advertising" },
    ],
  },
  {
    id: "veritas",
    name: "Veritas",
    shortName: "Veritas",
    domain: "palyveritas.com",
    apiBaseUrl: "https://palyveritas.com/wp-json/wp/v2",
    primaryColor: "#990000",
    logoUrl: "https://www.google.com/s2/favicons?domain=palyveritas.com&sz=128",
    currentYearId: 0,
    menuItems: [
      { label: "ABOUT", route: "About", pageSlug: "about" },
      { label: "STAFF", route: "Staff" },
    ],
  },
  {
    id: "viaverde",
    name: "Via Verde",
    shortName: "Via Verde",
    domain: "issuu.com/viaverdemag",
    apiBaseUrl: "",
    primaryColor: "#1F385C",
    logoUrl: "https://www.google.com/s2/favicons?domain=issuu.com&sz=128",
    currentYearId: 0,
    externalFeedType: "issuu",
    sourceType: "issue",
    menuItems: [],
  },
  {
    id: "kply",
    name: "KPLY",
    shortName: "KPLY",
    domain: "soundcloud.com/palyradio",
    apiBaseUrl: "",
    primaryColor: "#FF5500",
    logoUrl: "https://www.google.com/s2/favicons?domain=soundcloud.com&sz=128",
    currentYearId: 0,
    externalFeedType: "soundcloud",
    sourceType: "podcast",
    menuItems: [],
  },
  {
    id: "proof",
    name: "[proof]",
    shortName: "[proof]",
    domain: "issuu.com/proofpaly",
    apiBaseUrl: "",
    primaryColor: "#111827",
    logoUrl: "https://www.google.com/s2/favicons?domain=issuu.com&sz=128",
    currentYearId: 0,
    externalFeedType: "issuu",
    sourceType: "issue",
    menuItems: [],
  },
];

export const WORDPRESS_PUBLICATIONS = PUBLICATIONS.filter(
  (publication) => publication.apiBaseUrl,
);

export const FEED_PUBLICATIONS = PUBLICATIONS.filter(
  (publication) => publication.apiBaseUrl || publication.externalFeedType,
);

export const NOTIFICATION_PUBLICATIONS = FEED_PUBLICATIONS;

export const DEFAULT_PUBLICATION = PUBLICATIONS[0]; // Paly Voice as default

export function getPublicationById(id: string): Publication | undefined {
  return PUBLICATIONS.find((p) => p.id === id);
}

export function getPublicationByDomain(
  domain: string,
): Publication | undefined {
  return PUBLICATIONS.find((p) => p.domain === domain);
}
