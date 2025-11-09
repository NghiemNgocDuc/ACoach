const fs = require("fs");
const path = require("path");

/**
 * Reads the OpenAI API key from the openai-key.txt file
 * @returns {string} 
 */
function getOpenAIak() {
  try {
    const keyFilePath = path.join(__dirname, "../../openai-key.txt");
    const ak = fs.readFileSync(keyFilePath, "utf8").trim();

    if (!ak || !ak.startsWith("sk-")) {
      throw new Error("Invalid OpenAI API key format");
    }

    return ak;
  } catch (error) {
    console.error("Error reading OpenAI API key:", error.message);
    throw new Error("Failed to load OpenAI API key from openai-key.txt file");
  }
}

module.exports = {
  getOpenAIak,
};
