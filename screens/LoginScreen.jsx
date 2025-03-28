"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Keyboard,
  Alert,
} from "react-native"
import { useNavigation } from "@react-navigation/native"

const authenticateUser = (email, password) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(email.length > 0 && password.length > 0)
    }, 1000)
  })
}

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [orientation, setOrientation] = useState("portrait")
  const navigation = useNavigation()

  // Detect orientation changes
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setOrientation(width > height ? "landscape" : "portrait");
    };

    // Set initial orientation
    updateOrientation();

    // Add event listener for orientation changes
    Dimensions.addEventListener('change', updateOrientation);

    // Clean up
    return () => {
      // Remove event listener (for older React Native versions)
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateOrientation);
      }
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    Alert.alert("Debug", "Starting login request");
    setIsLoading(true);

    const url = `https://api.santiagohe75.workers.dev/login?username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    Alert.alert("Debug", `Request URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
      });

      Alert.alert("Debug", `Response status: ${response.status}`);

      if (response.ok) {
        await AsyncStorage.setItem("userId", userId);
        const message = await response.text();
        Alert.alert("Success", message);
        navigation.replace("Home");
      } else {
        const errorMessage = await response.text();
        Alert.alert("Login Failed", errorMessage);
      }
    } catch (error) {
      Alert.alert("Network Error", `Error message: ${error.message}`);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate("Register")
  }

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password reset functionality to be implemented")
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
      <ScrollView contentContainerStyle={orientation === "landscape" ? styles.landscapeScroll : styles.portraitScroll}>
        <View style={orientation === "landscape" ? styles.landscapeInner : styles.portraitInner}>
          {/* Logo Section */}
          <View style={orientation === "landscape" ? styles.landscapeLogoContainer : styles.portraitLogoContainer}>
            <Image
              source={require("../assets/edumon-logo-education.png")}
              style={orientation === "landscape" ? styles.landscapeLogo : styles.portraitLogo}
            />
          </View>

          {/* Form Section */}
          <View style={orientation === "landscape" ? styles.landscapeFormContainer : styles.portraitFormContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? "Logging in..." : "Login"}</Text>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleRegister}>
                <Text style={styles.link}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* </TouchableWithoutFeedback> */}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  // Portrait mode styles
  portraitScroll: {
    flexGrow: 1,
  },
  portraitInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  portraitLogoContainer: {
    alignItems: "center",
    marginBottom: 40,
    width: '100%',
  },
  portraitLogo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  portraitFormContainer: {
    width: "100%",
    maxWidth: 400,
  },

  // Landscape mode styles
  landscapeScroll: {
    flexGrow: 1,
  },
  landscapeInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
  landscapeLogoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 30,
  },
  landscapeLogo: {
    width: 250,
    height: 250,
    resizeMode: "contain",
  },
  landscapeFormContainer: {
    flex: 1,
    maxWidth: 500,
  },

  // Common styles
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4a90e2",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#a0c4e7",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  link: {
    color: "#4a90e2",
    fontSize: 14,
  },
})