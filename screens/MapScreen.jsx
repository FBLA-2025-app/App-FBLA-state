// import { useState, useEffect } from "react"
// import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from "react-native"
// import { useNavigation } from "@react-navigation/native"
// import { Ionicons } from "@expo/vector-icons"
// import { SCHOOLS } from "../data/schools"
// import { loadGameState } from "../utils/gameState"

// export default function MapScreen() {
//   const navigation = useNavigation()
//   const [selectedSchool, setSelectedSchool] = useState(null)
//   const [defeatedTrainers, setDefeatedTrainers] = useState([])
//   const [showTrainers, setShowTrainers] = useState(false)

//   // Add a focus listener to reload progress when returning to this screen
//   useEffect(() => {
//     loadProgress()

//     // Add a listener to reload progress when the screen comes into focus
//     const unsubscribe = navigation.addListener("focus", () => {
//       console.log("MapScreen focused, reloading progress")
//       loadProgress()
//     })

//     return unsubscribe
//   }, [navigation])

//   const loadProgress = async () => {
//     try {
//       const gameState = await loadGameState()
//       // console.log("Loaded defeated trainers:", gameState.defeatedTrainers)
//       console.log("Game state:", gameState);
//       // Ensure defeatedTrainers is always an array
//       setDefeatedTrainers(gameState.defeatedTrainers || [])
//     } catch (error) {
//       console.error("Error loading progress:", error)
//       // Default to empty array on error
//       setDefeatedTrainers([])
//     }
//   }

//   const isSchoolLocked = (schoolId) => {
//     if (schoolId === 1) return false // First school is always unlocked

//     // Check if all trainers from previous school are defeated
//     const previousSchool = SCHOOLS.find((s) => s.id === schoolId - 1)
//     if (!previousSchool) return true

//     const previousSchoolTrainers = previousSchool.trainers.map((t) => t.id)
//     const allDefeated = previousSchoolTrainers.every((id) => defeatedTrainers.includes(id))

//     console.log(`School ${schoolId} locked status:`, !allDefeated)
//     return !allDefeated
//   }

//   const isTrainerLocked = (trainer) => {
//     if (trainer.id === 1) return false; // First trainer is always unlocked

//     // Check if previous trainer in the same school is defeated
//     const previousTrainerId = trainer.id - 1;

//     return !defeatedTrainers.includes(previousTrainerId);
//   };

//   const handleTrainerSelect = (trainer) => {
//     if (!isTrainerLocked(trainer)) {
//       setShowTrainers(false) // Close the modal before navigation
//       navigation.navigate("Battle", {
//         trainerId: trainer.id,
//         schoolId: trainer.schoolId,
//       })
//     }
//   }

//   return (
//     <View style={styles.container}>
//       {/* Top Navigation Bar */}
//       <View style={styles.navbar}>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//           {SCHOOLS.map((school) => (
//             <TouchableOpacity
//               key={school.id}
//               style={[
//                 styles.schoolTab,
//                 selectedSchool?.id === school.id && styles.selectedSchoolTab,
//                 isSchoolLocked(school.id) && styles.lockedSchoolTab,
//               ]}
//               onPress={() => {
//                 if (!isSchoolLocked(school.id)) {
//                   setSelectedSchool(school)
//                   setShowTrainers(true)
//                 }
//               }}
//               disabled={isSchoolLocked(school.id)}
//             >
//               <Text style={styles.schoolTabText}>{school.name}</Text>
//               {isSchoolLocked(school.id) && <Ionicons name="lock-closed" size={16} color="#666" />}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>

//         {/* Navigation Icons */}
//         <View style={styles.navIcons}>
//           <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("TeamManagement")}>
//             <Ionicons name="people" size={24} color="#FFF" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("Settings")}>
//             <Ionicons name="settings" size={24} color="#FFF" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Map Background */}
//       <Image source={require("../assets/world-map.png")} style={styles.mapBackground} resizeMode="cover" />

//       {/* Trainers Modal */}
//       <Modal visible={showTrainers} transparent={true} animationType="slide">
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <TouchableOpacity style={styles.closeButton} onPress={() => setShowTrainers(false)}>
//               <Ionicons name="close" size={24} color="#000" />
//             </TouchableOpacity>

//             <Text style={styles.modalTitle}>{selectedSchool?.name} Trainers</Text>

