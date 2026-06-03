require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

//help command
app.command("/cosmic-help", async ({ ack, respond }) => {
    await ack();
    await respond({
        text:`🚀 *CosmicBot Available Commands:*\n•\'/cosmic-ping\' - Check bot latency\n•\'/cosmic-catfact\' - Get a live cat fact\n• \'/cosmic-joke - Get a random joke`
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

