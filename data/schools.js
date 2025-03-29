import { createMonster } from "../data/monsters"
import { PROBLEMS } from "./problems"
import { loadGameState } from "../utils/gameState"


const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getTrainerProblems = async (start, count) => {
  try {
    const gameState = await loadGameState();
    const subject = gameState.settings?.subject || "math"; // Default to math
    const difficulty = gameState.settings?.difficulty || "normal"; // Default to normal

    console.log(`Fetching problems for ${subject}/${difficulty} from ${start} to ${start + count}`);

    if (PROBLEMS[subject] && PROBLEMS[subject][difficulty]) {
      const problems = PROBLEMS[subject][difficulty].slice(start, start + count);
      return shuffleArray(problems); // Shuffle the problems before returning
    } else {
      console.warn(`Problems not found for ${subject}/${difficulty}, using math/normal as fallback`);
      const fallbackProblems = PROBLEMS.math.normal.slice(start, start + count);
      return shuffleArray(fallbackProblems); // Shuffle fallback problems
    }
  } catch (error) {
    console.error("Error fetching trainer problems:", error);
    const fallbackProblems = PROBLEMS.math.normal.slice(start, start + count);
    return shuffleArray(fallbackProblems); // Shuffle fallback problems
  }
};

export const SCHOOLS = [
  {
    id: 1,
    name: "Grass School",
    type: "grass",
    trainers: [
      {
        id: 1,
        name: "Novice Leaf",
        type: "grass",
        monsters: [createMonster(3, 3)],
        problems: async () => await getTrainerProblems(0, 3),
        isLeader: false,
        schoolId: 1,
        image: require("../assets/trainers/grass-trainer-1.png"),
        hasRandomEncounterBefore: false,
      },
      {
        id: 2,
        name: "Apprentice Vine",
        type: "grass",
        monsters: [createMonster(3, 6), createMonster(3, 8)],
        problems: async () => await getTrainerProblems(3, 6),
        isLeader: false,
        schoolId: 1,
        image: require("../assets/trainers/grass-trainer-2.png"),
        hasRandomEncounterBefore: true,
        randomEncounterPool: [
          {
            monsterId: 3, 
            levelRange: { min: 4, max: 5 },
            chance: 0.9,
          },
          {
            monsterId: 31, 
            levelRange: { min: 6, max: 8 },
            chance: 0.1,
          },
        ],
      },
      {
        id: 3,
        name: "Master Flora",
        type: "grass",
        monsters: [createMonster(2, 6), createMonster(31, 10), createMonster(3, 19)],
        problems: async () => await getTrainerProblems(6, 9),
        isLeader: true,
        schoolId: 1,
        image: require("../assets/trainers/grass-leader.png"),
        // hasRandomEncounterBefore: true,
        hasRandomEncounterBefore: false,
        // randomEncounterPool: [
        //   {
        //     monsterId: 3, 
        //     levelRange: { min: 15, max: 20 },
        //     chance: 0.5, // 50% chance
        //   },
        //   {
        //     monsterId: 31, 
        //     levelRange: { min: 20, max: 25 },
        //     chance: 0.5, // 50% chance
        //   },
        // ],
      },
    ],
    isLocked: false,
  },
  {
    id: 2,
    name: "Fire School",
    type: "fire",
    trainers: [
      {
        id: 4,
        name: "Novice Flynn",
        type: "fire",
        monsters: [createMonster(1, 3)],
        problems: async () => await getTrainerProblems(9, 12),
        isLeader: false,
        schoolId: 2,
        image: require("../assets/trainers/fire-trainer-1.png"),
        hasRandomEncounterBefore: false,
      },
      {
        id: 5,
        name: "Apprentice Ember",
        type: "fire",
        monsters: [createMonster(1, 5), createMonster(1, 6)],
        problems: async () => await getTrainerProblems(12, 15),
        isLeader: false,
        schoolId: 2,
        image: require("../assets/trainers/fire-trainer-2.png"),
        // Random encounter before this trainer
        hasRandomEncounterBefore: true,
        randomEncounterPool: [
          {
            monsterId: 1, // Mathling (fire type)
            levelRange: { min: 3, max: 5 },
            chance: 0.8, // 70% chance of encountering this monster
          },
        ],
      },
      {
        id: 6,
        name: "Master Blaze",
        type: "fire",
        monsters: [createMonster(11, 10), createMonster(11, 12)],
        problems: async () => await getTrainerProblems(15, 18),
        isLeader: true,
        schoolId: 2,
        image: require("../assets/trainers/fire-leader.png"),
        // Random encounter before the leader
        hasRandomEncounterBefore: true,
        randomEncounterPool: [
          {
            monsterId: 1, // Mathling (fire type)
            levelRange: { min: 5, max: 9 },
            chance: 0.5, // 50% chance
          },
          {
            monsterId: 11, // Algebrex (fire type)
            levelRange: { min: 10, max: 14 },
            chance: 0.5, // 50% chance
          },
        ],
      },
    ],
    isLocked: true,
  },
  {
    id: 3,
    name: "Water School",
    type: "water",
    trainers: [
      {
        id: 7,
        name: "Novice Brook",
        type: "water",
        monsters: [createMonster(2, 8)],
        problems: async () => await getTrainerProblems(18, 21),
        isLeader: false,
        schoolId: 3,
        image: require("../assets/trainers/water-trainer-1.png"),
        hasRandomEncounterBefore: false,
      },
      {
        id: 8,
        name: "Apprentice River",
        type: "water",
        monsters: [createMonster(2, 10), createMonster(2, 11)],
        // problems: PROBLEMS.math.slice(12, 15),
        problems: async () => await getTrainerProblems(21, 24),
        isLeader: false,
        schoolId: 3,
        image: require("../assets/trainers/water-trainer-2.png"),
        hasRandomEncounterBefore: true,
        randomEncounterPool: [
          {
            monsterId: 2, // Literabug (water type)
            levelRange: { min: 7, max: 12 },
            chance: 0.7, // 70% chance
          },
          {
            monsterId: 21, // Prosavant (water type)
            levelRange: { min: 12, max: 16 },
            chance: 0.3, // 30% chance
          },
        ],
      },
      {
        id: 9,
        name: "Master Tidal",
        type: "water",
        monsters: [createMonster(2, 12), createMonster(21, 14), createMonster(2, 13)],
        // problems: PROBLEMS.math.slice(15, 18),
        problems: async () => await getTrainerProblems(24, 27),
        isLeader: true,
        schoolId: 3,
        image: require("../assets/trainers/water-leader.png"),
        hasRandomEncounterBefore: true,
        randomEncounterPool: [
          {
            monsterId: 2, // Literabug (water type)
            levelRange: { min: 10, max: 15 },
            chance: 0.5, // 50% chance
          },
          {
            monsterId: 21, // Prosavant (water type)
            levelRange: { min: 14, max: 18 },
            chance: 0.5, // 50% chance
          },
        ],
      },
    ],
    isLocked: true,
  },
  {
    id: 4,
    name: "Headmaster's Office",
    type: "fire",
    trainers: [
      {
        id: 10,
        name: "Headmaster Mathias",
        type: "fire",
        monsters: [createMonster(3, 14)],
        problems: async () => await getTrainerProblems(27, 30),
        isLeader: true,
        schoolId: 4,
        image: require("../assets/trainers/headmaster.png"),
        hasRandomEncounterBefore: false,
      },
    ],
    isLocked: true,
  }
]


