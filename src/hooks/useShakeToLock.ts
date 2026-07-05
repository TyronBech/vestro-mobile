import { useEffect } from "react";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../store/auth-store";
import { useToastStore } from "../store/toast-store";

export function useShakeToLock() {
  const { isAuthenticated, user, isSessionLocked, setSessionLocked } = useAuthStore();
  const toast = useToastStore();

  useEffect(() => {
    // Only listen if the user is authenticated, has panic mode enabled, and session is not already locked
    if (!isAuthenticated || !user?.panicModeEnabled || isSessionLocked) {
      return;
    }

    const SHAKE_THRESHOLD = 2.4; // G-force magnitude threshold (standard gravity is 1.0)
    const MIN_TIME_BETWEEN_SHAKES = 1000; // 1 second cooldown
    let lastShakeTime = 0;

    // Set update interval (in milliseconds)
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const now = Date.now();

      // Calculate total G-force acceleration magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_THRESHOLD) {
        if (now - lastShakeTime > MIN_TIME_BETWEEN_SHAKES) {
          lastShakeTime = now;

          console.log("[Panic Mode] Shake detected! Locking session. G-force:", acceleration);

          // 1. Trigger haptic warning feedback
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch (e) {
            console.warn("Haptics failed in shake listener", e);
          }

          // 2. Lock the session securely
          setSessionLocked(true);

          // 3. Inform the user
          toast.show("Panic Mode Activated: App Locked", "warning");
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user?.panicModeEnabled, isSessionLocked, setSessionLocked, toast]);
}
