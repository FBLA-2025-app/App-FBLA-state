import AsyncStorage from "@react-native-async-storage/async-storage"
import { createMonster } from "../data/monsters"

const GAME_STATE_KEY = "edumon_game_state"

// Get initial game state with starter monster
export const getInitialGameState = () => {
  return {
    playerTeam: [], // Start with no monsters - will be chosen in starter selection
    defeatedTrainers: [],
    completedEncounters: [], // Track which trainer encounters have been completed
    hasSelectedStarter: false, // Track if the player has selected a starter
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      difficulty: "normal",
      subject: "math", 
    },
    progression: {
      questionsAnswered: {
        math: 0,
        science: 0,
        english: 0,
      },
      learningDays: [],
    },
  }
}

export const updateProgression = async (subject) => {
  try {
    const gameState = await loadGameState();
    const currentDate = new Date().toISOString().split("T")[0]; // Get the current date in YYYY-MM-DD format

    // Update the number of questions answered for the given subject
    if (gameState.progression.questionsAnswered[subject] !== undefined) {
      gameState.progression.questionsAnswered[subject] += 1;
    }

    // Add the current date to the learningDays array if it's not already there
    if (!gameState.progression.learningDays.includes(currentDate)) {
      gameState.progression.learningDays.push(currentDate);
    }

    // Save the updated game state
    await saveGameState(gameState);
  } catch (error) {
    console.error("Error updating progression:", error);
  }
};

// Default game state with a starter monster
const DEFAULT_GAME_STATE = getInitialGameState()

// Load game state from AsyncStorage
export const loadGameState = async () => {
  try {
    const savedState = await AsyncStorage.getItem(GAME_STATE_KEY)
    if (savedState) {
      const parsedState = JSON.parse(savedState)

      // Ensure player team is never empty if they've already selected a starter
      if (parsedState.hasSelectedStarter && (!parsedState.playerTeam || parsedState.playerTeam.length === 0)) {
        parsedState.playerTeam = [createMonster(1, 5)] // Default to Mathling if something went wrong
      }

      // Ensure each monster has the required exp properties
      if (parsedState.playerTeam) {
        parsedState.playerTeam = parsedState.playerTeam.map((monster) => {
          if (monster.exp === undefined) {
            monster.exp = 0
          }
          if (monster.expToNextLevel === undefined) {
            monster.expToNextLevel = calculateExpToNextLevel(monster.level)
          }
          if (monster.maxHealth === undefined) {
            monster.maxHealth = monster.health || calculateHealth(monster.baseHealth, monster.level)
          }
          if (monster.health === undefined) {
            monster.health = monster.maxHealth
          }
          return monster
        })
      }

      // Initialize completedEncounters if it doesn't exist
      if (!parsedState.completedEncounters) {
        parsedState.completedEncounters = []
      }

      return parsedState
    }
    return DEFAULT_GAME_STATE
  } catch (error) {
    console.error("Error loading game state:", error)
    return DEFAULT_GAME_STATE
  }
}

// Save game state to AsyncStorage
export const saveGameState = async (newState) => {
  try {
    // Merge with existing state to avoid overwriting unspecified properties
    const currentState = await loadGameState()
    const mergedState = {
      ...currentState,
      ...newState,
      // Special handling for nested objects
      settings: {
        ...currentState.settings,
        ...(newState.settings || {}),
      },
    }

    await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(mergedState))
    return mergedState
  } catch (error) {
    console.error("Error saving game state:", error)
    throw error
  }
}

// Calculate experience needed for next level
export const calculateExpToNextLevel = (level) => {
  // Exponential growth formula for exp requirements
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

// Calculate health based on base health and level
export const calculateHealth = (baseHealth, level) => {
  return Math.floor(baseHealth * (1 + (level - 1) * 0.1))
}

// Reset game state (for debugging or starting over)
export const resetGameState = async () => {
  try {
    await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(DEFAULT_GAME_STATE))
    return DEFAULT_GAME_STATE
  } catch (error) {
    console.error("Error resetting game state:", error)
    throw error
  }
}

// Heal all monsters in the player's team
export const healTeam = async () => {
  const currentState = await loadGameState()

  // If team is empty and player has selected a starter, initialize with default starter
  if ((!currentState.playerTeam || currentState.playerTeam.length === 0) && currentState.hasSelectedStarter) {
    const initialState = getInitialGameState()
    initialState.playerTeam = [createMonster(1, 5)] // Default to Mathling
    return saveGameState({
      ...currentState,
      playerTeam: initialState.playerTeam,
    })
  }

  // If team exists, heal all monsters
  if (currentState.playerTeam && currentState.playerTeam.length > 0) {
    const healedTeam = currentState.playerTeam.map((monster) => ({
      ...monster,
      health: monster.maxHealth,
    }))

    return saveGameState({
      ...currentState,
      playerTeam: healedTeam,
    })
  }

  return currentState
}

// Update player team with proper exp values
export const updatePlayerTeam = async (newTeam) => {
  try {
    const gameState = await loadGameState()

    // Ensure exp properties are properly set
    const updatedTeam = newTeam.map((monster) => {
      if (monster.exp === undefined) {
        monster.exp = 0
      }
      if (monster.expToNextLevel === undefined) {
        monster.expToNextLevel = calculateExpToNextLevel(monster.level)
      }
      if (monster.maxHealth === undefined) {
        monster.maxHealth = monster.health || calculateHealth(monster.baseHealth, monster.level)
      }
      if (monster.health === undefined) {
        monster.health = monster.maxHealth
      }
      return monster
    })

    return saveGameState({
      ...gameState,
      playerTeam: updatedTeam,
    })
  } catch (error) {
    console.error("Error updating player team:", error)
    throw error
  }
}

// Mark a trainer's random encounter as completed
export const completeTrainerEncounter = async (trainerId) => {
  try {
    const gameState = await loadGameState()

    // Check if this encounter is already completed
    if (!gameState.completedEncounters.includes(trainerId)) {
      return saveGameState({
        ...gameState,
        completedEncounters: [...gameState.completedEncounters, trainerId],
      })
    }

    return gameState
  } catch (error) {
    console.error("Error completing trainer encounter:", error)
    throw error
  }
}

// Check if a trainer's random encounter has been completed
export const hasCompletedTrainerEncounter = async (trainerId) => {
  try {
    const gameState = await loadGameState()
    return gameState.completedEncounters.includes(trainerId)
  } catch (error) {
    console.error("Error checking completed encounters:", error)
    return false
  }
}

// Check if the player has selected a starter monster
export const hasSelectedStarter = async () => {
  try {
    const gameState = await loadGameState()
    return gameState.hasSelectedStarter === true
  } catch (error) {
    console.error("Error checking if starter has been selected:", error)
    return false
  }
}

