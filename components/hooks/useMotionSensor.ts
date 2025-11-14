
import { useState, useEffect } from 'react';

export type MotionStatus = 'NORMAL' | 'CONCERN' | 'HIGH_RISK' | 'UNAVAILABLE';

const HIGH_G_THRESHOLD = 25; // m/s^2, approx 2.5G
let lastEventTimestamp = 0;


export const useMotionSensor = (enabled: boolean) => {
  const [motionStatus, setMotionStatus] = useState<MotionStatus>('NORMAL');

  useEffect(() => {
    if (!enabled) {
      setMotionStatus('UNAVAILABLE');
      return;
    }
    
    if (typeof window.DeviceMotionEvent === 'undefined') {
        setMotionStatus('UNAVAILABLE');
        return;
    }

    const handleMotionEvent = (event: DeviceMotionEvent) => {
        // Throttle event handling to avoid performance issues
        if (Date.now() - lastEventTimestamp < 200) {
            return;
        }
        lastEventTimestamp = Date.now();

      if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        if (x === null || y === null || z === null) {
            setMotionStatus('UNAVAILABLE');
            return;
        }

        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Simple check for fall/impact
        if (magnitude > HIGH_G_THRESHOLD) {
          setMotionStatus('HIGH_RISK');
        } else {
            // More complex logic could go here, e.g., checking for lack of movement
            setMotionStatus('NORMAL');
        }
      }
    };

    window.addEventListener('devicemotion', handleMotionEvent);

    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent);
    };
  }, [enabled]);

  return { motionStatus };
};
