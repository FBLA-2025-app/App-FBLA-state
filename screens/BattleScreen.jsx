import { useState, useEffect, useRef } from "react"
import { View, StyleSheet, Animated, BackHandler, Modal, TouchableOpacity, Text, Image, Alert, ScrollView } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import MonsterDisplay from "../components/battle/MonsterDisplay"
// import PlayerMonsterDisplay from "../components/battle/PlayerMonsterDisplay"
// import EnemyMonsterDisplay from "../components/battle/EnemyMonsterDisplay"
import MovesPanel from "../components/battle/MovesPanel"
import ProblemModal from "../components/battle/ProblemModal"
import BattleText from "../components/battle/BattleText"
import { loadGameState, saveGameState, completeTrainerEncounter } from "../utils/gameState"
import { SCHOOLS, getRandomEncounterForTrainer } from "../data/schools"
import { playSound, playBgMusic, stopBgMusic } from "../utils/audio"
import { calculateExpGain, getEvolution, calculateExpToNextLevel } from "../data/monsters"

// Add this debugging function at the top of the component
const logTeamHealth = (team, label = "Team") => {
  console.log(
    `${label} health status:`,
    team.map((m) => `${m.name} (HP: ${m.health}/${m.maxHealth})`),
  )
}

// Helper function to create a fresh copy of trainer monsters with full health
const createFreshTrainerMonsters = (trainerMonsters) => {
  return trainerMonsters.map((monster) => ({
    ...monster,
    health: monster.maxHealth || monster.health, // Use maxHealth if available, otherwise use the default health
  }))
}

