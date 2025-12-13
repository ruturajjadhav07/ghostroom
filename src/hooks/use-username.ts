import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const ANIMALS = [
  "wolf",
  "elephant",
  "lion",
  "leopard",
  "rabbit",
  "mongoose",
  "panda",
  "dino",
  "seahorse",
  "starfish",
];

const STORAGE_KEY = "chat_username";

const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]; // accessing animals name
  return `Anonymous-${word}-${nanoid(5)}`;
};

export const useUsername = () => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        setUsername(stored);
        return;
      }

      // if user connected for first time
      const generatedUser = generateUsername();

      // save username
      localStorage.setItem(STORAGE_KEY, generatedUser);
      setUsername(generateUsername);
    };
    main();
  }, []);

  return { username };
};
