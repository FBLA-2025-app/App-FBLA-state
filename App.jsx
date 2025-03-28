import 'react-native-get-random-values'; // Add this as the first import
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, UIManager } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import BattleScreen from "./screens/BattleScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TeamManagementScreen from "./screens/TeamManagementScreen";
import StarterSelectionScreen from "./screens/StarterSelectionScreen";
import { hasSelectedStarter } from "./utils/gameState";
import { loadFonts } from "./utils/fonts";
import { Audio } from "expo-av";
import LoginScreen from "./screens/LoginScreen"
import RegisterScreen from "./screens/RegisterScreen"
// import { LoadingProvider, useLoading } from "./utils/loadingContext";

// Enable layout animations for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const Stack = createNativeStackNavigator()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true); // Track if the "Press screen to start" screen is shown

  // Setup audio configuration
  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error("Error setting up audio:", error);
    }
  };

  useEffect(() => {

    testSetupId();

    const loadAppFonts = async () => {
      await loadFonts();
      setFontsLoaded(true);
    };

    const checkStarterSelection = async () => {
      const hasStarter = await hasSelectedStarter();
      setIsLoading(false);
    };

    loadAppFonts();
    setupAudio();
    checkStarterSelection();

    // Check if user is logged in
    setTimeout(() => {
      setIsLoggedIn(false)
      setIsLoading(false)
    }, 1000)
  }, []);

  const testSetupId = async () => {
    await AsyncStorage.setItem("userId", "1234");
  }

  // Show loading screen while fonts and other resources are loading
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show start screen when ready
  if (showStartScreen) {
    return (
      <TouchableOpacity
        style={styles.startScreenContainer}
        onPress={() => setShowStartScreen(false)} // Hide the start screen on press
      >
        <Text style={styles.startScreenText}>Press screen to start</Text>
      </TouchableOpacity>
    );
  }

  // Main app
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <NavigationContainer>
        <Stack.Navigator
          // initialRouteName={isLoggedIn ? "Home" : "Login"}
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            orientation: "landscape",
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="StarterSelection" component={StarterSelectionScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Battle" component={BattleScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  startScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000", // Black background
  },
  startScreenText: {
    color: "#FFF",
    fontSize: 24,
    textAlign: "center",
    fontFamily: "pixel-font",
  },
});