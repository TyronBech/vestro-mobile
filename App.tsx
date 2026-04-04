import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import ConnectionTestScreen from "./src/features/connection/screens/ConnectionTestScreen";

export default function App() {
  return (
    <View style={styles.container}>
      <ConnectionTestScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
