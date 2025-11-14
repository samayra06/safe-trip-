import React, { useState } from 'react';
import { UserSettings, Contact, Permissions } from '../types';

interface SetupScreenProps {
  onSetupComplete: (settings: UserSettings) => void;
}

const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const TOTAL_STEPS = 6;

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [safePin, setSafePin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [safeWord, setSafeWord] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentContactName, setCurrentContactName] = useState('');
  const [currentContactPhone, setCurrentContactPhone] = useState('');
  const [currentContactRelationship, setCurrentContactRelationship] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({
    location: false, microphone: false, notifications: false
  });

  const requestPermission = async (name: keyof Permissions, requestFn: () => Promise<boolean>) => {
    try {
      setError('');
      const granted = await requestFn();
      setPermissions(p => ({ ...p, [name]: granted }));
      if (!granted) {
          setError(`${name.charAt(0).toUpperCase() + name.slice(1)} permission was denied.`);
      }
    } catch (err) {
       setError(`Error requesting ${name} permission.`);
       setPermissions(p => ({ ...p, [name]: false }));
    }
  };
  
  // Fix: Implement permission request logic to return a boolean promise.
  const requestLocation = () => requestPermission('location', () => {
    return new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false)
      );
    });
  });

  // Fix: Implement permission request logic to return a boolean promise.
  const requestMicrophone = () => requestPermission('microphone', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("Microphone access is not supported by this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied.", error);
      return false;
    }
  });

  // Fix: Implement permission request logic to return a boolean promise.
  const requestNotifications = () => requestPermission('notifications', async () => {
    if (!('Notification' in window)) {
      console.error("Notifications are not supported by this browser.");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error("Notification permission error.", error);
      return false;
    }
  });

  const handleAddContact = () => {
    if (currentContactName && currentContactPhone && currentContactRelationship && contacts.length < 3) {
      setContacts([...contacts, { id: Date.now().toString(), name: currentContactName, phone: currentContactPhone, relationship: currentContactRelationship }]);
      setCurrentContactName('');
      setCurrentContactPhone('');
      setCurrentContactRelationship('');
    }
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const validateAndProceed = () => {
    setError('');
    // Validations
    if (step === 2 && !permissions.microphone) {
      setError('Microphone permission is required for the Safe Word feature.');
      return;
    }
    if (step === 3 && !name) {
      setError('Please enter your name.');
      return;
    }
    if (step === 4) {
      if (safePin.length < 4 || duressPin.length < 4) {
        setError('PINs must be at least 4 digits long.');
        return;
      }
      if (safePin === duressPin) {
        setError('Safe PIN and Duress PIN cannot be the same.');
        return;
      }
    }
    if (step === 5 && !safeWord) {
      setError('Please enter a safe word.');
      return;
    }
    if (step === 6 && contacts.length === 0) {
      setError('Please add at least one trusted contact.');
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      onSetupComplete({ 
          name, 
          photo: '', // Placeholder
          medicalInfo: { bloodType, allergies },
          safePin, 
          duressPin, 
          safeWord, 
          contacts, 
          permissions 
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Welcome
        return (
          <div>
            <h2 className="text-3xl font-bold text-center mb-4">Welcome to SafeTrip</h2>
            <p className="text-gray-400 text-center mb-8">Your AI-powered safety companion. Let's get you set up for peace of mind on your journeys.</p>
            <div className="bg-gray-800 p-4 rounded-lg flex items-start">
              <InfoIcon />
              <p className="text-sm text-gray-300">SafeTrip proactively monitors your trip using device sensors and alerts trusted contacts if potential danger is detected.</p>
            </div>
          </div>
        );
      case 2: // Permissions
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">App Permissions</h2>
            <p className="text-gray-400 mb-6">SafeTrip needs access to your device's sensors to keep you safe.</p>
            <div className="space-y-3">
                <PermissionButton icon={<MapPinIcon/>} title="Location" description="For real-time trip tracking." granted={permissions.location} onRequest={requestLocation} />
                <PermissionButton icon={<MicIcon/>} title="Microphone" description="To listen for your safe word." granted={permissions.microphone} onRequest={requestMicrophone} />
                <PermissionButton icon={<BellIcon/>} title="Notifications" description="To send you and your contacts alerts." granted={permissions.notifications} onRequest={requestNotifications} />
                 <div className="flex items-center p-3 rounded-lg bg-gray-800">
                    <div className="mr-4"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                    <div className="flex-grow">
                        <p className="font-semibold">Motion Sensors</p>
                        <p className="text-sm text-gray-400">Enabled automatically for fall/impact detection.</p>
                    </div>
                </div>
            </div>
          </div>
        );
      case 3: // Profile
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Profile</h2>
            <p className="text-gray-400 mb-6">This information can be vital in an emergency.</p>
            <div className="space-y-4">
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon /></div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4" />
                </div>
                <input type="text" value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="Blood Type (e.g., O+)" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 px-4"/>
                <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Known Allergies" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 px-4"/>
            </div>
          </div>
        );
      case 4: // PINs
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">Security PINs</h2>
            <p className="text-gray-400 mb-6">To end a trip securely or send a silent alert.</p>
            <label className="block text-sm font-medium text-gray-300 mb-2">Safe PIN (4-6 digits)</label>
            <div className="relative mb-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LockIcon /></div>
                <input type="password" value={safePin} maxLength={6} onChange={(e) => setSafePin(e.target.value.replace(/\D/g, ''))} placeholder="e.g., 1234" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-lg"/>
            </div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duress PIN (4-6 digits)</label>
            <div className="relative">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LockIcon /></div>
                <input type="password" value={duressPin} maxLength={6} onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g., 9876" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-lg"/>
            </div>
          </div>
        );
      case 5: // Safe Word
        return (
            <div>
              <h2 className="text-2xl font-bold mb-2">Safe Word</h2>
              <p className="text-gray-400 mb-6">Speak this word if you're in trouble. We'll listen for it during your trip.</p>
              <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><ShieldIcon /></div>
                  <input type="text" value={safeWord} onChange={(e) => setSafeWord(e.target.value.toLowerCase())} placeholder="e.g., pineapple" className="w-full bg-gray-800 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-lg" />
              </div>
            </div>
          );
      case 6: // Contacts
        return (
          <div>
            <h2 className="text-2xl font-bold mb-2">Trusted Contacts</h2>
            <p className="text-gray-400 mb-6">Add up to 3 people to alert in an emergency.</p>
            <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
              <input type="text" value={currentContactName} onChange={(e) => setCurrentContactName(e.target.value)} placeholder="Contact Name" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4"/>
              <input type="tel" value={currentContactPhone} onChange={(e) => setCurrentContactPhone(e.target.value)} placeholder="Phone Number" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4"/>
              <input type="text" value={currentContactRelationship} onChange={(e) => setCurrentContactRelationship(e.target.value)} placeholder="Relationship (e.g., Mother)" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4"/>
              <button onClick={handleAddContact} disabled={contacts.length >= 3} className="w-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-900 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors">Add Contact</button>
            </div>
            <div className="mt-6 space-y-2">
                {contacts.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                        <div>
                            <p className="font-semibold">{c.name} <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{c.relationship}</span></p>
                            <p className="text-sm text-gray-400">{c.phone}</p>
                        </div>
                        <button onClick={() => handleRemoveContact(c.id)} className="text-red-500 hover:text-red-400 p-2"><TrashIcon/></button>
                    </div>
                ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen justify-between p-4 bg-gray-900">
      <div className="absolute top-4 left-4 z-10">
        {step > 1 && <button onClick={() => setStep(s => s - 1)} className="text-blue-400">&larr; Back</button>}
      </div>
      <div className="flex-grow flex flex-col justify-center">
        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-8">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
        </div>
        {error && <p className="text-red-500 text-center mb-4 animate-pulse">{error}</p>}
        {renderStep()}
      </div>
      <div className="mt-4">
         <button onClick={validateAndProceed} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg">
          {step < TOTAL_STEPS ? 'Continue' : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
};

interface PermissionButtonProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    granted: boolean;
    onRequest: () => void;
}
const PermissionButton: React.FC<PermissionButtonProps> = ({ icon, title, description, granted, onRequest }) => (
    <div className={`flex items-center p-3 rounded-lg transition-colors ${granted ? 'bg-green-800/50' : 'bg-gray-800'}`}>
        <div className="mr-4">{icon}</div>
        <div className="flex-grow">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
        {granted ? (
             <span className="text-green-400 text-sm font-bold">Granted</span>
        ) : (
            <button onClick={onRequest} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-1 px-3 rounded-md">
                Grant
            </button>
        )}
    </div>
);


export default SetupScreen;