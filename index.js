require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

let spaceMiner = {
    totalMined: 0,
    leaderboard: {}
};

//command for astriod thingy
app.command("/cosmic-mine", async ({ ack }) => {
    try {
        await act({
            response_type: "in_channel",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "🚨 *A Giant Asteroid has appeared in orbit!* 🌌\nClick the button below to mine it for Stardust! Who will gather the most?"
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Mine the Asteroid! ⛏️",
                                emoji: true
                            },
                            value: "mine_asteroid_click",
                            action_id: "mine_asteroid"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Error spawning miner:", error);
        await act("❌ Failed to spawn the asteroid.");
    }
});

//Looks for button clicks
app.action("mine_asteroid", async ({ ack, body, respond }) => {
    try{
        await ack();
        const userId = body.user.id;
        const userMention = `<@${userId}>`;
        const minedAmount = Math.floor(Math.random() * 21 ) + 5;
        spaceMiner.totalMined += minedAmount;
        spaceMiner.leaderboard[userMention] = (spaceMiner.leaderboard[userMention] || 0) + minedAmount;
        let scoreboardText = "";
        const sortedPlayers = Object.entries(spaceMiner.leaderboard)
            .sort((a,b) => b[1] - a[1]);
        for (const [player, score] of sortedPlayers) {
            scoreboardText += `${player}: ${score} mg* Stardust\n`;
        }
        await respond({
            replace_original: true, 
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `✨ ${userMention} just mined the asteroid and found *${minedAmount}mg* of Stardust! ⛏️\n\n🪐 *Total Channel Ore Extracted:* \`${spaceMiner.totalMined}mg\``
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🏆 *Space Miner Leaderboard:*\n${scoreboardText}`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "⛏️ KEEP MINING!",
                                emoji: true
                            },
                            value: "mine_asteroid_click",
                            action_id: "mine_asteroid"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
});

// Memory for trivia game
let triviaGame = {
    isActive: false,
    currentQuestionIndex: 0,
    scores: {}
};

// Trivia questions
const triviaQuestions = [
    {
        question: "What is the closest planet to the Sun?",
        answer: "mercury"
    },
    {
        question: "Which galaxy is home to our Solar System?",
        answer: "milky way"
    },
    {
        question: "What is the largest planet in our solar system?",
        answer: "jupiter"
    }
];

// Trivia command
app.command("/cosmic-trivia", async ({ ack }) => {
    try {
        if (triviaGame.isActive) {
            await ack({
                response_type: "in_channel",
                text: "🚀 A trivia game is already running! Answer the current question."
            });
            return;
        }

        // Initialize game memory
        triviaGame.isActive = true;
        triviaGame.currentQuestionIndex = 0;
        triviaGame.scores = {};

        const firstQuestion = triviaQuestions[0].question;

        await ack({
            response_type: "in_channel",
            text: `🚀 *Cosmic Trivia Started!* First person to type the correct answer in chat gets the point.\n\n❓ *Question 1:* ${firstQuestion}`
        });

    } catch (error) {
        console.error("Error running trivia command:", error);
        await ack("❌ Something went wrong starting the game.");
    }
});

// Listen for answers
app.message(async ({ message, say }) => {
    try {
        if (!triviaGame.isActive || message.bot_id) return;
        
        if (!message.text) return;
        
        let currentQuestion = triviaQuestions[triviaGame.currentQuestionIndex];
        let userAnswer = message.text.trim().toLowerCase();
        
        if (userAnswer === currentQuestion.answer) {
            let winner = `<@${message.user}>`;
            triviaGame.scores[winner] = (triviaGame.scores[winner] || 0) + 1;
            
            triviaGame.currentQuestionIndex++;
            
            if (triviaGame.currentQuestionIndex < triviaQuestions.length) {
                let nextQ = triviaQuestions[triviaGame.currentQuestionIndex];
                
                await say(`🎉 *Correct!* ${winner} got it! The answer was *${currentQuestion.answer}*.\n\n❓ *Next Question:* ${nextQ.question}`);
            } else {
                triviaGame.isActive = false;
                let scoreboard = "";
                for (let player in triviaGame.scores) {
                    scoreboard += `${player}: ${triviaGame.scores[player]} points\n`;
                }
                if (scoreboard === "") scoreboard = "No one scored points!";
                
                await say(`🎉 *Correct!* ${winner} got it! The answer was *${currentQuestion.answer}*.\n\n🏆 *Game Over!* Here's the final scoreboard:\n${scoreboard}`);
            }
        }
    } catch (error) {
        console.error("Error processing chat message event safely:", error);
    }
});

// Reset command
app.command("/cosmic-reset", async ({ ack }) => {
    try {
        triviaGame.isActive = false;
        triviaGame.currentQuestionIndex = 0;
        triviaGame.scores = {};
        
        await ack({
            response_type: "in_channel",
            text: "🌌 *Cosmic Trivia has been force-reset!* You can now start a fresh game with `/cosmic-trivia`."
        });
    } catch (error) {
        console.error("Error resetting game:", error);
        await ack("❌ Something went wrong resetting the game.");
    }
});

// Help command
app.command("/cosmic-help", async ({ ack }) => {
    await ack({
        text: `🚀 *CosmicBot Available Commands:*\n• \`/cosmic-ping\` - Check bot latency\n• \`/cosmic-catfact\` - Get a live cat fact\n• \`/cosmic-joke\` - Get a random joke\n• \`/cosmic-trivia\` - Play a trivia game`
    });
});

// Ping command
app.command("/cosmic-ping", async ({ ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `*Pong!* Latency: \`${latency}ms\`` });
});

// Cat fact command
app.command("/cosmic-catfact", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://catfact.ninja/fact");
        await respond({ text: `🐱 *Cat Fact:*\n> ${response.data.fact}` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a cat fact. Please try again later." });
    }
});

// Joke command
app.command("/cosmic-joke", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
        await respond({ text: `🎭 *Joke:*\n_${response.data.setup}_\n\n*${response.data.punchline}*` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a joke. Please try again later." });
    }
});

(async () => {
  await app.start();
  console.log("Cosmic bot is running!");
})();