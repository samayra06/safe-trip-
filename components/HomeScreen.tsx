// Fix: Removed faulty google.maps type reference. Global type is now in types.ts.
import React, { useState, useEffect, useRef } from 'react';
import { UserSettings, TripMode, TripDetails } from '../types';

interface HomeScreenProps {
  userSettings: UserSettings;
  onStartTrip: (tripDetails: TripDetails) => void;
  onReset: () => void;
  isMapsApiLoaded: boolean;
}

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;

const HomeScreen: React.FC<HomeScreenProps> = ({ userSettings, onStartTrip, onReset, isMapsApiLoaded }) => {
  const [tripMode, setTripMode] = useState<TripMode>(TripMode.Destination);
  const [duration, setDuration] = useState(30);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isFetchingETA, setIsFetchingETA] = useState(false);
  const [error, setError] = useState<string>('');

  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [tripDetailsToStart, setTripDetailsToStart] = useState<TripDetails | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const mapInstanceRef = useRef<any | null>(null);
  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (isMapsApiLoaded && mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.0060 }, // Default center (NYC)
            zoom: 12,
            disableDefaultUI: true,
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
                { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
            ]
        });
    }
  }, [isMapsApiLoaded]);

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setOrigin(`${latitude}, ${longitude}`);
        setError('');
      },
      () => { setError('Could not get current location. Please enter manually.'); }
    );
  };

  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const drawRouteWithSafetyColors = (path: any[]) => {
    // Clear previous polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const segmentLength = Math.floor(path.length / 3);
    const segments = [
        path.slice(0, segmentLength),
        path.slice(segmentLength -1, segmentLength * 2),
        path.slice(segmentLength * 2 - 1)
    ];
    const colors = ['#22c55e', '#facc15', '#ef4444']; // Green, Yellow, Red

    segments.forEach((segment, index) => {
        const polyline = new window.google.maps.Polyline({
            path: segment,
            geodesic: true,
            strokeColor: colors[index],
            strokeOpacity: 0.8,
            strokeWeight: 6,
        });
        polyline.setMap(mapInstanceRef.current);
        polylinesRef.current.push(polyline);
    });
  };
  
  const handlePreviewRoute = async () => {
    if (!origin || !destination) {
      setError('Please provide an origin and destination.');
      return;
    }
    if (!isMapsApiLoaded || !window.google) {
      setError('Mapping service is not available. Please try again later.');
      return;
    }

    setIsFetchingETA(true);
    setError('');
    setCalculatedDuration(null);
    setTripDetailsToStart(null);

    // Fix: Access Google Maps APIs via the `window` object.
    const directionsService = new window.google.maps.DirectionsService();
    try {
      // Fix: Use `any` for Google Maps types to avoid namespace errors.
      const results = await new Promise<any>((resolve, reject) => {
          directionsService.route({
              origin: origin,
              destination: destination,
              // Fix: Access Google Maps APIs via the `window` object.
              travelMode: window.google.maps.TravelMode.DRIVING,
              drivingOptions: {
                  departureTime: new Date(),
                  // Fix: Use `any` for Google Maps types to avoid namespace errors.
                  trafficModel: 'bestguess' as any,
              },
          }, (response, status) => {
              if (status === 'OK' && response) resolve(response);
              else reject(new Error(`Directions request failed: ${status}`));
          });
      });
      
      const route = results.routes[0];
      const leg = route.legs[0];
      if (!leg.duration_in_traffic) throw new Error("Could not retrieve traffic data for this route.");

      const tripDuration = Math.ceil(leg.duration_in_traffic.value / 60);
      setCalculatedDuration(tripDuration);
      
      const now = Date.now();
      setTripDetailsToStart({
          mode: TripMode.Destination,
          durationMinutes: tripDuration,
          origin: origin,
          destination: destination,
          contacts: userSettings.contacts,
          startTime: now,
          eta: now + tripDuration * 60 * 1000,
          overview_polyline: route.overview_polyline,
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(route.bounds);
        drawRouteWithSafetyColors(route.overview_path);
      }

    } catch(err: any) {
        setError(err.message);
    } finally {
        setIsFetchingETA(false);
    }
  };

  const handleStart = (isPanic: boolean = false) => {
    setError('');
    if (userSettings.contacts.length === 0) {
      setError('Please add at least one contact in settings.');
      return;
    }
    
    let tripDetails: TripDetails;
    const now = Date.now();

    if (isPanic) {
        tripDetails = { mode: TripMode.Timer, durationMinutes: 5, origin: "Current Location", destination: "SOS Emergency", contacts: userSettings.contacts, startTime: now, eta: now + 5 * 60 * 1000 };
    } else if (tripMode === TripMode.Timer) {
        tripDetails = { mode: TripMode.Timer, durationMinutes: duration, origin: "N/A", destination: "Timed Trip", contacts: userSettings.contacts, startTime: now, eta: now + duration * 60 * 1000 };
    } else { // Destination Mode
        if (!tripDetailsToStart) {
            setError('Please preview the route first.');
            return;
        }
        tripDetails = tripDetailsToStart;
    }

    onStartTrip(tripDetails);
  };
  
  return (
    <div className="p-4 relative min-h-screen pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">Hello, {userSettings.name}</h1>
            <p className="text-gray-400">Ready for a safe trip?</p>
        </div>
        <button onClick={onReset} className="text-gray-400 hover:text-white p-2">
            <SettingsIcon />
        </button>
      </header>

      <main>
        <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Start a New Trip</h2>
            <div className="flex bg-gray-700 rounded-md p-1 mb-4">
                <button onClick={() => setTripMode(TripMode.Destination)} className={`w-1/2 py-2 rounded ${tripMode === TripMode.Destination ? 'bg-blue-600' : ''}`}>Destination</button>
                <button onClick={() => setTripMode(TripMode.Timer)} className={`w-1/2 py-2 rounded ${tripMode === TripMode.Timer ? 'bg-blue-600' : ''}`}>Timer</button>
            </div>

            {tripMode === TripMode.Destination ? (
                <div className="space-y-3">
                    <div className="relative">
                        <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4"/>
                        <button onClick={handleUseMyLocation} className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1 px-2 rounded flex items-center">
                            <MapPinIcon/> <span className="ml-1">My Location</span>
                        </button>
                    </div>
                     <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4"/>
                     <button onClick={handlePreviewRoute} disabled={isFetchingETA} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg">
                        {isFetchingETA ? 'Calculating...' : 'Preview Route'}
                     </button>
                     <div ref={mapRef} className={`w-full h-48 bg-gray-700 rounded-lg transition-all duration-300 ${calculatedDuration ? 'block' : 'hidden'}`}></div>
                     {calculatedDuration && (
                        <div className="text-center p-2 bg-gray-700 rounded-lg">
                            <p className="text-lg">Estimated Time: <span className="font-bold text-blue-400">{calculatedDuration} minutes</span></p>
                        </div>
                     )}
                </div>
            ) : (
                <div className="flex items-center justify-center space-x-4 bg-gray-700 p-4 rounded-lg">
                    <button onClick={() => setDuration(d => Math.max(5, d - 5))} className="text-3xl font-bold p-2">-</button>
                    <span className="text-4xl font-bold w-24 text-center">{duration} min</span>
                    <button onClick={() => setDuration(d => d + 5)} className="text-3xl font-bold p-2">+</button>
                </div>
            )}
             {error && <p className="text-red-500 text-center mt-4">{error}</p>}
             
             <button 
                onClick={() => handleStart(false)} 
                disabled={tripMode === TripMode.Destination && !tripDetailsToStart} 
                className="w-full mt-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
             >
                Start Monitoring
            </button>
        </div>

        <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-300 mb-3">Trusted Contacts</h3>
            <div className="space-y-2">
            {userSettings.contacts.map(contact => (
                <div key={contact.id} className="flex items-center p-3 rounded-lg bg-gray-800">
                    <UserIcon />
                    <div>
                        <p className="font-semibold">{contact.name} <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{contact.relationship}</span></p>
                        <p className="text-sm text-gray-400">{contact.phone}</p>
                    </div>
                </div>
            ))}
            </div>
        </div>
      </main>

       <button 
            onClick={() => handleStart(true)}
            className="fixed bottom-6 right-6 w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex flex-col items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-red-500/30 z-10">
            <span className="text-2xl font-bold">SOS</span>
        </button>
    </div>
  );
};

export default HomeScreen;