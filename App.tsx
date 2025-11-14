// Fix: Removed faulty google.maps type reference. Global type is now in types.ts.
import React, { useState, useEffect } from 'react';
import { UserSettings, TripDetails } from './types';
import SetupScreen from './components/SetupScreen';
import HomeScreen from './components/HomeScreen';
import ActiveTripScreen from './components/ActiveTripScreen';

type AppState = 'SETUP' | 'HOME' | 'TRIP_ACTIVE';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripDetails | null>(null);
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);

  useEffect(() => {
    // Dynamically load the Google Maps script
    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId) || window.google) {
        setIsMapsApiLoaded(true);
    } else {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapsApiLoaded(true);
        script.onerror = () => console.error("Google Maps script failed to load.");
        document.head.appendChild(script);
    }

    try {
      const savedSettings = localStorage.getItem('safeTripSettings');
      if (savedSettings) {
        setUserSettings(JSON.parse(savedSettings));
        setAppState('HOME');
      } else {
        setAppState('SETUP');
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setAppState('SETUP');
    }
  }, []);

  const handleSetupComplete = (settings: UserSettings) => {
    localStorage.setItem('safeTripSettings', JSON.stringify(settings));
    setUserSettings(settings);
    setAppState('HOME');
  };

  const handleStartTrip = (tripDetails: TripDetails) => {
    setActiveTrip(tripDetails);
    setAppState('TRIP_ACTIVE');
  };

  const handleEndTrip = () => {
    setActiveTrip(null);
    setAppState('HOME');
  };
  
  const handleResetSettings = () => {
    localStorage.removeItem('safeTripSettings');
    setUserSettings(null);
    setActiveTrip(null);
    setAppState('SETUP');
  };

  const renderContent = () => {
    switch (appState) {
      case 'SETUP':
        return <SetupScreen onSetupComplete={handleSetupComplete} />;
      case 'HOME':
        if (userSettings) {
          return <HomeScreen userSettings={userSettings} onStartTrip={handleStartTrip} onReset={handleResetSettings} isMapsApiLoaded={isMapsApiLoaded} />;
        }
        return null; // or a loading spinner
      case 'TRIP_ACTIVE':
        if (activeTrip && userSettings) {
          return <ActiveTripScreen tripDetails={activeTrip} userSettings={userSettings} onEndTrip={handleEndTrip} isMapsApiLoaded={isMapsApiLoaded} />;
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;