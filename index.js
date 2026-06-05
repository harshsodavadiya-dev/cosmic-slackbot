require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

//memmory for triva game
let triviaGame = {
    isActive: false,
    currentQuestionIndex: 0,
    scores: {}
};
//Trivia questions
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

//trivia command
// trivia command
app.command('/cosmic-trivia', async ({ command, ack, respond }) => {
    await ack(); 

    setTimeout(async () => {
        if (triviaGame.isActive) {
            return await respond("🚀 A trivia game is already running! Answer the current question.");
        }
        
        triviaGame.isActive = true;
        triviaGame.currentQuestionIndex = 0;
        triviaGame.scores = {};
        
        await respond("🚀 *Cosmic Trivia Started!* First person to type the correct answer in chat gets the point.\n\n" +
                      `❓ *Question 1:* ${triviaQuestions[0].question}`);
    }, 50);
});

//listen for answers
app.message(async ({ message, say }) => {
    if (!triviaGame.isActive || message.bot_id) return;
    let currentQuestion = triviaQuestions[triviaGame.currentQuestionIndex];
    let userAnswer = message.text.trim().toLowerCase();
    if (userAnswer === currentQuestion.answer) {
        let winner = `<@${message.user}>`;
        triviaGame.scores[winner] = (triviaGame.scores[winner] || 0) + 1;
        await say(`🎉 *Correct!* ${winner}! The answer was *${currentQuestion.answer}*.`);        triviaGame.currentQuestionIndex++;
        if (triviaGame.currentQuestionIndex < triviaQuestions.length) {
            let nextQ = triviaQuestions[triviaGame.currentQuestionIndex];
            await say(`*Next Question:* ${nextQ.question}`);
        } else {
            triviaGame.isActive = false;
            let scoreboard = "";
            for (let player in triviaGame.scores) {
                scoreboard += `${player}: ${triviaGame.scores[player]} points\n`;
            }
            await say(`🏆 *Game Over!* Here's the final scoreboard:\n${scoreboard}`);
        }
    }
});
//help command
app.command("/cosmic-help", async ({ ack, respond }) => {
    await ack();
    await respond({
        text:`🚀 *CosmicBot Available Commands:*\n•\'/cosmic-ping\' - Check bot latency\n•\'/cosmic-catfact\' - Get a live cat fact\n• \'/cosmic-joke - Get a random joke\n• \'/cosmic-trivia - Play a trivia game`
    });
});

//ping command
app.command("/cosmic-ping", async ({ ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `*Pong!* Latency: \`${latency}ms\`` });
});

//cat fact command
app.command("/cosmic-catfact", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://catfact.ninja/fact");
        await respond({ text: `🐱 *Cat Fact:*\n> ${response.data.fact}` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a cat fact. Please try again later." });
    }
});

//joke command
app.command("/cosmic-joke", async ({ack, respond}) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
        await respond({ text: `🎭 *Joke:*\n_${response.data.setup}_\n\n *${response.data.punchline}*` });
    } catch (err) {
        await respond({ text: "❌ Failed to fetch a joke. Please try again later." });
    }
});

(async () => {
  await app.start();
  console.log("Cosmic bot is running!");
})();