export default function BattleScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { trainerId, schoolId, isRandomEncounter, isPreTrainerEncounter } = route.params || {}

  const [playerTeam, setPlayerTeam] = useState([])
  const [activeMonster, setActiveMonster] = useState(null)
  const [enemyTrainer, setEnemyTrainer] = useState(null)
  const [enemyMonster, setEnemyMonster] = useState(null)
  const [currentProblem, setCurrentProblem] = useState(null)
  const [battleText, setBattleText] = useState("")
  const [isBattleOver, setIsBattleOver] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [isProcessingTurn, setIsProcessingTurn] = useState(false)
  const [initializationComplete, setInitializationComplete] = useState(false)
  const [isRandomBattle, setIsRandomBattle] = useState(false)
  const [showCatchButton, setShowCatchButton] = useState(false)
  const [isCaptureAnimation, setIsCaptureAnimation] = useState(false)

  const [currentMove, setCurrentMove] = useState(null)

  // Add new animation states at the top of the component with other state variables
  const [isSwapping, setIsSwapping] = useState(false)
  const [swappingOutMonster, setSwappingOutMonster] = useState(null)
  const [isEvolving, setIsEvolving] = useState(false)

  // Track the original number of monsters the trainer had
  const [originalTrainerMonsterCount, setOriginalTrainerMonsterCount] = useState(0)
  // Track how many monsters have been defeated
  const [defeatedMonsterCount, setDefeatedMonsterCount] = useState(0)

  // Animation states
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false)
  const [isEnemyAttacking, setIsEnemyAttacking] = useState(false)
  const [isPlayerTakingDamage, setIsPlayerTakingDamage] = useState(false)
  const [isEnemyTakingDamage, setIsEnemyTakingDamage] = useState(false)
  const [isEnemyFainted, setIsEnemyFainted] = useState(false)
  const [isPlayerFainted, setIsPlayerFainted] = useState(false)

  // Create a ref to store the latest team data that persists between function calls
  const latestTeamRef = useRef([])
  // Create a ref to store the current active monster to prevent switching issues
  const activeMonsterRef = useRef(null)

  const playerHealthAnim = useRef(new Animated.Value(100)).current
  const enemyHealthAnim = useRef(new Animated.Value(100)).current
  const playerExpAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    initializeBattle()
    playBgMusic("battle")

    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress)

    return () => {
      backHandler.remove()
      stopBgMusic()
    }
  }, [])

  // Update the ref whenever activeMonster changes
  useEffect(() => {
    if (activeMonster) {
      activeMonsterRef.current = activeMonster
    }
  }, [activeMonster])

  const handleBackPress = () => {
    if (isBattleOver) {
      navigation.goBack()
      return true
    }
    return false
  }

  // Fix the issue with trainer monsters not being properly initialized
  const initializeBattle = async () => {
    try {
      const gameState = await loadGameState()

      // Check if player team is empty
      if (!gameState.playerTeam || gameState.playerTeam.length === 0) {
        console.error("Player team is empty, cannot start battle")
        Alert.alert("Error", "Your team is empty. Please restart the game.")
        navigation.goBack()
        return
      }

      // Set if this is a random encounter
      setIsRandomBattle(isRandomEncounter === true)

      if (isRandomEncounter) {
        // This is a random encounter before a trainer battle
        let wildMonster

        if (isPreTrainerEncounter) {
          // Get the random encounter for this specific trainer
          wildMonster = getRandomEncounterForTrainer(schoolId, trainerId)
        }

        if (!wildMonster) {
          console.error("Failed to generate random encounter")
          navigation.goBack()
          return
        }

        // Create a fake trainer for the wild monster
        const wildTrainer = {
          id: `wild-${Date.now()}`, // Unique ID
          name: "Wild Monster",
          monsters: [wildMonster],
          problems: SCHOOLS.find((s) => s.id === schoolId)?.trainers[0]?.problems || [],
        }

        // Make sure exp is set
        const playerTeamWithExp = gameState.playerTeam.map((monster) => ({
          ...monster,
          exp: monster.exp || 0,
          expToNextLevel: monster.expToNextLevel || calculateExpToNextLevel(monster.level),
        }))

        // Initialize the latestTeamRef with the player team
        latestTeamRef.current = JSON.parse(JSON.stringify(playerTeamWithExp))

        setPlayerTeam(playerTeamWithExp)
        logTeamHealth(playerTeamWithExp, "Initial Player Team")
        setActiveMonster(playerTeamWithExp[0])
        activeMonsterRef.current = playerTeamWithExp[0] // Initialize the ref
        setEnemyTrainer(wildTrainer)
        setEnemyMonster(wildMonster)

        // Set the original monster count (1 for wild encounters)
        setOriginalTrainerMonsterCount(1)

        playerHealthAnim.setValue(playerTeamWithExp[0].health)
        enemyHealthAnim.setValue(wildMonster.health)

        // Make sure to set the initial exp animation value
        playerExpAnim.setValue(playerTeamWithExp[0].exp || 0)

        setBattleText(`A wild ${wildMonster.name} appeared!`)
        playSound("battleStart")
        setInitializationComplete(true)
      } else {
        // Regular trainer battle
        const school = SCHOOLS.find((s) => s.id === schoolId)
        if (!school) {
          console.error(`School with ID ${schoolId} not found`)
          navigation.goBack()
          return
        }

        const trainer = school.trainers.find((t) => t.id === trainerId)
        if (!trainer) {
          console.error(`Trainer with ID ${trainerId} not found in school ${schoolId}`)
          navigation.goBack()
          return
        }

        console.log("Found trainer:", trainer)
        console.log("Player team:", gameState.playerTeam)
        console.log("Trainer monsters count:", trainer.monsters.length)

        // Create a fresh copy of the trainer's monsters with full health
        // Make sure each monster has a unique reference
        const freshTrainerMonsters = trainer.monsters.map((monster, index) => {
          const freshMonster = {
            ...monster,
            health: monster.maxHealth || monster.health,
            uniqueId: `${monster.id}-${index}`, // Add a unique ID to ensure each monster is distinct
          }
          return freshMonster
        })

        console.log(
          "Trainer monsters:",
          freshTrainerMonsters.map((m) => `${m.name} (HP: ${m.health}/${m.maxHealth})`),
        )

        const freshTrainer = { ...trainer, monsters: freshTrainerMonsters }

        // Make sure exp is set
        const playerTeamWithExp = gameState.playerTeam.map((monster) => ({
          ...monster,
          exp: monster.exp || 0,
          expToNextLevel: monster.expToNextLevel || calculateExpToNextLevel(monster.level),
        }))

        // Initialize the latestTeamRef with the player team
        latestTeamRef.current = JSON.parse(JSON.stringify(playerTeamWithExp))

        setPlayerTeam(playerTeamWithExp)
        logTeamHealth(playerTeamWithExp, "Initial Player Team")
        setActiveMonster(playerTeamWithExp[0])
        activeMonsterRef.current = playerTeamWithExp[0] // Initialize the ref
        setEnemyTrainer(freshTrainer)
        setEnemyMonster(freshTrainerMonsters[0])

        // Set the original monster count for the trainer
        setOriginalTrainerMonsterCount(freshTrainerMonsters.length)
        console.log("Setting original trainer monster count:", freshTrainerMonsters.length)

        playerHealthAnim.setValue(playerTeamWithExp[0].health)
        enemyHealthAnim.setValue(freshTrainerMonsters[0].health)

        // Make sure to set the initial exp animation value
        console.log("Setting initial exp:", playerTeamWithExp[0].exp)
        playerExpAnim.setValue(playerTeamWithExp[0].exp || 0)

        setBattleText(`${trainer.name} wants to battle!`)
        playSound("battleStart")
        setInitializationComplete(true) // Set to true after successful initialization
      }
    } catch (error) {
      console.error("Battle initialization error:", error)
      navigation.goBack()
    }
  }

  const handleMoveSelect = (move) => {
    if (isProcessingTurn) return
    setCurrentMove(move)

    const problem = enemyTrainer?.problems[Math.floor(Math.random() * enemyTrainer.problems.length)]
    console.log(problem)
    if (problem) {
      setCurrentProblem(problem)
      playSound("question")
    }
  }

  const handleProblemAnswer = async (correct) => {
    setCurrentProblem(null)
    setIsProcessingTurn(true)

    // Use the ref to ensure we have the latest active monster
    const currentActiveMonster = activeMonsterRef.current

    if (correct && currentActiveMonster && enemyMonster) {
      playSound("correctAnswer")

      // Player's turn - attack animation
      setIsPlayerAttacking(true)

      // Wait for attack animation to complete
      await new Promise((resolve) => setTimeout(resolve, 300))
      setIsPlayerAttacking(false)

      // Enemy takes damage animation
      setIsEnemyTakingDamage(true)

      // Calculate and apply damage
      const move = currentMove

      const typeBonus = getTypeBonus(
        move?.type?.toLowerCase() || currentActiveMonster.type.toLowerCase(),
        enemyMonster.type.toLowerCase()
      );

      const damage = calculateDamage(currentActiveMonster, enemyMonster, move)
      console.log("Player Damage: ", damage)

      // Different HP handling for random encounters vs trainer battles
      let newEnemyHealth
      if (isRandomBattle) {
        // For random encounters, stop at 1 HP to allow catching
        newEnemyHealth = Math.max(1, enemyMonster.health - damage)
      } else {
        // For trainer battles, allow fainting (0 HP)
        newEnemyHealth = Math.max(0, enemyMonster.health - damage)
      }

      Animated.timing(enemyHealthAnim, {
        toValue: newEnemyHealth,
        duration: 1000,
        useNativeDriver: false,
      }).start()

      enemyMonster.health = newEnemyHealth


      let effectivenessText = "";
      if (typeBonus > 1) {
        effectivenessText = " It's super effective!";
        playSound("hit");
        // Could play a special sound for super effective hits
      } else if (typeBonus < 1) {
        effectivenessText = " It's not very effective...";
        playSound("hit");
      } else {
        playSound("hit");
      }

      // setBattleText(`${currentActiveMonster.name} dealt ${damage} damage!`)
      setBattleText(`${currentActiveMonster.name} used ${move?.name || "attack"}!${effectivenessText}`);

      // Wait for damage animation to complete
      await new Promise((resolve) => setTimeout(resolve, 400))
      setIsEnemyTakingDamage(false)

      // Check if enemy is at 1 HP and this is a random encounter
      if (newEnemyHealth <= 1 && isRandomBattle) {
        setShowCatchButton(true)
        setBattleText(`${enemyMonster.name} is weak, catch it!`)
        setIsProcessingTurn(false)
        return
      }

      // Check if enemy fainted
      if (newEnemyHealth <= 0) {
        setIsEnemyFainted(true)
        handleEnemyMonsterFainted()
        return
      }
    } else {
      playSound("wrongAnswer")
      setBattleText("The attack missed!")
    }

    // Enemy's turn after a delay
    setTimeout(() => {
      handleEnemyTurn()
    }, 2000)
  }

  // Fix the player damage animation by implementing it directly in BattleScreen
  const handleEnemyTurn = async () => {
    if (!activeMonsterRef.current || !enemyMonster) {
      setIsProcessingTurn(false)
      return
    }

    // Use the ref to ensure we have the latest active monster
    const currentActiveMonster = activeMonsterRef.current

    // Enemy attack animation
    setIsEnemyAttacking(true)

    // Wait for attack animation to complete
    await new Promise((resolve) => setTimeout(resolve, 300))
    setIsEnemyAttacking(false)

    // Player takes damage animation
    setIsPlayerTakingDamage(true)

    const enemyMove = enemyMonster.moves[Math.floor(Math.random() * enemyMonster.moves.length)]
    const typeBonus = getTypeBonus(
      enemyMove?.type?.toLowerCase() || enemyMonster.type.toLowerCase(),
      currentActiveMonster.type.toLowerCase()
    );
    const damage = calculateDamage(enemyMonster, currentActiveMonster, enemyMove)
    console.log("Enemy Damage: ", damage)
    const newPlayerHealth = Math.max(0, currentActiveMonster.health - damage)

    Animated.timing(playerHealthAnim, {
      toValue: newPlayerHealth,
      duration: 1000,
      useNativeDriver: false,
    }).start()

    // Update the active monster's health
    const updatedMonster = { ...currentActiveMonster, health: newPlayerHealth }
    setActiveMonster(updatedMonster)
    activeMonsterRef.current = updatedMonster // Update the ref

    // Also update the monster in our latestTeamRef
    const updatedTeam = JSON.parse(JSON.stringify(latestTeamRef.current))
    const monsterIndex = updatedTeam.findIndex((m) => m.id === currentActiveMonster.id)
    if (monsterIndex !== -1) {
      updatedTeam[monsterIndex].health = newPlayerHealth
      latestTeamRef.current = updatedTeam
      // Also update the playerTeam state to ensure it's in sync
      setPlayerTeam(updatedTeam)
    }

    let effectivenessText = "";
    if (typeBonus > 1) {
      effectivenessText = " It's super effective!";
      playSound("hit");
    } else if (typeBonus < 1) {
      effectivenessText = " It's not very effective...";
      playSound("hit");
    } else {
      playSound("hit");
    }

    // setBattleText(`Enemy ${enemyMonster.name} used ${enemyMove.name}!`)
    setBattleText(`Enemy ${enemyMonster.name} used ${enemyMove.name}!${effectivenessText}`);
    // playSound("hit")

    // Wait for damage animation to complete
    await new Promise((resolve) => setTimeout(resolve, 400))
    setIsPlayerTakingDamage(false)

    if (newPlayerHealth <= 0) {
      setIsPlayerFainted(true)
      handlePlayerMonsterFainted()
    } else {
      setIsProcessingTurn(false)
    }
  }

  // Fix the switching monsters health restoration issue

  const handleSwitchMonster = (newMonster) => {
    // Close the modal immediately to prevent duplicate sprites
    setShowSwitchModal(false)

    // Set processing turn to true to prevent actions during switch
    setIsProcessingTurn(true)

    // Find the exact monster object in the team by ID
    const monsterFromTeam = playerTeam.find((m) => m.id === newMonster.id)

    if (!monsterFromTeam) {
      console.error("Could not find monster in team")
      setIsProcessingTurn(false)
      return
    }

    console.log("Switching to monster:", monsterFromTeam.name, "with health:", monsterFromTeam.health)

    // Trigger swap animation
    setIsSwapping(true)

    // Set the monster that's being swapped out
    setSwappingOutMonster(activeMonsterRef.current)

    // Wait for the swap animation to start
    setTimeout(() => {
      // Update the active monster
      setActiveMonster(monsterFromTeam)
      activeMonsterRef.current = monsterFromTeam // Update the ref
      playerHealthAnim.setValue(monsterFromTeam.health)
      playerExpAnim.setValue(monsterFromTeam.exp || 0)
      setBattleText(`Go, ${monsterFromTeam.name}!`)
      playSound("switch")

      // End swap animation after a delay
      setTimeout(() => {
        setIsSwapping(false)
        setSwappingOutMonster(null)

        // Enemy's turn after switch
        setTimeout(() => {
          handleEnemyTurn()
        }, 1000)
      }, 500)
    }, 500)
  }

  const handleCatchMonster = async () => {
    setIsProcessingTurn(true)
    setShowCatchButton(false)

    // Start capture animation
    setIsCaptureAnimation(true)
    setBattleText(`Throwing a capture ball at ${enemyMonster.name}...`)
    playSound("capture")

    // Wait for the capture animation to complete
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Monster is caught!
    setBattleText(`${enemyMonster.name} has been caught!`)
    playSound("captureSuccess")

    // Add the caught monster to the player's team
    try {
      const gameState = await loadGameState()

      // Create a copy of the caught monster with full health
      const caughtMonster = {
        ...enemyMonster,
        health: enemyMonster.maxHealth, // Restore health
        exp: 0,
        expToNextLevel: calculateExpToNextLevel(enemyMonster.level),
      }

      // Add to player team
      const updatedTeam = [...gameState.playerTeam, caughtMonster]

      // Save the updated team
      await saveGameState({
        ...gameState,
        playerTeam: updatedTeam,
      })

      // If this was a pre-trainer encounter, mark it as completed
      if (isPreTrainerEncounter) {
        await completeTrainerEncounter(trainerId)
      }

      // End battle after a delay
      setTimeout(() => {
        setIsBattleOver(true)
        setIsProcessingTurn(false)
      }, 2000)
    } catch (error) {
      console.error("Error catching monster:", error)
      setIsProcessingTurn(false)
    }
  }

  // Fix the issue with trainer's next monster not appearing
  const handleEnemyMonsterFainted = async () => {
    setBattleText(`Enemy ${enemyMonster?.name} fainted!`)
    playSound("faint")

    // Increment the defeated monster count
    const newDefeatedCount = defeatedMonsterCount + 1
    setDefeatedMonsterCount(newDefeatedCount)
    console.log(`Monster defeated! Count: ${newDefeatedCount}/${originalTrainerMonsterCount}`)

    // Award experience to the active monster
    const currentActiveMonster = activeMonsterRef.current
    const expGained = calculateExpGain(enemyMonster.level, currentActiveMonster.level)

    // Create a deep copy of the active monster to update
    const updatedMonster = JSON.parse(JSON.stringify(currentActiveMonster))
    updatedMonster.exp += expGained

    // Create a deep copy of the player team from our ref
    const updatedTeam = JSON.parse(JSON.stringify(latestTeamRef.current))

    // Find the index of the active monster in the team
    const activeMonsterIndex = updatedTeam.findIndex((m) => m.id === currentActiveMonster.id)

    if (activeMonsterIndex === -1) {
      console.error("Active monster not found in player team")
      return
    }

    // Update the monster in the team
    updatedTeam[activeMonsterIndex] = updatedMonster

    // Animate the exp gain
    Animated.timing(playerExpAnim, {
      toValue: updatedMonster.exp,
      duration: 1000,
      useNativeDriver: false,
    }).start()

    // Check for level ups
    let leveledUp = false
    let evolvedMonster = null

    if (updatedMonster.exp >= updatedMonster.expToNextLevel) {
      // Level up the monster
      updatedMonster.level += 1
      updatedMonster.exp -= updatedMonster.expToNextLevel
      updatedMonster.expToNextLevel = calculateExpToNextLevel(updatedMonster.level)
      updatedMonster.maxHealth = Math.floor(updatedMonster.maxHealth * 1.1) // Increase max health by 10%
      // updatedMonster.health = updatedMonster.maxHealth // Heal on level up
      leveledUp = true

      // Check for evolution
      const evolution = getEvolution(updatedMonster.id, updatedMonster.level)
      if (evolution) {
        const newMaxHealth = Math.floor(evolution.baseHealth * (1 + (updatedMonster.level - 1) * 0.1))
        evolvedMonster = {
          ...evolution,
          level: updatedMonster.level,
          exp: updatedMonster.exp,
          expToNextLevel: updatedMonster.expToNextLevel,
          health: newMaxHealth, // Set health to full with new max health
          maxHealth: newMaxHealth,
        }

        // Update the evolved monster in the team
        updatedTeam[activeMonsterIndex] = evolvedMonster
      } else {
        // If no evolution, update the leveled up monster in the team
        updatedTeam[activeMonsterIndex] = updatedMonster
      }
    }

    // Update state with the new team
    setPlayerTeam(updatedTeam)

    // Update our ref with the latest team data
    latestTeamRef.current = updatedTeam
    console.log("Updated latestTeamRef:", JSON.stringify(latestTeamRef.current))

    // Save the game state immediately after exp gain
    try {
      const gameState = await loadGameState()
      await saveGameState({
        ...gameState,
        playerTeam: updatedTeam,
      })
      console.log("Saved team after exp gain:", JSON.stringify(updatedTeam))
    } catch (error) {
      console.error("Error saving exp gain:", error)
    }

    // Show appropriate messages
    setTimeout(() => {
      setBattleText(`${currentActiveMonster.name} gained ${expGained} EXP!`)
      playSound("expGain")

      setTimeout(() => {
        if (evolvedMonster) {
          setBattleText(`${currentActiveMonster.name} is evolving into ${evolvedMonster.name}!`)
          playSound("evolution")

          // Start evolution animation
          setIsEvolving(true)

          // After animation completes, update the active monster
          setTimeout(() => {
            setIsEvolving(false)
            setActiveMonster(evolvedMonster)
            activeMonsterRef.current = evolvedMonster // Update the ref
            playerHealthAnim.setValue(evolvedMonster.health)
            // Reset exp animation for evolved monster
            playerExpAnim.setValue(evolvedMonster.exp)

            // Continue with battle flow after evolution completes
            checkForNextEnemyMonster(newDefeatedCount)
          }, 5000) // Evolution animation duration
        } else if (leveledUp) {
          setBattleText(`${currentActiveMonster.name} leveled up to level ${updatedMonster.level}!`)
          playSound("levelUp")

          // Update active monster
          setActiveMonster(updatedMonster)
          activeMonsterRef.current = updatedMonster // Update the ref
          playerHealthAnim.setValue(updatedMonster.health)

          // Continue with battle flow
          setTimeout(() => {
            checkForNextEnemyMonster(newDefeatedCount)
          }, 2000)
        } else {
          // No level up or evolution, continue with battle flow
          checkForNextEnemyMonster(newDefeatedCount)
        }
      }, 2000)
    }, 2000)
  }

  // Helper function to check for next enemy monster
  const checkForNextEnemyMonster = (newDefeatedCount) => {
    // Reset the fainted animation
    setIsEnemyFainted(false)

    // Mark the current enemy monster as defeated
    if (enemyMonster) {
      enemyMonster.health = 0
    }

    // Check if we've defeated all the trainer's monsters
    if (newDefeatedCount >= originalTrainerMonsterCount) {
      console.log("All monsters defeated, handling battle win")
      handleBattleWin()
      return
    }

    // Find the next enemy monster that has health > 0
    const nextEnemyMonster = enemyTrainer?.monsters.find((m) => m.health > 0)
    console.log("Next enemy monster:", nextEnemyMonster ? nextEnemyMonster.name : "None found")

    if (nextEnemyMonster) {
      console.log("Switching to next enemy monster:", nextEnemyMonster.name)

      // Reset all animation states
      setIsEnemyFainted(false)
      setIsEnemyAttacking(false)
      setIsEnemyTakingDamage(false)
      setIsCaptureAnimation(false)

      // Create a fresh copy of the next monster to ensure React detects the change
      const freshNextMonster = {
        ...nextEnemyMonster,
        uniqueId: `${nextEnemyMonster.id}-${Date.now()}`, // Add a timestamp to ensure uniqueness
      }

      // Reset the enemy health animation to the new monster's health
      enemyHealthAnim.setValue(freshNextMonster.health)

      // Set the new enemy monster with a slight delay to ensure animations reset
      setTimeout(() => {
        setEnemyMonster(freshNextMonster)
        setBattleText(`${enemyTrainer?.name} sent out ${freshNextMonster.name}!`)
        playSound("switch")
        setIsProcessingTurn(false)
      }, 100)
    } else {
      console.log("No more enemy monsters, handling battle win")
      handleBattleWin()
    }
  }

  // Fix the handlePlayerMonsterFainted function to properly switch to the next monster
  const handlePlayerMonsterFainted = () => {
    setBattleText(`${activeMonsterRef.current?.name} fainted!`)
    playSound("faint")

    // Mark the current monster as fainted with 0 health
    const updatedTeam = JSON.parse(JSON.stringify(latestTeamRef.current))
    const faintedMonsterIndex = updatedTeam.findIndex((m) => m.id === activeMonsterRef.current?.id)

    if (faintedMonsterIndex !== -1) {
      updatedTeam[faintedMonsterIndex].health = 0
      latestTeamRef.current = updatedTeam
      setPlayerTeam(updatedTeam)
    }

    // Find the next available monster with health > 0
    const nextMonster = updatedTeam.find((m) => m.health > 0)

    // Log team health status to debug
    console.log(
      "Team health status after fainting:",
      updatedTeam.map((m) => `${m.name}: ${m.health}/${m.maxHealth}`),
    )
    console.log("Next monster:", nextMonster ? nextMonster.name : "None available")

    if (nextMonster) {
      setTimeout(() => {
        // Reset the fainted animation
        setIsPlayerFainted(false)

        setActiveMonster(nextMonster)
        activeMonsterRef.current = nextMonster // Update the ref
        playerHealthAnim.setValue(nextMonster.health)
        playerExpAnim.setValue(nextMonster.exp || 0)
        setBattleText(`Go, ${nextMonster.name}!`)
        playSound("switch")
        setIsProcessingTurn(false)
      }, 2000)
    } else {
      // All monsters are defeated, end the battle
      console.log("All player monsters defeated, ending battle")
      setTimeout(() => {
        handleBattleLoss()
      }, 2000)
    }
  }

  const handleBattleWin = async () => {
    setBattleText(`You defeated ${enemyTrainer?.name}!`)
    playSound("victory")

    try {
      // Get the most up-to-date game state
      const gameState = await loadGameState()

      // Use the team data from our ref instead of the React state
      const finalTeam = JSON.parse(JSON.stringify(latestTeamRef.current))

      console.log("Final team from ref before saving:", JSON.stringify(finalTeam))

      // If this was a pre-trainer encounter, mark it as completed
      if (isRandomBattle && isPreTrainerEncounter) {
        await completeTrainerEncounter(trainerId)

        // Just save the team and return to map
        await saveGameState({
          ...gameState,
          playerTeam: finalTeam,
        })

        // End battle after a delay
        setTimeout(() => {
          setIsBattleOver(true)
          setIsProcessingTurn(false)
        }, 2000)

        return
      }

      // Only add to defeatedTrainers if this is a trainer battle (not random encounter)
      // and if this is the first time defeating this trainer
      if (!isRandomBattle) {
        const alreadyDefeated = gameState.defeatedTrainers.includes(trainerId)

        if (!alreadyDefeated) {
          await saveGameState({
            ...gameState,
            defeatedTrainers: [...gameState.defeatedTrainers, trainerId],
            playerTeam: finalTeam,
          })
        } else {
          // Just save the player team state
          await saveGameState({
            ...gameState,
            playerTeam: finalTeam,
          })
        }
      } else {
        // For random encounters, just save the team
        await saveGameState({
          ...gameState,
          playerTeam: finalTeam,
        })
      }

      // Verify what was saved
      const savedState = await loadGameState()
      console.log("Verified saved team:", JSON.stringify(savedState.playerTeam))

      setIsBattleOver(true)
      setIsProcessingTurn(false)

      // Add a message to indicate the player can battle this trainer again
      if (!isRandomBattle) {
        setTimeout(() => {
          setBattleText(`You can battle ${enemyTrainer?.name} again for more experience!`)
        }, 3000)
      }
    } catch (error) {
      console.error("Error saving battle win:", error)
    }
  }

  // Make sure handleBattleLoss properly ends the battle
  const handleBattleLoss = () => {
    console.log("Battle lost - ending battle")
    setBattleText("You lost the battle...")
    playSound("defeat")
    setIsBattleOver(true)
    setIsProcessingTurn(false)

    // Ensure we navigate back after a delay
    setTimeout(() => {
      navigation.goBack()
    }, 3000)
  }

  const calculateDamage = (attacker, defender, move) => {
    const base = move?.power || 20
    console.log("base power", base)
    const levelFactor = attacker.level / defender.level
    const typeBonus = getTypeBonus(
      move?.type?.toLowerCase() || attacker.type.toLowerCase(),
      defender.type.toLowerCase(),
    )
    return Math.floor(base * levelFactor * typeBonus)
  }

  const getTypeBonus = (attackerType, defenderType) => {
    const typeChart = {
      fire: { grass: 1.5, water: 0.75 },
      water: { fire: 1.5, grass: 0.75 },
      grass: { water: 1.5, fire: 0.75 },
      math: { science: 1.5, language: 0.75 },
      science: { language: 1.5, math: 0.75 },
      language: { math: 1.5, science: 0.75 },
    }
    return typeChart[attackerType]?.[defenderType] || 1
  }

  if (!initializationComplete) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Battle Scene */}
      <View style={styles.battleScene}>
        {activeMonster && (
          <MonsterDisplay
            monster={activeMonster}
            isEnemy={false}
            animatedHealth={playerHealthAnim}
            animatedExp={playerExpAnim}
            isAttacking={isPlayerAttacking}
            isTakingDamage={isPlayerTakingDamage}
            isFainted={isPlayerFainted}
            isSwapping={isSwapping}
            isEvolving={isEvolving}
          />
        )}
        {/* {swappingOutMonster && isSwapping && (
          <MonsterDisplay
            monster={swappingOutMonster}
            animatedHealth={new Animated.Value(swappingOutMonster.health)}
            isSwappingOut={true}
          />
        )} */}
        {enemyMonster && (
          <MonsterDisplay
            monster={enemyMonster}
            isEnemy={true}
            animatedHealth={enemyHealthAnim}
            isAttacking={isEnemyAttacking}
            isTakingDamage={isEnemyTakingDamage}
            isFainted={isEnemyFainted}
            isCaptured={isCaptureAnimation}
          />
        )}
      </View>

      {/* Battle Text */}
      <BattleText
        message={battleText}
        onComplete={() => {
          if (isBattleOver) {
            navigation.goBack()
          }
        }}
      />

      {/* Controls */}
      {activeMonster && (
        <MovesPanel
          monster={activeMonster}
          onMoveSelect={handleMoveSelect}
          onSwitchPress={() => setShowSwitchModal(true)}
          onCatchPress={handleCatchMonster}
          showCatchButton={showCatchButton}
          disabled={!!currentProblem || isBattleOver || isProcessingTurn}
        />
      )}

      {/* Problem Modal */}
      {currentProblem && <ProblemModal visible={true} problem={currentProblem} onAnswer={handleProblemAnswer} />}

      {/* Switch Monster Modal */}
      <Modal
        visible={showSwitchModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Monster</Text>

            {/* Make this section scrollable */}
            {/* <ScrollView style={styles.monsterListContainer}> */}
            <ScrollView>
              <View style={styles.monsterListContainer}>
                {playerTeam.map((monster, index) => {
                  // Show all monsters, but disable those with 0 health
                  const isActive = monster.id === activeMonsterRef.current?.id
                  const isFainted = monster.health <= 0

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monsterOption,
                        isActive && styles.activeMonsterOption,
                        isFainted && styles.faintedMonsterOption,
                      ]}
                      onPress={() => {
                        if (!isFainted && !isActive && !isProcessingTurn) {
                          handleSwitchMonster(monster)
                        }
                      }}
                      disabled={isFainted || isActive || isProcessingTurn}
                    >
                      <Image
                        source={monster.image}
                        style={[styles.monsterOptionImage, isFainted && styles.faintedMonsterImage]}
                      />
                      <View style={styles.monsterOptionInfo}>
                        <Text style={[styles.monsterOptionName, isFainted && styles.faintedMonsterText]}>
                          {monster.name} {isActive ? "(Active)" : ""}
                        </Text>
                        <Text style={[styles.monsterOptionHealth, isFainted && styles.faintedMonsterText]}>
                          HP: {monster.health}/{monster.maxHealth}
                        </Text>
                        {isFainted && <Text style={styles.faintedText}>Fainted</Text>}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            {/* Sticky button at bottom */}
            <View style={styles.stickyButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSwitchModal(false)}
                disabled={isProcessingTurn}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// Add these styles to the StyleSheet
const styles = StyleSheet.create({
  // ... existing styles
  container: {
    flex: 1,
    backgroundColor: "#87CEEB", // blue background
  },
  battleScene: {
    display: "flex",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
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
    paddingBottom: 80, // Add padding at bottom to make room for sticky button
    width: "90%",
    maxHeight: "80%",
    overflow: "scroll",
  },
  modalTitle: {
    fontSize: 22,
    // fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "pixel-font",
  },
  monsterOption: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    padding: 15,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    marginBottom: 10,
  },
  monsterOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  monsterOptionInfo: {
    flex: 1,
  },
  monsterOptionName: {
    fontSize: 16,
    // fontWeight: "bold",
    fontFamily: "pixel-font",
  },
  monsterOptionHealth: {
    fontSize: 12,
    color: "#666",
    fontFamily: "pixel-font",
  },
  monsterListContainer: {
    flex: 1,
    width: "100%",
    display: "flex",
    justifyContent: "space-around",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  stickyButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cancelButton: {
    backgroundColor: "#666",
    padding: 15,
    borderRadius: 10,
    width: "100%",
  },
  cancelButtonText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 14,
    // fontWeight: "bold",
    fontFamily: "pixel-font",
  },

  // Add these new styles
  activeMonsterOption: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  faintedMonsterOption: {
    opacity: 0.7,
    backgroundColor: "#E0E0E0",
  },
  faintedMonsterImage: {
    opacity: 0.5,
  },
  faintedMonsterText: {
    color: "#999",
  },
  faintedText: {
    color: "#F44336",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
})

// // Fix the handleSwitchMonster function to properly close the modal and handle animations
// const handleSwitchMonster = (newMonster) => {
//   // Close the modal immediately to prevent duplicate sprites
//   setShowSwitchModal(false)

//   // Set processing turn to true to prevent actions during switch
//   setIsProcessingTurn(true)

//   // Find the exact monster object in the team by ID
//   const monsterFromTeam = playerTeam.find((m) => m.id === newMonster.id)

//   if (!monsterFromTeam) {
//     console.error("Could not find monster in team")
//     setIsProcessingTurn(false)
//     return
//   }

//   console.log("Switching to monster:", monsterFromTeam.name, "with health:", monsterFromTeam.health)

//   // Trigger swap animation
//   setIsSwapping(true)

//   // Set the monster that's being swapped out
//   setSwappingOutMonster(activeMonsterRef.current)

//   // Wait for the swap animation to start
//   setTimeout(() => {
//     // Update the active monster
//     setActiveMonster(monsterFromTeam)
//     activeMonsterRef.current = monsterFromTeam // Update the ref
//     playerHealthAnim.setValue(monsterFromTeam.health)
//     playerExpAnim.setValue(monsterFromTeam.exp || 0)
//     setBattleText(`Go, ${monsterFromTeam.name}!`)
//     playSound("switch")

//     // End swap animation after a delay
//     setTimeout(() => {
//       setIsSwapping(false)
//       setSwappingOutMonster(null)

//       // Enemy's turn after switch
//       setTimeout(() => {
//         handleEnemyTurn()
//       }, 1000)
//     }, 500)
//   }, 500)
// }

// // Fix the handleBattleLoss function to properly end the battle
// const handleBattleLoss = () => {
//   console.log("Battle lost - ending battle")
//   setBattleText("You lost the battle...")
//   playSound("defeat")
//   setIsBattleOver(true)
//   setIsProcessingTurn(false)

//   // Ensure we navigate back after a delay
//   setTimeout(() => {
//     navigation.goBack()
//   }, 3000)
// }