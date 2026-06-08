// Main setup for Cosmic Slack Bot
require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

// What Space miner doing
let spaceMiner = {
    totalMined: 0,
    leaderboard: {}
};

// Mining game command
app.command("/cosmic-mine", async ({ ack }) => {
    try {
        // Reset the progress and leaderboard for a fresh game
        spaceMiner.totalMined = 0;
        spaceMiner.leaderboard = {};

        await ack({
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
        await ack("❌ Failed to spawn the asteroid.");
    }
});

// Miner button
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

// Trivia score
let triviaGame = {
    isActive: false,
    currentQuestionIndex: 0,
    scores: {}
};

const triviaQuestions = [
    { question: "What is the closest planet to the Sun?", answer: "mercury" },
    { question: "Which galaxy is home to our Solar System?", answer: "milky way" },
    { question: "What is the largest planet in our solar system?", answer: "jupiter" }
];

// Starts trivia game
app.command("/cosmic-trivia", async ({ ack }) => {
    try {
        if (triviaGame.isActive) {
            await ack({
                response_type: "in_channel",
                text: "🚀 A trivia game is already running! Answer the current question."
            });
            return;
        }

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

// Trivia answers
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

// Reset trivia command
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
app.command("/cosmic-help", async ({ ack, command, client }) => { 
    try {
        await ack(); 

        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "🚀 *CosmicBot Available Commands:*",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🚀 *CosmicBot Available Commands:*\n\n• \`/cosmic-mine\` - Spawn a clicker mining game for stardust ⛏️\n• \`/spawn-bomb\` - Start a chaotic game of Cosmic Hot Potato 💣\n• \`/cosmic-trivia\` - Play a quick trivia game 🧠\n• \`/cosmic-ping\` - Check bot latency 📶\n• \`/cosmic-catfact\` - Get a live cat fact 🐱\n• \`/cosmic-joke\` - Get a random space joke 🛸`
                    }
                }
            ]
        });
    } catch (error) {
        console.error("Error running help command:", error);
    }
});

//ping command
app.command("/cosmic-ping", async ({ ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `*Pong!* Latency: \`${latency}ms\`` });
});

//catfact command
app.command("/cosmic-catfact", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://catfact.ninja/fact");
        await respond({ text: `🐱 *Cat Fact:*\n> ${response.data.fact}` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a cat fact. Please try again later." });
    }
});

//joke commmand
app.command("/cosmic-joke", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
        await respond({ text: `🎭 *Joke:*\n_${response.data.setup}_\n\n*${response.data.punchline}*` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a joke. Please try again later." });
    }
});


// cosmic hot potato memory
let bombGame = {
    isActive: false,
    currentHolder: null,
    timeLeft: 30,
    timerInterval: null,
    channelId: null,
    messageTs: null
};

// Spawn bomb command
app.command("/cosmic-bomb", async ({ ack, command, client }) => {
    try {
        await ack();

        if (bombGame.isActive) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: "❌ A cosmic bomb is already ticking in this channel!"
            });
            return;
        }

        bombGame.isActive = true;
        bombGame.channelId = command.channel_id;
        bombGame.currentHolder = command.user_id; 
        bombGame.timeLeft = 30;

        const result = await client.chat.postMessage({
            channel: bombGame.channelId,
            text: `🚨 A COSMIC PLASMA BOMB HAS BEEN SPAWNED! 🚨`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `💣 *TICK TOCK!* <@${bombGame.currentHolder}> is holding an unstable plasma bomb!\n⏳ *Time Remaining:* \`${bombGame.timeLeft}s\``
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "💥 PASS THE BOMB!",
                                emoji: true
                            },
                            action_id: "pass_the_bomb"
                        }
                    ]
                }
            ]
        });

        bombGame.messageTs = result.ts;

        //countdown
        bombGame.timerInterval = setInterval(async () => {
            bombGame.timeLeft -= 2;

            if (bombGame.timeLeft <= 0) {
                clearInterval(bombGame.timerInterval);
    
                bombGame.isActive = false;
                bombGame.timerInterval = null;

                await client.chat.update({
                    channel: bombGame.channelId,
                    ts: bombGame.messageTs,
                    text: "💥 BOOM!",
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `💥 *💥💥 BOOOOOOM!!!* 💥💥\nThe plasma core overloaded! <@${bombGame.currentHolder}> failed to pass the bomb in time and was vaporized into stardust! 💀`
                            }
                        }
                    ]
                });
            } else {
                try {
                    await client.chat.update({
                        channel: bombGame.channelId,
                        ts: bombGame.messageTs,
                        text: `Bomb ticking...`,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `💣 *TICK TOCK!* <@${bombGame.currentHolder}> is holding an unstable plasma bomb!\n⏳ *Time Remaining:* \`${bombGame.timeLeft}s\``
                                }
                            },
                            {
                                type: "actions",
                                elements: [
                                    {
                                        type: "button",
                                        text: {
                                            type: "plain_text",
                                            text: "💥 PASS THE BOMB!",
                                            emoji: true
                                        },
                                        action_id: "pass_the_bomb"
                                    }
                                ]
                            }
                        ]
                    });
                } catch (err) {
                    console.error("Error updating timer UI:", err);
                }
            }
        }, 2000); 

    } catch (error) {
        console.error("Error spawning bomb:", error);
    }
});

//Button for bomb
app.action("pass_the_bomb", async ({ ack, body, client }) => {
    try {
        await ack();
        const clickerId = body.user.id;
        const channelId = body.channel.id;

        if (clickerId !== bombGame.currentHolder) {
            await client.chat.postEphemeral({
                channel: channelId,
                user: clickerId,
                text: "❌ You don't have the bomb! You can't pass it!"
            });
            return;
        }
        const memberList = await client.conversations.members({
            channel: channelId
        });

        const allMembers = memberList.members;
        let onlinePlayers = [];
        for (const memberId of allMembers) {
            if (memberId === clickerId) continue; 

            try {
                const presence = await client.users.getPresence({ user: memberId });
                                if (presence.presence === "active") {
                    onlinePlayers.push(memberId);
                }
            } catch (err) {
                console.error(`Skipping presence check for ${memberId}`);
            }
        }
        if (onlinePlayers.length === 0) {
            const backupPlayers = allMembers.filter(id => id !== clickerId);
            onlinePlayers = backupPlayers.length > 0 ? backupPlayers : [clickerId];
        }
        const randomVictim = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];
        bombGame.currentHolder = randomVictim;
        await client.chat.update({
            channel: bombGame.channelId,
            ts: bombGame.messageTs,
            text: `Bomb passed!`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🏃‍♂️💨 *PASSED!* <@${clickerId}> tossed the bomb to <@${bombGame.currentHolder}>!\n⏳ *Time Remaining:* \`${bombGame.timeLeft}s\``
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "💥 PASS THE BOMB!",
                                emoji: true
                            },
                            action_id: "pass_the_bomb"
                        }
                    ]
                }
            ]
        });

    } catch (error) {
        console.error("Error passing bomb to online user:", error);
    }
});

// Starts the bot
(async () => {
  await app.start();
  console.log("Cosmic bot is running!");
})();