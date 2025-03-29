import React, { useState, useEffect, useRef, useCallback } from "react"
import { View, StyleSheet, Animated, BackHandler, Modal, TouchableOpacity, Text, Image, Alert, ScrollView } from "react-native"
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native"
import MonsterDisplay from "../components/battle/MonsterDisplay"
import MovesPanel from "../components/battle/MovesPanel"
import ProblemModal from "../components/battle/ProblemModal"
import BattleText from "../components/battle/BattleText"
import { loadGameState, saveGameState, completeTrainerEncounter } from "../utils/gameState"
import { SCHOOLS, getRandomEncounterForTrainer } from "../data/schools"
import { playSound, playBgMusic, stopBgMusic, stopSound, pauseBgMusic, resumeBgMusic } from "../utils/audio"
import { calculateExpGain, getEvolution, calculateExpToNextLevel } from "../data/monsters"
import { updateProgression } from "../utils/gameState"
import { Ionicons } from "@expo/vector-icons"

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
  const [previousProblemId, setPreviousProblemId] = useState(null);
  const [wasAnswerCorrect, setWasAnswerCorrect] = useState(false);

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

  const [backgroundImage, setBackgroundImage] = useState(null); // Store the background image

  // Create a ref to store the latest team data that persists between function calls
  const latestTeamRef = useRef([])
  // Create a ref to store the current active monster to prevent switching issues
  const activeMonsterRef = useRef(null)

  const [showFaintedTeamScreen, setShowFaintedTeamScreen] = useState(false);

  const playerHealthAnim = useRef(new Animated.Value(100)).current
  const enemyHealthAnim = useRef(new Animated.Value(100)).current
  const playerExpAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      // When battle screen comes into focus, stop any existing music and play battle music
      const setupBattleAudio = async () => {
        await stopBgMusic(); // Ensure all music is stopped first

        // Select battle music based on trainer position in the school
        if (isRandomBattle) {
          // For random encounters, use battle1
          await playBgMusic("battle1", 0.3);
        } else {
          // For trainer battles, select music based on trainer position
          const school = SCHOOLS.find((s) => s.id === schoolId);
          if (school) {
            const trainerIndex = school.trainers.findIndex((t) => t.id === trainerId);
            if (trainerIndex === 0) {
              await playBgMusic("battle1", 0.3);
            } else if (trainerIndex === 1) {
              await playBgMusic("battle2", 0.3);
            } else if (trainerIndex === 2) {
              await playBgMusic("battle3", 0.3);
            } else {
              await playBgMusic("battle1", 0.3);
            }
          } else {
            // Default if school not found
            await playBgMusic("battle1", 0.3);
          }
        }
      };

      setupBattleAudio();

      // Cleanup function when screen loses focus
      return () => {
        stopBgMusic(); // Stop battle music when leaving
      };
    }, [schoolId, trainerId, isRandomBattle])
  );

  useEffect(() => {
    initializeBattle()
    // playBgMusic("battle")

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
      // navigation.goBack()
      return true
    }
    return false
  }

  useEffect(() => {
    const school = SCHOOLS.find((s) => s.id === schoolId);
    if (school) {
      switch (school.type) {
        case "grass":
          setBackgroundImage(require("../assets/battle-bg-grass.jpg"));
          break;
        case "fire":
          setBackgroundImage(require("../assets/battle-bg-fire.png"));
          break;
        case "water":
          setBackgroundImage(require("../assets/battle-bg-water.jpg"));
          break;
        default:
          setBackgroundImage(require("../assets/battle-bg-grass.jpg"));
      }
    } else {
      setBackgroundImage(require("../assets/battle-bg-grass.jpg"));
    }
  }, [schoolId]);

  const initializeBattle = async () => {
    try {
      const validTeam = await checkTeamHealth();
      if (!validTeam) {
        // navigation.goBack();
        setShowFaintedTeamScreen(true);
      }

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
        // playSound("battleStart")
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
        // playSound("battleStart")
        setInitializationComplete(true) // Set to true after successful initialization
      }
    } catch (error) {
      console.error("Battle initialization error:", error)
      navigation.goBack()
    }
  }

  const handleMoveSelect = async (move) => {
    if (isProcessingTurn) return;
    setCurrentMove(move);

    // Get all available problems from the trainer
    const availableProblems = await enemyTrainer?.problems() || [];

    if (availableProblems.length === 0) {
      console.error("No problems available for this trainer");
      return;
    }

    // If there's only one problem, we have no choice but to use it
    if (availableProblems.length === 1) {
      setCurrentProblem(availableProblems[0]);
      setPreviousProblemId(availableProblems[0].id);
      playSound("question", 0.2);
      return;
    }

    // Filter out the previous problem to avoid repetition
    const eligibleProblems = availableProblems.filter(
      problem => problem.id !== previousProblemId
    );

    // Select a random problem from eligible problems
    const randomIndex = Math.floor(Math.random() * eligibleProblems.length);
    const selectedProblem = eligibleProblems[randomIndex];

    // Save the selected problem ID for next time
    setPreviousProblemId(selectedProblem.id);

    // Set the current problem and play sound
    setCurrentProblem(selectedProblem);
    playSound("question", 0.2);
  };

  const checkTeamHealth = async () => {
    try {
      const gameState = await loadGameState();

      if (!gameState.playerTeam || gameState.playerTeam.length === 0) {
        Alert.alert("Error", "Your team is empty. Please restart the game.");
        navigation.goBack();
        return false;
      }

      // Check if all monsters are fainted
      const allFainted = gameState.playerTeam.every(monster => monster.health <= 0);
      if (allFainted) {
        Alert.alert(
          "Team Fainted",
          "All your monsters have fainted. Please heal your team at the Pokémon Center.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return false;
      }

      // Make sure a non-fainted monster is used as active
      if (gameState.playerTeam[0].health <= 0) {
        // Find the first non-fainted monster
        const firstHealthyMonster = gameState.playerTeam.find(monster => monster.health > 0);

        if (firstHealthyMonster) {
          // Reorder the team to put the healthy monster first
          const reorderedTeam = [
            firstHealthyMonster,
            ...gameState.playerTeam.filter(m => m.uniqueId !== firstHealthyMonster.uniqueId)
          ];

          // Save the reordered team
          await saveGameState({
            ...gameState,
            playerTeam: reorderedTeam
          });

          return reorderedTeam;
        }
      }

      return gameState.playerTeam;
    } catch (error) {
      console.error("Error checking team health:", error);
      Alert.alert("Error", "Something went wrong checking your team's health.");
      navigation.goBack();
      return false;
    }
  };

  const handleProblemAnswer = async (correct) => {
    const gameState = await loadGameState();

    setWasAnswerCorrect(correct);
    setIsProcessingTurn(true);
    setBattleText(correct ? "Correct!" : "Incorrect!");

    if (correct) {
      playSound("correctAnswer", 0.3);
      updateProgression(gameState.settings.subject);
    } else {
      playSound("wrongAnswer", 0.3);
    }
  };

  const handleContinue = async () => {
    playSound("click", 0.3);
    setCurrentProblem(null); // Close the problem modal

    // If the answer was incorrect, skip the player's attack and proceed to the enemy's turn
    if (!wasAnswerCorrect) {
      setBattleText("The attack missed!");

      // Proceed to the enemy's turn after a delay
      setTimeout(() => {
        handleEnemyTurn();
      }, 2000);

      return;
    }

    // Use the ref to ensure we have the latest active monster
    const currentActiveMonster = activeMonsterRef.current;

    if (currentMove && currentActiveMonster && enemyMonster) {
      // Player's turn - attack animation
      setIsPlayerAttacking(true);

      // Wait for attack animation to complete
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsPlayerAttacking(false);

      // Enemy takes damage animation
      setIsEnemyTakingDamage(true);

      // Calculate and apply damage
      const move = currentMove;

      const typeBonus = getTypeBonus(
        move?.type?.toLowerCase() || currentActiveMonster.type.toLowerCase(),
        enemyMonster.type.toLowerCase()
      );

      const damage = calculateDamage(currentActiveMonster, enemyMonster, move);
      console.log("Player Damage: ", damage);

      let newEnemyHealth;
      if (isRandomBattle) {
        // For random encounters, stop at 1 HP to allow catching
        newEnemyHealth = Math.max(1, enemyMonster.health - damage);
      } else {
        // For trainer battles, allow fainting (0 HP)
        newEnemyHealth = Math.max(0, enemyMonster.health - damage);
      }

      Animated.timing(enemyHealthAnim, {
        toValue: newEnemyHealth,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      enemyMonster.health = newEnemyHealth;

      if (isRandomBattle && newEnemyHealth === 1) {
        setShowCatchButton(true);
      }

      let effectivenessText = "";
      if (typeBonus > 1) {
        effectivenessText = " It's super effective!";
        playSound("hit", 0.4);
      } else if (typeBonus < 1) {
        effectivenessText = " It's not very effective...";
        playSound("hit", 0.4);
      } else {
        playSound("hit", 0.4);
      }

      setBattleText(`${currentActiveMonster.name} used ${move?.name || "attack"}!${effectivenessText}`);

      // Wait for damage animation to complete
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsEnemyTakingDamage(false);

      // Check if enemy fainted
      if (newEnemyHealth <= 0) {
        setIsEnemyFainted(true);
        handleEnemyMonsterFainted();
        return;
      }
    }

    // Enemy's turn after a delay
    setTimeout(() => {
      handleEnemyTurn();
    }, 2000);

    // setIsProcessingTurn(false); // Allow the fight to continue
  };

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
    const monsterIndex = updatedTeam.findIndex((m) => m.uniqueId === currentActiveMonster.uniqueId)
    if (monsterIndex !== -1) {
      updatedTeam[monsterIndex].health = newPlayerHealth
      latestTeamRef.current = updatedTeam
      // Also update the playerTeam state to ensure it's in sync
      setPlayerTeam(updatedTeam)
    }

    let effectivenessText = "";
    if (typeBonus > 1) {
      effectivenessText = " It's super effective!";
      playSound("hit", 0.4);
    } else if (typeBonus < 1) {
      effectivenessText = " It's not very effective...";
      playSound("hit", 0.4);
    } else {
      playSound("hit", 0.4);
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
    const monsterFromTeam = playerTeam.find((m) => m.uniqueId === newMonster.uniqueId)

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
      playSound("switch", 0.2)

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

    // Wait for the capture animation to complete
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Monster is caught!
    setBattleText(`${enemyMonster.name} has been caught!`)
    playSound("capture", 0.2)

    // Add the caught monster to the player's team
    try {
      const gameState = await loadGameState()

      // Create a copy of the caught monster with full health
      const caughtMonster = {
        ...enemyMonster,
        // health: enemyMonster.maxHealth, // Restore health
        exp: 0,
        expToNextLevel: calculateExpToNextLevel(enemyMonster.level),
        uniqueId: `${enemyMonster.id}-${Date.now()}`,
      }

      const currentTeam = JSON.parse(JSON.stringify(latestTeamRef.current));

      // Add to player team
      const updatedTeam = [...currentTeam, caughtMonster]
      console.log("Updated player team:", updatedTeam);

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
    const activeMonsterIndex = updatedTeam.findIndex((m) => m.uniqueId === currentActiveMonster.uniqueId)

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
      const evolution = getEvolution(updatedMonster.id, updatedMonster.level); // Use `id` instead of `uniqueId`
      if (evolution) {
        const newMaxHealth = Math.floor(evolution.baseHealth * (1 + (updatedMonster.level - 1) * 0.1));
        evolvedMonster = {
          ...evolution,
          level: updatedMonster.level,
          exp: updatedMonster.exp,
          expToNextLevel: updatedMonster.expToNextLevel,
          health: newMaxHealth, // Set health to full with new max health
          maxHealth: newMaxHealth,
        };

        // Update the evolved monster in the team
        updatedTeam[activeMonsterIndex] = evolvedMonster;
      } else {
        // If no evolution, update the leveled-up monster in the team
        updatedTeam[activeMonsterIndex] = updatedMonster;
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
      // playSound("expGain", 0.5);
      setBattleText(`${currentActiveMonster.name} gained ${expGained} EXP!`)

      setTimeout(() => {
        if (evolvedMonster) {
          setBattleText(`${currentActiveMonster.name} is evolving into ${evolvedMonster.name}!`)
          pauseBgMusic()
          playSound("evolution", 0.5)

          // Start evolution animation
          setIsEvolving(true)

          // After animation completes, update the active monster
          setTimeout(() => {
            stopSound("evolution")
            setIsEvolving(false)
            resumeBgMusic();
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
          playSound("levelUp", 0.3)

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
        playSound("switch", 0.1)
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
    const faintedMonsterIndex = updatedTeam.findIndex((m) => m.uniqueId === activeMonsterRef.current?.uniqueId)

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
        playSound("switch", 0.1)
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
  stopBgMusic();
  setBattleText(`You defeated ${enemyTrainer?.name}!`);
  playSound("victory", 0.2);

  try {
    const gameState = await loadGameState();

    // Add the defeated trainer to the gameState
    const updatedDefeatedTrainers = [...(gameState.defeatedTrainers || []), trainerId];

    await saveGameState(
      {
        ...gameState,
        defeatedTrainers: updatedDefeatedTrainers,
      },
    );

    setIsBattleOver(true);
    setIsProcessingTurn(false);
  } catch (error) {
    console.error("Error saving battle win:", error);
  }
};

  const handleBattleLoss = async () => {
    setBattleText("You lost the battle...");
    playSound("defeat", 0.2);
    try {
      const gameState = await loadGameState();
      const finalTeam = JSON.parse(JSON.stringify(latestTeamRef.current));
      await saveGameState(
        {
          ...gameState,
          playerTeam: finalTeam,
        },
      );
      setIsBattleOver(true);
      setIsProcessingTurn(false);
    } catch (error) {
      console.error("Error saving battle loss:", error);
    }
  };

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
      fire: { grass: 2, water: 0.5 },
      water: { fire: 2, grass: 0.5 },
      grass: { water: 2, fire: 0.5 },
      math: { science: 2, language: 0.5 },
      science: { language: 2, math: 0.5 },
      language: { math: 2, science: 0.5 },
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

      {/* Background Image */}
      <View style={styles.battleBackgroundContainer}>
        <Image
          source={backgroundImage}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

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
      </View>

      {/* Battle Text */}
      <BattleText
        message={battleText}
        onComplete={() => {
          if (isBattleOver) {
            setTimeout(() => {
              navigation.goBack()
            }, 2000);
          }
        }}
      />
      {/* </View> */}

      {/* Controls */}
      {activeMonster && (
        <MovesPanel
          monster={activeMonster}
          onMoveSelect={handleMoveSelect}
          onSwitchPress={() => {
            playSound("click", 0.3);
            setShowSwitchModal(true)
          }}
          onCatchPress={handleCatchMonster}
          showCatchButton={showCatchButton}
          disabled={!!currentProblem || isBattleOver || isProcessingTurn}
        />
      )}

      {/* Problem Modal */}
      {currentProblem && (
        <ProblemModal
          visible={true}
          problem={currentProblem}
          onAnswer={handleProblemAnswer}
          onContinue={handleContinue}
        />
      )}

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
                  const isActive = monster.uniqueId === activeMonsterRef.current?.uniqueId
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
                          playSound("click", 0.3);
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
                onPress={() => {
                  playSound("click", 0.3);
                  setShowSwitchModal(false)
                }}
                disabled={isProcessingTurn}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Fainted Team Screen */}
      <Modal
        visible={showFaintedTeamScreen}
        transparent={false}
        animationType="fade"
      >
        <View style={styles.faintedTeamContainer}>
          <View style={styles.faintedTeamHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowFaintedTeamScreen(false);
                navigation.goBack();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.faintedTeamTitle}>Team Fainted</Text>
          </View>

          <View style={styles.faintedTeamContent}>
            <Ionicons name="alert-circle" size={80} color="#F44336" />
            <Text style={styles.faintedTeamMessage}>
              All of your monsters have fainted! Visit the healing center to restore your team's health.
            </Text>

            <TouchableOpacity
              style={styles.healingCenterButton}
              onPress={() => {
                setShowFaintedTeamScreen(false);
                navigation.navigate("TeamManagement");
              }}
            >
              <Ionicons name="medical" size={24} color="white" />
              <Text style={styles.healingCenterButtonText}>Healing Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  battleBackgroundContainer: {
    flex: 1,
    backgroundColor: "#87CEEB",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  battleScene: {
    // display: "flex",
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
    fontFamily: "pixel-font",
  },
  faintedText: {
    color: "#F44336",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
  faintedTeamContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  faintedTeamHeader: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "#4CAF50", // Green header
    backgroundColor: "#333",
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  faintedTeamTitle: {
    color: "white",
    fontSize: 20,
    fontFamily: "pixel-font",
  },
  faintedTeamContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 10,
  },
  faintedTeamMessage: {
    fontSize: 20,
    textAlign: "center",
    marginVertical: 15,
    fontFamily: "pixel-font",
    // lineHeight: 30,
  },
  healingCenterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50", // Green to match healing theme
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    // marginTop: 20,
  },
  healingCenterButtonText: {
    color: "white",
    fontSize: 18,
    marginLeft: 10,
    fontFamily: "pixel-font",
  },
})
