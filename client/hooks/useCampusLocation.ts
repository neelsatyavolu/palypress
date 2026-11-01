import { useEffect, useState } from "react";
import * as Location from "expo-location";

import { isOnCampus, latLngToXY, MapPoint } from "@/lib/campusGeo";

export type CampusLocationStatus =
  | "loading"
  | "denied"
  | "unavailable"
  | "off-campus"
  | "on-campus";

export interface CampusLocation {
  status: CampusLocationStatus;
  point: MapPoint | null;
  accuracyMeters: number | null;
}

const INITIAL: CampusLocation = {
  status: "loading",
  point: null,
  accuracyMeters: null,
};

function toCampusLocation(coords: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): CampusLocation {
  if (!isOnCampus(coords.latitude, coords.longitude)) {
    return { status: "off-campus", point: null, accuracyMeters: null };
  }
  return {
    status: "on-campus",
    point: latLngToXY(coords.latitude, coords.longitude),
    accuracyMeters: coords.accuracy,
  };
}

// Watches the device position while the consuming screen is mounted.
// Foreground-only; the subscription is removed on unmount. Location data
// stays on-device — it is never sent to the server or analytics.
export function useCampusLocation(): CampusLocation {
  const [location, setLocation] = useState<CampusLocation>(INITIAL);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== Location.PermissionStatus.GRANTED) {
          setLocation({ status: "denied", point: null, accuracyMeters: null });
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 3,
          },
          (position) => {
            setLocation(toCampusLocation(position.coords));
          },
        );
      } catch {
        if (!cancelled) {
          setLocation({
            status: "unavailable",
            point: null,
            accuracyMeters: null,
          });
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return location;
}
