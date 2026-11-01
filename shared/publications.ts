// Shared publication configuration for client and server
// All publications use the same WordPress REST API structure

export interface PublicationConfig {
  id: string;
  name: string;
  domain: string;
  wpApiBaseUrl: string;
  primaryColor: string;
}

export const PUBLICATION_CONFIGS: PublicationConfig[] = [
  {
    id: "palyvoice",
    name: "The Paly Voice",
    domain: "palyvoice.com",
    wpApiBaseUrl: "https://palyvoice.com/wp-json/wp/v2",
    primaryColor: "#0D724D",
  },
  {
    id: "infocus",
    name: "InFocus",
    domain: "infocusnews.tv",
    wpApiBaseUrl: "https://infocusnews.tv/wp-json/wp/v2",
    primaryColor: "#38A300",
  },
  {
    id: "campanile",
    name: "The Campanile",
    domain: "thecampanile.org",
    wpApiBaseUrl: "https://thecampanile.org/wp-json/wp/v2",
    primaryColor: "#1A3175",
  },
  {
    id: "verde",
    name: "Verde Magazine",
    domain: "verdemagazine.com",
    wpApiBaseUrl: "https://verdemagazine.com/wp-json/wp/v2",
    primaryColor: "#1AA351",
  },
  {
    id: "cmag",
    name: "C Magazine",
    domain: "cmagazine.org",
    wpApiBaseUrl: "https://cmagazine.org/wp-json/wp/v2",
    primaryColor: "#4F90BC",
  },
  {
    id: "anthro",
    name: "Anthro Magazine",
    domain: "anthromagazine.org",
    wpApiBaseUrl: "https://anthromagazine.org/wp-json/wp/v2",
    primaryColor: "#1E73BE",
  },
  {
    id: "ink",
    name: "Ink Literary Magazine",
    domain: "inkliterarymag.org",
    wpApiBaseUrl: "https://inkliterarymag.org/wp-json/wp/v2",
    primaryColor: "#008000",
  },
  {
    id: "veritas",
    name: "Veritas",
    domain: "palyveritas.com",
    wpApiBaseUrl: "https://palyveritas.com/wp-json/wp/v2",
    primaryColor: "#990000",
  },
  {
    id: "viking",
    name: "Viking Sports Magazine",
    domain: "vikingsportsmag.com",
    wpApiBaseUrl: "https://vikingsportsmag.com/wp-json/wp/v2",
    primaryColor: "#1F4723",
  },
];

export const DEFAULT_PUBLICATION_ID = "palyvoice";

export function getPublicationConfigById(
  id: string,
): PublicationConfig | undefined {
  return PUBLICATION_CONFIGS.find((p) => p.id === id);
}

export function getPublicationConfigByDomain(
  domain: string,
): PublicationConfig | undefined {
  return PUBLICATION_CONFIGS.find((p) => p.domain === domain);
}

export function isValidPublicationId(id: string): boolean {
  return PUBLICATION_CONFIGS.some((p) => p.id === id);
}
