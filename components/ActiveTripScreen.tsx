// Fix: Removed faulty google.maps type reference. Global type is now in types.ts.
import React, { useState, useEffect, useRef } from 'react';
import { TripDetails, UserSettings, LocationCoords, TripMode } from '../types';
import PinInputModal from './PinInputModal';
import { useMotionSensor } from './hooks/useMotionSensor';
import { useVoiceDetection } from './hooks/useVoiceDetection';


interface ActiveTripScreenProps {
  tripDetails: TripDetails;
  userSettings: UserSettings;
  onEndTrip: () => void;
  isMapsApiLoaded: boolean;
}

type TripStatus = 'ACTIVE' | 'ETA_REACHED' | 'CHECKING_IN' | 'ALARMING' | 'ALERT_TRIGGERED' | 'SAFE' | 'DURESS' | 'PANIC';
type SafetyLevel = 'GREEN' | 'YELLOW' | 'RED';

const GRACE_PERIOD_MS = 30 * 1000;
const CHECK_IN_WINDOW_MS = 30 * 1000;
const ALARM_DURATION_MS = 5 * 1000;
const ETA_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const formatTime = (ms: number) => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ActiveTripScreen: React.FC<ActiveTripScreenProps> = ({ tripDetails: initialTripDetails, userSettings, onEndTrip, isMapsApiLoaded }) => {
  const [tripDetails, setTripDetails] = useState(initialTripDetails);
  const [status, setStatus] = useState<TripStatus>(tripDetails.destination === 'SOS Emergency' ? 'PANIC' : 'ACTIVE');
  const [remainingTime, setRemainingTime] = useState(tripDetails.eta - Date.now());
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const locationRef = useRef<LocationCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  
  const motionEnabled = userSettings.permissions.location;
  const { motionStatus } = useMotionSensor(motionEnabled);
  const { voiceStatus } = useVoiceDetection(userSettings.permissions.microphone, userSettings.safeWord);
  const safetyLevel = (motionStatus === 'HIGH_RISK' || voiceStatus === 'HIGH_RISK') ? 'RED' : motionStatus === 'CONCERN' ? 'YELLOW' : 'GREEN';

  const mapRef = useRef<HTMLDivElement>(null);
  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const mapInstanceRef = useRef<any | null>(null);
  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const userMarkerRef = useRef<any | null>(null);
  // Fix: Use `any` for Google Maps types to avoid namespace errors.
  const polylinesRef = useRef<any[]>([]);

  // Map initialization and route drawing
  useEffect(() => {
    if (isMapsApiLoaded && mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            zoom: 15,
            disableDefaultUI: true,
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            ]
        });

        if (tripDetails.overview_polyline) {
            const path = window.google.maps.geometry.encoding.decodePath(tripDetails.overview_polyline);
            const bounds = new window.google.maps.LatLngBounds();
            path.forEach(point => bounds.extend(point));
            mapInstanceRef.current.fitBounds(bounds);

            // Draw colored segments
            const segmentLength = Math.floor(path.length / 3);
            const segments = [
                path.slice(0, segmentLength + 1),
                path.slice(segmentLength, segmentLength * 2 + 1),
                path.slice(segmentLength * 2)
            ];
            const colors = ['#22c55e', '#facc15', '#ef4444'];
            segments.forEach((segment, index) => {
                const polyline = new window.google.maps.Polyline({
                    path: segment, geodesic: true, strokeColor: colors[index], strokeOpacity: 0.8, strokeWeight: 6,
                });
                polyline.setMap(mapInstanceRef.current);
                polylinesRef.current.push(polyline);
            });

             // Add destination marker
            new window.google.maps.Marker({
                position: path[path.length - 1],
                map: mapInstanceRef.current,
                title: "Destination"
            });
        }
    }
  }, [isMapsApiLoaded, tripDetails.overview_polyline]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(newLocation);
        locationRef.current = newLocation;
        setLocationError(null);

        if (mapInstanceRef.current) {
            const newLatLng = new window.google.maps.LatLng(newLocation.latitude, newLocation.longitude);
            if (userMarkerRef.current) {
                userMarkerRef.current.setPosition(newLatLng);
            } else {
                userMarkerRef.current = new window.google.maps.Marker({
                    position: newLatLng,
                    map: mapInstanceRef.current,
                    title: "Your Location",
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }
                });
            }
            mapInstanceRef.current.panTo(newLatLng);
        }
      },
      (err) => { setLocationError(err.message); },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  
  // Effect to periodically refresh ETA for destination trips
  useEffect(() => {
    if (!isMapsApiLoaded || tripDetails.mode !== TripMode.Destination) return;

    const refreshETA = () => {
        const currentLocation = locationRef.current;
        if (!currentLocation || !window.google) return;
        
        // Fix: Access Google Maps APIs via the `window` object.
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route({
            // Fix: Access Google Maps APIs via the `window` object.
            origin: new window.google.maps.LatLng(currentLocation.latitude, currentLocation.longitude),
            destination: tripDetails.destination,
            // Fix: Access Google Maps APIs via the `window` object.
            travelMode: window.google.maps.TravelMode.DRIVING,
        }, (response, status) => {
            if (status === 'OK' && response) {
                const leg = response.routes[0].legs[0];
                if (leg.duration) { // Use duration as traffic data might not always be available
                    const remainingSeconds = leg.duration.value;
                    const newEta = Date.now() + remainingSeconds * 1000;
                    setTripDetails(prev => ({ ...prev, eta: newEta }));
                }
            } else { console.error(`Periodic ETA refresh failed: ${status}`); }
        });
    };

    const intervalId = setInterval(refreshETA, ETA_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
}, [isMapsApiLoaded, tripDetails.mode, tripDetails.destination]);


  // Sensor monitoring effect
  useEffect(() => {
    if (status === 'ACTIVE' && safetyLevel === 'RED') {
      setStatus('ALARMING');
    }
  }, [safetyLevel, status]);
  
  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const newRemainingTime = tripDetails.eta - Date.now();
      if (status === 'ACTIVE' && newRemainingTime <= 0) {
        setRemainingTime(0);
        setStatus('ETA_REACHED');
      } else {
        setRemainingTime(newRemainingTime);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status, tripDetails.eta]);

  // State machine for alerts
  useEffect(() => {
    let timeoutId: number;
    if (status === 'ETA_REACHED') timeoutId = window.setTimeout(() => setStatus('CHECKING_IN'), GRACE_PERIOD_MS);
    else if (status === 'CHECKING_IN') timeoutId = window.setTimeout(() => setStatus('ALARMING'), CHECK_IN_WINDOW_MS);
    else if (status === 'ALARMING') timeoutId = window.setTimeout(() => setStatus('ALERT_TRIGGERED'), ALARM_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [status]);
  
  const handlePinSubmit = (pin: string) => {
    if (pin === userSettings.safePin) setStatus('SAFE');
    else if (pin === userSettings.duressPin) setStatus('DURESS');
    else alert('Incorrect PIN');
    setShowPinModal(false);
  };

  const handlePanic = () => {
    if(window.confirm("Are you sure? This will immediately alert your contacts.")) setStatus('PANIC');
  };

  const handleExtendTrip = () => {
    const fifteenMinutes = 15 * 60 * 1000;
    setTripDetails(prev => ({...prev, eta: prev.eta + fifteenMinutes}));
    if(status !== 'ACTIVE') setStatus('ACTIVE'); // Revert to active if in alert flow
  }
  
  const getStatusContent = () => {
    const safetyColors: Record<SafetyLevel, string> = { GREEN: 'bg-gray-800', YELLOW: 'bg-yellow-800/80', RED: 'bg-red-900/80' };
    switch(status) {
        case 'ACTIVE':
            return { 
                title: tripDetails.mode === TripMode.Destination ? "On Route To Destination" : "Timed Trip",
                subtitle: "Arriving In",
                timeDisplay: formatTime(remainingTime),
                message: "Monitoring is active.",
                bgColor: safetyColors[safetyLevel], 
                isPulsing: safetyLevel === 'YELLOW' 
            }
        case 'ETA_REACHED':
            return { 
                title: "Have you arrived?", subtitle: "ETA Reached", timeDisplay: "00:00",
                message: `A ${GRACE_PERIOD_MS/1000}-second grace period has started.`, 
                bgColor: "bg-yellow-600", isPulsing: true 
            }
        case 'CHECKING_IN':
             const overdueMs = Date.now() - (tripDetails.eta + GRACE_PERIOD_MS);
            return { 
                title: "Are you safe?", subtitle: "Check-in Required", timeDisplay: `-${formatTime(overdueMs)}`,
                message: "Please confirm your safety immediately.", bgColor: "bg-orange-600", isPulsing: true 
            }
        case 'ALARMING':
            const timeUntilAlert = (tripDetails.eta + GRACE_PERIOD_MS + CHECK_IN_WINDOW_MS + ALARM_DURATION_MS) - Date.now();
            return { 
                title: "HIGH RISK DETECTED", subtitle: "Alerting Contacts Soon", timeDisplay: formatTime(timeUntilAlert),
                message: "Final chance to confirm safety.", bgColor: "bg-red-700", isPulsing: true 
            }
        case 'ALERT_TRIGGERED':
        case 'PANIC':
             return { 
                 title: "ALERT SENT", subtitle: "Emergency", timeDisplay: "SOS",
                 message: "Your trusted contacts have been notified.", bgColor: "bg-red-600", isPulsing: false 
                }
        case 'SAFE':
            return { 
                title: "Arrived Safely", subtitle: "Trip Ended", timeDisplay: "SAFE",
                message: "Great to know you're safe.", bgColor: "bg-green-600", isPulsing: false 
            }
        case 'DURESS':
            return { 
                title: "Arrived Safely", subtitle: "Trip Ended", timeDisplay: "SAFE",
                message: "Trip ended. A silent alert has been sent.", bgColor: "bg-green-600", isPulsing: false 
            }
        default:
             return { title: "", subtitle: "", timeDisplay: "", message: "", bgColor: "bg-gray-800", isPulsing: false }
    }
  }
  
  const { title, subtitle, timeDisplay, message, bgColor, isPulsing } = getStatusContent();
  const finalState = ['SAFE', 'DURESS', 'ALERT_TRIGGERED', 'PANIC'].includes(status);
  
  return (
    <div className="flex flex-col h-screen p-4 bg-gray-900">
      {showPinModal && <PinInputModal onSubmit={handlePinSubmit} onCancel={() => setShowPinModal(false)}/>}
      
      <div className={`text-center p-6 rounded-lg transition-colors duration-500 ${bgColor} ${isPulsing ? 'animate-pulse' : ''} flex flex-col justify-center`}>
        <p className="text-lg font-medium text-gray-300 uppercase tracking-wider">{subtitle}</p>
        <div className="text-7xl font-bold font-mono my-2 tracking-widest">
            {timeDisplay}
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-2 truncate">{title}</h1>
        <p className="mt-2 text-md text-gray-200">{message}</p>
      </div>

       <div className="relative flex-grow my-4 bg-gray-800 rounded-lg flex items-center justify-center flex-col overflow-hidden">
        <div ref={mapRef} className="absolute inset-0"></div>
        <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-2 text-center text-white">
            <div className={`p-2 rounded-lg ${safetyLevel === 'RED' ? 'bg-red-500/50' : 'bg-gray-900/50'}`}><p className="text-sm font-bold">MOTION</p><p className="text-xs text-gray-300">{motionStatus}</p></div>
            <div className={`p-2 rounded-lg ${safetyLevel === 'RED' ? 'bg-red-500/50' : 'bg-gray-900/50'}`}><p className="text-sm font-bold">AUDIO</p><p className="text-xs text-gray-300">{voiceStatus}</p></div>
            <div className="p-2 bg-gray-900/50 rounded-lg"><p className="text-sm font-bold">GPS</p><p className={`text-xs ${location ? 'text-green-400' : 'text-yellow-400'}`}>{location ? 'LOCKED' : locationError ? 'ERROR' : 'SEARCHING'}</p></div>
        </div>
      </div>
      
      {finalState ? (
        <button onClick={onEndTrip} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg text-xl">Back to Home</button>
      ) : (
        <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setShowPinModal(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-xl">I'm Safe</button>
             <button onClick={handlePanic} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg text-xl">Panic</button>
             <button onClick={handleExtendTrip} className="col-span-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg text-lg">Extend Trip (+15 min)</button>
        </div>
      )}
    </div>
  );
};

export default ActiveTripScreen;