import React, { createContext, useState, useContext } from "react";
import { resetGameState } from "./gameState";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleResetGame = async (navigation) => {
    try {
      setIsLoading(true); // Show loading indicator
      await resetGameState(); // Reset the game state
      navigation.replace("StarterSelection"); // Navigate to starter selection
    } catch (error) {
      console.error("Error resetting game:", error);
      alert("Failed to reset the game. Please try again.");
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, handleResetGame }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};