// Function to get a random encounter from a trainer's encounter pool
export function getRandomEncounterForTrainer(schoolId, trainerId) {
  const school = SCHOOLS.find((s) => s.id === schoolId)
  if (!school) return null

  const trainer = school.trainers.find((t) => t.id === trainerId)
  if (
    !trainer ||
    !trainer.hasRandomEncounterBefore ||
    !trainer.randomEncounterPool ||
    trainer.randomEncounterPool.length === 0
  ) {
    return null
  }

  // Determine which monster to encounter based on chance
  const randomValue = Math.random()
  let cumulativeChance = 0

  for (const monster of trainer.randomEncounterPool) {
    cumulativeChance += monster.chance
    if (randomValue <= cumulativeChance) {
      // Found our encounter, now create the monster with a random level in the range
      const level = Math.floor(
        Math.random() * (monster.levelRange.max - monster.levelRange.min + 1) + monster.levelRange.min,
      )
      return createMonster(monster.monsterId, level)
    }
  }

  // Fallback to the first monster if something went wrong with probabilities
  const fallbackMonster = trainer.randomEncounterPool[0]
  const level = Math.floor(
    Math.random() * (fallbackMonster.levelRange.max - fallbackMonster.levelRange.min + 1) +
      fallbackMonster.levelRange.min,
  )
  return createMonster(fallbackMonster.monsterId, level)
}

