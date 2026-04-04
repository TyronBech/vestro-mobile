import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isApiClientError } from "../../../services/api/client";
import { API_RETRIES, API_TIMEOUT_MS } from "../../../services/api/config";
import {
  HealthResponse,
  testBackendConnection,
} from "../../../services/api/endpoints/health";
import {
  ProfileResponse,
  fetchProfile,
} from "../../../services/api/endpoints/profile";

export default function ConnectionTestScreen() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    setHasTimedOut(false);

    try {
      const [healthResponse, profileResponse] = await Promise.all([
        testBackendConnection(),
        fetchProfile(),
      ]);

      setData(healthResponse);
      setProfile(profileResponse);
    } catch (err: unknown) {
      if (isApiClientError(err)) {
        if (err.kind === "timeout") {
          setHasTimedOut(true);
          setError(
            `Request timed out after ${Math.round(API_TIMEOUT_MS / 1000)}s.`,
          );
        } else if (err.kind === "network") {
          setError(
            "Network error. Make sure your backend is reachable from this device.",
          );
        } else {
          setError(err.message || "Failed to connect to backend.");
        }
      } else {
        setError("Failed to connect to backend.");
      }

      setData(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>System Status</Text>
          <View
            style={[
              styles.statusDot,
              data ? styles.dotOnline : styles.dotOffline,
            ]}
          />
        </View>

        <Text style={styles.subtitle}>
          Verify the connection between your mobile app and the Node.js API.
        </Text>

        <View style={styles.resultContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#10B981" />
          ) : data ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{data.message}</Text>
              {profile ? (
                <Text style={styles.profileText}>
                  Logged as: {profile.name} ({profile.role})
                </Text>
              ) : null}
              <Text style={styles.timeText}>
                Last ping: {new Date(data.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.hintText}>
                {hasTimedOut
                  ? `Auto retried ${API_RETRIES} time(s). Tap Try Again to retry now.`
                  : "Ensure your local server is running on port 3000."}
              </Text>
            </View>
          ) : (
            <Text style={styles.idleText}>Ready to test connection.</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleTestConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Pinging Server..."
              : error
                ? "Try Again"
                : "Ping Backend"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOffline: {
    backgroundColor: "#D1D5DB",
  },
  dotOnline: {
    backgroundColor: "#10B981",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 22,
  },
  resultContainer: {
    height: 120,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  idleText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500",
  },
  successBox: {
    alignItems: "center",
  },
  successText: {
    color: "#059669",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  timeText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  profileText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "500",
  },
  errorBox: {
    alignItems: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  hintText: {
    color: "#EF4444",
    fontSize: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