//             {selectedSchool?.trainers.map((trainer) => (
//               <TouchableOpacity
//                 key={trainer.id}
//                 style={[
//                   styles.trainerCard,
//                   isTrainerLocked(trainer) && styles.lockedTrainer,
//                   defeatedTrainers.includes(trainer.id) && styles.defeatedTrainer,
//                 ]}
//                 onPress={() => handleTrainerSelect(trainer)}
//                 disabled={isTrainerLocked(trainer)}
//               >
//                 <Image source={trainer.image} style={styles.trainerImage} />
//                 <View style={styles.trainerInfo}>
//                   <Text style={styles.trainerName}>{trainer.name}</Text>
//                   <Text style={styles.trainerType}>{trainer.isLeader ? "School Leader" : "Trainer"}</Text>
//                 </View>
//                 {isTrainerLocked(trainer) && <Ionicons name="lock-closed" size={24} color="#666" />}
//                 {defeatedTrainers.includes(trainer.id) && (
//                   <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
//                 )}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   )
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F5F5F5",
//   },
//   navbar: {
//     flexDirection: "row",
//     backgroundColor: "#333",
//     padding: 10,
//     paddingTop: 50,
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   schoolTab: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     marginHorizontal: 5,
//     borderRadius: 20,
//     backgroundColor: "#4CAF50",
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   selectedSchoolTab: {
//     backgroundColor: "#2E7D32",
//   },
//   lockedSchoolTab: {
//     backgroundColor: "#666",
//   },
//   schoolTabText: {
//     color: "#FFF",
//     marginRight: 5,
//   },
//   navIcons: {
//     flexDirection: "row",
//   },
//   iconButton: {
//     marginLeft: 15,
//   },
//   mapBackground: {
//     flex: 1,
//     width: "100%",
//     height: "100%",
//   },
//   modalContainer: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modalContent: {
//     backgroundColor: "#FFF",
//     borderRadius: 20,
//     padding: 20,
//     width: "90%",
//     maxHeight: "80%",
//     overflowY: "auto"
//   },
//   closeButton: {
//     position: "absolute",
//     right: 15,
//     top: 15,
//     zIndex: 1,
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   trainerCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 15,
//     backgroundColor: "#F5F5F5",
//     borderRadius: 10,
//     marginBottom: 10,
//   },
//   lockedTrainer: {
//     opacity: 0.5,
//   },
//   defeatedTrainer: {
//     borderColor: "#4CAF50",
//     borderWidth: 2,
//   },
//   trainerImage: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     marginRight: 15,
//   },
//   trainerInfo: {
//     flex: 1,
//   },
//   trainerName: {
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   trainerType: {
//     fontSize: 14,
//     color: "#666",
//   },
// })




import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import { SCHOOLS } from "../data/schools"
import { loadGameState } from "../utils/gameState"

export default function MapScreen() {
  const navigation = useNavigation()
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [defeatedTrainers, setDefeatedTrainers] = useState([])
  const [completedEncounters, setCompletedEncounters] = useState([])
  const [showTrainers, setShowTrainers] = useState(false)

  // Add a focus listener to reload progress when returning to this screen
  useEffect(() => {
    loadProgress()

    // Add a listener to reload progress when the screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("MapScreen focused, reloading progress")
      loadProgress()
    })

    return unsubscribe
  }, [navigation])

  const loadProgress = async () => {
    try {
      const gameState = await loadGameState()
      console.log("Loaded defeated trainers:", gameState.defeatedTrainers)
      console.log("Loaded completed encounters:", gameState.completedEncounters || [])

      // Ensure defeatedTrainers is always an array
      setDefeatedTrainers(gameState.defeatedTrainers || [])

      // Load completed encounters
      setCompletedEncounters(gameState.completedEncounters || [])
    } catch (error) {
      console.error("Error loading progress:", error)
      // Default to empty arrays on error
      setDefeatedTrainers([])
      setCompletedEncounters([])
    }
  }

  const isSchoolLocked = (schoolId) => {
    if (schoolId === 1) return false // First school is always unlocked

    // Check if all trainers from previous school are defeated
    const previousSchool = SCHOOLS.find((s) => s.id === schoolId - 1)
    if (!previousSchool) return true

    const previousSchoolTrainers = previousSchool.trainers.map((t) => t.id)
    const allDefeated = previousSchoolTrainers.every((id) => defeatedTrainers.includes(id))

    // console.log(`School ${schoolId} locked status:`, !allDefeated)
    return !allDefeated
  }

  const isTrainerLocked = (trainer) => {
    // First trainer in each school is always unlocked
    if (trainer.id === SCHOOLS.find((s) => s.id === trainer.schoolId)?.trainers[0]?.id) {
      return false
    }

    // Find the previous trainer in the same school
    const school = SCHOOLS.find((s) => s.id === trainer.schoolId)
    if (!school) return true

    const trainerIndex = school.trainers.findIndex((t) => t.id === trainer.id)
    if (trainerIndex <= 0) return false // First trainer or not found

    const previousTrainer = school.trainers[trainerIndex - 1]
    const isLocked = !defeatedTrainers.includes(previousTrainer.id)

    console.log(
      `Trainer ${trainer.id} locked status:`,
      isLocked,
      "Previous trainer:",
      previousTrainer.id,
      "Defeated:",
      defeatedTrainers.includes(previousTrainer.id),
    )
    return isLocked
  }

  const handleTrainerSelect = async (trainer) => {
    if (!isTrainerLocked(trainer)) {
      setShowTrainers(false) // Close the modal before navigation

      // Check if this trainer has a random encounter before it and if it hasn't been completed yet
      if (trainer.hasRandomEncounterBefore && !completedEncounters.includes(trainer.id)) {
        // Navigate to a random encounter first
        navigation.navigate("Battle", {
          trainerId: trainer.id, // We'll need this later to know which trainer the player was trying to battle
          schoolId: trainer.schoolId,
          isRandomEncounter: true,
          isPreTrainerEncounter: true, // Flag to indicate this is a pre-trainer encounter
        })
      } else {
        // Navigate directly to the trainer battle
        navigation.navigate("Battle", {
          trainerId: trainer.id,
          schoolId: trainer.schoolId,
          isRandomEncounter: false,
        })
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SCHOOLS.map((school) => (
            <TouchableOpacity
              key={school.id}
              style={[
                styles.schoolTab,
                selectedSchool?.id === school.id && styles.selectedSchoolTab,
                isSchoolLocked(school.id) && styles.lockedSchoolTab,
              ]}
              onPress={() => {
                if (!isSchoolLocked(school.id)) {
                  setSelectedSchool(school)
                  setShowTrainers(true)
                }
              }}
              disabled={isSchoolLocked(school.id)}
            >
              <Text style={styles.schoolTabText}>{school.name}</Text>
              {isSchoolLocked(school.id) && <Ionicons name="lock-closed" size={16} color="#666" />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Navigation Icons */}
        <View style={styles.navIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("TeamManagement")}>
            <Ionicons name="people" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Background */}
      <View style={styles.mapBackground}>
        <Image source={require("../assets/world-map.png")} style={styles.mapImage} resizeMode="cover" />

        {/* School areas on the map */}
        {SCHOOLS.map((school) => (
          <TouchableOpacity
            key={school.id}
            style={[
              styles.schoolArea,
              {
                top: 100 + (school.id - 1) * 150, // Position schools vertically for now
                left: 50 + (school.id - 1) * 50, // Stagger them horizontally
                opacity: isSchoolLocked(school.id) ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!isSchoolLocked(school.id)) {
                setSelectedSchool(school)
                setShowTrainers(true)
              }
            }}
            disabled={isSchoolLocked(school.id)}
          >
            <Text style={styles.schoolAreaText}>{school.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trainers Modal */}
      <Modal visible={showTrainers} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowTrainers(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{selectedSchool?.name} Trainers</Text>

            {selectedSchool?.trainers.map((trainer) => (
              <TouchableOpacity
                key={trainer.id}
                style={[
                  styles.trainerCard,
                  isTrainerLocked(trainer) && styles.lockedTrainer,
                  defeatedTrainers.includes(trainer.id) && styles.defeatedTrainer,
                  trainer.hasRandomEncounterBefore &&
                    !completedEncounters.includes(trainer.id) &&
                    styles.trainerWithEncounter,
                ]}
                onPress={() => handleTrainerSelect(trainer)}
                disabled={isTrainerLocked(trainer)}
              >
                <Image source={trainer.image} style={styles.trainerImage} />
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>{trainer.name}</Text>
                  <Text style={styles.trainerType}>{trainer.isLeader ? "School Leader" : "Trainer"}</Text>
                  {trainer.hasRandomEncounterBefore && !completedEncounters.includes(trainer.id) && (
                    <Text style={styles.encounterWarning}>
                      <Ionicons name="warning" size={14} color="#FF9800" /> Wild monster area ahead
                    </Text>
                  )}
                </View>
                {isTrainerLocked(trainer) && <Ionicons name="lock-closed" size={24} color="#666" />}
                {defeatedTrainers.includes(trainer.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  navbar: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 10,
    paddingTop: 50,
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
  },
  selectedSchoolTab: {
    backgroundColor: "#2E7D32",
  },
  lockedSchoolTab: {
    backgroundColor: "#666",
  },
  schoolTabText: {
    color: "#FFF",
    marginRight: 5,
  },
  navIcons: {
    flexDirection: "row",
  },
  iconButton: {
    marginLeft: 15,
  },
  mapBackground: {
    flex: 1,
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  schoolArea: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(76, 175, 80, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  schoolAreaText: {
    color: "#FFF",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  trainerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    marginBottom: 10,
  },
  trainerWithEncounter: {
    borderLeftWidth: 5,
    borderLeftColor: "#FF9800",
  },
  lockedTrainer: {
    opacity: 0.5,
  },
  defeatedTrainer: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  trainerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  trainerType: {
    fontSize: 14,
    color: "#666",
  },
  encounterWarning: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 4,
  },
})

