import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { createMonster } from "../data/monsters"
import { loadGameState, saveGameState } from "../utils/gameState"
import { Ionicons } from "@expo/vector-icons"
import { playSound, stopBgMusic } from "../utils/audio"

export default function StarterSelectionScreen() {
    const navigation = useNavigation()
    const [selectedStarter, setSelectedStarter] = useState(null)
    const [hasExistingGameState, setHasExistingGameState] = useState(false)

    // Check if there's an existing game state on mount
    useEffect(() => {
        const checkGameState = async () => {
            const gameState = await loadGameState()
            // If player already has monsters or has selected a starter, redirect to map
            if ((gameState.playerTeam && gameState.playerTeam.length > 0) || gameState.hasSelectedStarter) {
                setHasExistingGameState(true)
                navigation.replace("Map")
            }
        }

        checkGameState()
    }, [navigation])

    // Define starter monsters - one of each type
    const starters = [
        createMonster(1, 5), // Mathling (math type)
        createMonster(2, 5), // Literabug (language type)
        createMonster(3, 5), // Scienspark (science type)
    ]

    const handleStarterSelect = async (starter) => {
        playSound("click", 0.3);
        setSelectedStarter(starter)
    }

    const handleConfirm = async () => {
        if (!selectedStarter) return;
        try {
            const gameState = await loadGameState();
            await saveGameState(
                {
                    ...gameState,
                    playerTeam: [selectedStarter],
                    hasSelectedStarter: true,
                },
            );
            stopBgMusic();
            playSound("click", 0.3);
            navigation.replace("Map");
        } catch (error) {
            console.error("Error saving starter selection:", error);
        }
    };

    // If there's an existing game state, don't render this screen
    if (hasExistingGameState) {
        return null
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Choose Your Starter Monster</Text>
            <Text style={styles.subtitle}>Select a companion to begin your educational journey!</Text>

            <ScrollView contentContainerStyle={styles.startersContainer}>
                {starters.map((starter) => (
                    <TouchableOpacity
                        key={starter.id}
                        style={[styles.starterCard, selectedStarter?.id === starter.id && styles.selectedCard]}
                        onPress={() => handleStarterSelect(starter)}
                    >
                        <Image source={starter.image} style={styles.starterImage} resizeMode="contain" />
                        <Text style={styles.starterName}>{starter.name}</Text>
                        <Text style={styles.starterType}>Type: {starter.type}</Text>
                        {/* <Text style={styles.starterLevel}>Level: {starter.level}</Text> 

                         <View style={styles.movesContainer}>
                            <Text style={styles.movesTitle}>Moves:</Text>
                            <View style={styles.movesWrapper}>
                                {starter.moves.map((move, index) => (
                                    <Text key={index} style={styles.moveText}>
                                        • {move.name}
                                    </Text>
                                ))}
                            </View>
                        </View> */}

                        {selectedStarter?.id === starter.id && (
                            <View style={styles.selectedIndicator}>
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
                style={[styles.confirmButton, !selectedStarter && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={!selectedStarter}
            >
                <Text style={styles.confirmButtonText}>Begin Adventure</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
        padding: 20,
        paddingTop: 20,
        paddingBottom: 15,
    },
    title: {
        fontSize: 22,
        // fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
        fontFamily: "pixel-font",
    },
    subtitle: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: 20,
        color: "#666",
        fontFamily: "pixel-font",
    },
    startersContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        paddingBottom: 20,
    },
    starterCard: {
        backgroundColor: "#FFF",
        borderRadius: 15,
        padding: 12,
        width: "30%",
        // marginBottom: 20,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        alignItems: "center",
    },
    selectedCard: {
        borderWidth: 3,
        borderColor: "#4CAF50",
    },
    starterImage: {
        // width: 100,
        // height: 100,
        width: 90,
        height: 90,
        // marginBottom: 10,
    },
    starterName: {
        fontSize: 16,
        // fontWeight: "bold",
        marginBottom: 5,
        fontFamily: "pixel-font",
    },
    starterType: {
        fontSize: 12,
        color: "#666",
        marginBottom: 5,
        fontFamily: "pixel-font",
    },
    starterLevel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 10,
        fontFamily: "pixel-font",
    },
    movesContainer: {
        width: "100%",
        marginTop: 5,
    },
    movesTitle: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 5,
        fontFamily: "pixel-font",
    },
    movesWrapper: {
        width: "100%",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
    },
    moveText: {
        width: "50%",
        fontSize: 10,
        color: "gray",
        fontFamily: "pixel-font",
    },
    selectedIndicator: {
        position: "absolute",
        top: 10,
        right: 10,
    },
    confirmButton: {
        backgroundColor: "#4CAF50",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 15,
    },
    disabledButton: {
        backgroundColor: "#A5D6A7",
        opacity: 0.7,
    },
    confirmButtonText: {
        color: "#FFF",
        fontSize: 16,
        // fontWeight: "bold",
        fontFamily: "pixel-font",
    },
})

