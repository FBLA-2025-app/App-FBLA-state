import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Modal, SafeAreaView, Linking, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient';
import { hasSelectedStarter } from "../utils/gameState"
import { playSound, playBgMusic, stopBgMusic } from "../utils/audio"

export default function HomeScreen() {
  const navigation = useNavigation()
  const [starterSelected, setStarterSelected] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    const checkStarterSelection = async () => {
      const hasStarter = await hasSelectedStarter()
      setStarterSelected(hasStarter)
    }

    checkStarterSelection()
    playBgMusic("home", 0.3);
  }, [])

  const handlePlay = () => {
    playSound("click", 0.3);
    if (starterSelected) {
      navigation.navigate("Map")
    } else {
      navigation.navigate("StarterSelection")
    }
  }

  const handleShare = (platform) => {
    const shareText = "Check out Edumon! It's an educational game that makes learning fun and engaging!"
    const encodedText = encodeURIComponent(shareText)

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=https://edumon.app&quote=${encodedText}`,
      // Note: Instagram doesn't support direct sharing via URL schemes like this
      instagram: "https://instagram.com/", // This will just open Instagram
    }

    try {
      Linking.openURL(urls[platform])
    } catch (error) {
      console.error(`Error opening ${platform} share URL:`, error)
      Alert.alert(
        "Sharing Failed",
        `Could not open ${platform}. Make sure you have the app installed or try another method.`
      )
    }

    // Close the modal after sharing
    setShowShareModal(false)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require("../assets/home-bg-2.jpg")} style={styles.background} resizeMode="cover">
        <View style={styles.container}>
          {/* Split container into two halves */}
          <View style={styles.leftHalf}>
            <Image source={require("../assets/edumon-logo-education.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.rightHalf}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  playSound("click", 0.3);
                  navigation.navigate("Settings");
                }}
              >
                <Text style={styles.settingsButtonText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButtonHome}
                onPress={() => {
                  playSound("click", 0.3);
                  setShowShareModal(true);
                }}
              >
                <Ionicons name="share-social" size={20} color="#FFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ImageBackground>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shareModalContent}>
            <Text style={styles.shareModalTitle}>Share Edumon</Text>

            <View style={styles.shareButtons}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare("instagram")}
              >
                <LinearGradient
                  colors={['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
                  start={{ x: 0.0, y: 0.0 }}
                  end={{ x: 1.0, y: 1.0 }}
                  style={styles.instagramGradient}
                >
                  <Ionicons name="logo-instagram" size={24} color="#FFF" />
                  <Text style={styles.shareButtonText}>Instagram</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare("twitter")}
              >
                <View style={styles.twitterButton}>
                  <Ionicons name="logo-twitter" size={24} color="#FFF" />
                  <Text style={styles.shareButtonText}>X</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare("facebook")}
              >
                <View style={styles.facebookButton}>
                  <Ionicons name="logo-facebook" size={24} color="#FFF" />
                  <Text style={styles.shareButtonText}>Facebook</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelShareButton} onPress={() => {
              setShowShareModal(false)
              playSound("click", 0.3);
            }}>
              <Text style={styles.cancelShareText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    flexDirection: "row", // Make the container horizontal
    padding: 20,
  },
  leftHalf: {
    flex: 1, // Take half of the screen
    justifyContent: "center",
    alignItems: "center",
  },
  rightHalf: {
    flex: 1, // Take half of the screen
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: "100%",
    height: "60%",
    maxWidth: 300,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    maxWidth: 250,
  },
  playButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    elevation: 5,
    width: "100%",
    alignItems: "center",
  },
  playButtonText: {
    color: "#FFF",
    fontSize: 24,
    // fontWeight: "bold",
    fontFamily: "pixel-font",
  },
  settingsButton: {
    backgroundColor: "#607D8B",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
  },
  settingsButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "pixel-font",
  },
  shareButtonHome: {
    backgroundColor: "#3F51B5",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  shareButtonText: {
    color: "#FFF",
    fontSize: 18,
    marginLeft: 8,
    fontFamily: "pixel-font",
  },
  versionText: {
    position: "absolute",
    bottom: 20,
    right: 20,
    color: "#FFF",
    fontSize: 12,
  },
  // Share modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareModalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  shareModalTitle: {
    fontSize: 20,
    // fontWeight: "bold",
    marginBottom: 20,
    fontFamily: "pixel-font",
  },
  shareButtons: {
    width: "100%",
  },
  shareButton: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden', // Important for gradient to stay within bounds
  },
  instagramGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    width: '100%',
  },
  twitterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#000000", // Updated to black for X branding
    borderRadius: 8,
  },
  facebookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#4267B2", // Facebook color
    borderRadius: 8,
  },
  cancelShareButton: {
    marginTop: 10,
    padding: 12,
    width: "100%",
  },
  cancelShareText: {
    color: "#666",
    textAlign: "center",
    // fontWeight: "bold",
    fontFamily: "pixel-font",
  },
})