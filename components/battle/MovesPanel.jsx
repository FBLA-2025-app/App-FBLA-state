import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from 'react-native';
import { playSound } from "../../utils/audio"

export default function MovesPanel({
  monster,
  onMoveSelect,
  onSwitchPress,
  onCatchPress,
  showCatchButton = false,
  disabled = false,
}) {
  const [showMoves, setShowMoves] = useState(false);

  const handleMoveSelect = (move) => {
    setShowMoves(false);
    onMoveSelect(move);
  };

  const getTypeColor = (type) => {
    const typeColors = {
      fire: "#FFE0B2", // Light Orange
      water: "#BBDEFB", // Light Blue
      grass: "#C8E6C9", // Light Green
      // electric: "#FFF9C4", // Light Yellow
      // psychic: "#E1BEE7", // Light Purple
      // ice: "#B3E5FC", // Light Cyan
      // dragon: "#FFCCBC", // Light Deep Orange
      // dark: "#D7CCC8", // Light Brown
      // fairy: "#F8BBD0", // Light Pink
      // normal: "#E0E0E0", // Light Grey
      // fighting: "#FFCDD2", // Light Red
      // flying: "#B3E5FC", // Light Light Blue
      // poison: "#E1BEE7", // Light Light Purple
      // ground: "#FFE0B2", // Light Light Orange
      // rock: "#D7CCC8", // Light Light Brown
      // bug: "#DCEDC8", // Light Light Green
      // ghost: "#D1C4E9", // Light Dark Purple
      // steel: "#CFD8DC", // Light Blue Grey
    }
    return typeColors[type.toLowerCase()] || "#F5F5F5" // Default color
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionButtons}>
        {showCatchButton ? (
          <TouchableOpacity
            style={[styles.actionButton, disabled && styles.disabledButton]}
            // style={styles.actionButton}
            onPress={onCatchPress}
            disabled={disabled}
          >
            <Text style={styles.actionButtonText}>Catch</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={() => {
                playSound("click", 0.3);
                setShowMoves(true)
              }}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Fight</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={onSwitchPress}
              disabled={disabled}
            >
              <Text style={styles.actionButtonText}>Switch</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={showMoves}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.movesContainer}>
            <Text style={styles.movesTitle}>Select a Move</Text>
            <View style={styles.movesFlex}>
              {monster.moves.map((move, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.moveButton, { backgroundColor: getTypeColor(move.type) }]}
                  onPress={() => handleMoveSelect(move)}
                >
                  <Text style={styles.moveName}>{move.name}</Text>
                  <View style={styles.moveInfo}>
                    <Text style={styles.moveType}>{move.type}</Text>
                    <Text style={styles.movePower}>Power: {move.power}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                playSound("click", 0.3);
                setShowMoves(false)
              }}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // padding: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20
    overflowY: "scroll"
  },
  actionButtons: {
    width: "100%",
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10
  },
  actionButton: {
    width: "40%",
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    // fontWeight: 'bold'
    fontFamily: "pixel-font",
  },
  modalContainer: {
    flex: 1,
    // justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  movesContainer: {
    backgroundColor: '#FFF',
    // backgroundColor: 'red',
    height: 'fit-content',
    width: "90vw",
    margin: "auto",
    overflow: "scroll",
    borderRadius: 20,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    padding: 20
  },
  movesFlex: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  movesTitle: {
    backgroundColor: "#FFF",
    fontSize: 18,
    // fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: "pixel-font",
  },
  moveButton: {
    width: "48%",
    margin: "auto",
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15
  },
  moveName: {
    fontSize: 14,
    // fontWeight: 'bold'
    fontFamily: "pixel-font",
  },
  moveInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5
  },
  moveType: {
    color: '#666',
    fontSize: 12,
    fontFamily: "pixel-font",
  },
  movePower: {
    color: '#666',
    fontSize: 12,
    fontFamily: "pixel-font",
  },
  cancelButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    marginTop: 10
  },
  cancelButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 14,
    // fontWeight: 'bold',
    fontFamily: "pixel-font",
  }
});



// import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
// import { Ionicons } from "@expo/vector-icons"

// export default function MovesPanel({
//   monster,
//   onMoveSelect,
//   onSwitchPress,
//   onCatchPress,
//   showCatchButton = false,
//   disabled = false,
// }) {
//   if (!monster) return null

//   return (
//     <View style={styles.container}>
//       {/* Moves */}
//       <View style={styles.movesContainer}>
//         {monster.moves.map((move, index) => (
//           <TouchableOpacity
//             key={index}
//             style={[
//               styles.moveButton,
//               { backgroundColor: getTypeColor(move.type) },
//               disabled || showCatchButton ? styles.disabledButton : null,
//             ]}
//             onPress={() => onMoveSelect(move)}
//             disabled={disabled || showCatchButton}
//           >
//             <Text style={styles.moveText}>{move.name}</Text>
//             <Text style={styles.powerText}>Power: {move.power}</Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Action Buttons */}
//       <View style={styles.actionButtons}>
//         {showCatchButton ? (
//           <TouchableOpacity
//             style={[styles.actionButton, styles.catchButton]}
//             onPress={onCatchPress}
//             disabled={disabled}
//           >
//             <Ionicons name="add-circle" size={24} color="#FFF" />
//             <Text style={styles.actionButtonText}>Catch</Text>
//           </TouchableOpacity>
//         ) : (
//           <>
//             <TouchableOpacity
//               style={[styles.actionButton, disabled ? styles.disabledButton : null]}
//               onPress={onSwitchPress}
//               disabled={disabled}
//             >
//               <Ionicons name="swap-horizontal" size={24} color="#FFF" />
//               <Text style={styles.actionButtonText}>Switch</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.actionButton, styles.runButton, disabled ? styles.disabledButton : null]}
//               onPress={() => {}}
//               disabled={disabled}
//             >
//               <Ionicons name="exit" size={24} color="#FFF" />
//               <Text style={styles.actionButtonText}>Run</Text>
//             </TouchableOpacity>
//           </>
//         )}
//       </View>
//     </View>
//   )
// }

// const getTypeColor = (type) => {
//   const typeColors = {
//     fire: "#F44336",
//     water: "#2196F3",
//     grass: "#4CAF50",
//     math: "#9C27B0",
//     language: "#FF9800",
//     science: "#00BCD4",
//   }
//   return typeColors[type.toLowerCase()] || "#607D8B"
// }

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: "#333",
//     padding: 10,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//   },
//   movesContainer: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//     marginBottom: 10,
//   },
//   moveButton: {
//     width: "48%",
//     padding: 15,
//     borderRadius: 10,
//     marginBottom: 10,
//   },
//   moveText: {
//     color: "#FFF",
//     fontWeight: "bold",
//     fontSize: 16,
//   },
//   powerText: {
//     color: "#FFF",
//     fontSize: 14,
//   },
//   actionButtons: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   actionButton: {
//     backgroundColor: "#555",
//     padding: 10,
//     borderRadius: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     flex: 1,
//     marginHorizontal: 5,
//   },
//   catchButton: {
//     backgroundColor: "#4CAF50",
//     flex: 1,
//   },
//   runButton: {
//     backgroundColor: "#F44336",
//   },
//   actionButtonText: {
//     color: "#FFF",
//     marginLeft: 5,
//     fontWeight: "bold",
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
// })

