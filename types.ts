// Fix: Add a global declaration for the `google` object to resolve type errors.
declare global {
  interface Window {
    google: any;
  }
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface Permissions {
  location: boolean;
  microphone: boolean;
  notifications: boolean;
}

export interface UserSettings {
  name: string;
  photo: string; //
  medicalInfo: {
    bloodType: string;
    allergies: string;
  };
  safePin: string;
  duressPin: string;
  safeWord: string;
  contacts: Contact[];
  permissions: Permissions;
}

export enum TripMode {
  Timer = 'Timer',
  Destination = 'Destination'
}

export interface TripDetails {
  mode: TripMode;
  durationMinutes: number; // For Timer mode
  origin: string; // For Destination mode
  destination: string; // For Destination mode
  contacts: Contact[];
  startTime: number;
  eta: number;
  overview_polyline?: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}