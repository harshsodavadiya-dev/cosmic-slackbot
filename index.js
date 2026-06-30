// Main setup for Cosmic Slack Bot
require("dotenv").config();
const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

//mining game

let miner = {total:0, board: {}};

app.command("/cosmic-mine", async ({ ack }) => {
    miner = {total: 0, board: {}};
    await ack({
        response_type: "in_channel",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*A Giant Asteroid has appeared in orbit!* Click the button below to mine it for Stardust! Who will gather the most?"
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Mine the Asteroid!", emoji: true},
                            value: "mine",
                            action_id: "mine_asteroid"
                    },
                ],
            },
        ],
    });
});

// Miner button
app.action("mine_asteroid", async ({ ack, body, respond }) => {
  await ack();
  const user = `<@${body.user.id}>`;
  const amount = Math.floor(Math.random() * 21) + 5;
  miner.total += amount;
  miner.board[user] = (miner.board[user] || 0) + amount;
 
  const scores = Object.entries(miner.board)
    .sort((a, b) => b[1] - a[1])
    .map(([p, s]) => `${p}: ${s}mg`)
    .join("\n");
 
  await respond({
    replace_original: true,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${user} mined *${amount}mg* of Stardust.\nTotal extracted: \`${miner.total}mg\``,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Leaderboard:*\n${scores}` },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Mine ⛏️", emoji: true },
            value: "mine",
            action_id: "mine_asteroid",
          },
        ],
      },
    ],
  });
});

// Trivia 
const questions = [
    { q:"What is the closest planet to the Sun?", a:"mercury"},
    { q:"Which galaxy is home to our Solar System?", a:"milky way"}, 
    { q:"What is the largest planet in our solar system?", a:"jupiter"},
];
let trivia = {active: false,index: 0, scores: {}};

app.command("/cosmic-trivia", async ({ ack }) => {
  if (trivia.active) {
    await ack({response_type:"in_channel",text:"A trivia game is already running. Answer the current question!" });
    return;
  }
trivia = { active:true, index:0, scores:{} };
  await ack({
    response_type: "in_channel",
    text:`*Cosmic Trivia* — first to type the correct answer wins the point.\n\nQ1: ${questions[0].q}`,
  });
});

//answers
app.message(async ({ message, say }) => {
  if (!trivia.active || message.bot_id || !message.text) return;
 
  const current = questions[trivia.index];
  if (message.text.trim().toLowerCase()!==current.a) return;
 
  const winner = `<@${message.user}>`;
  trivia.scores[winner]=(trivia.scores[winner] || 0) + 1;
  trivia.index++;
 
  if (trivia.index < questions.length) {
    await say(`Correct! ${winner} got it. Answer: *${current.a}*\n\nNext: ${questions[trivia.index].q}`);
  } else {
    trivia.active=false;
    const board=Object.entries(trivia.scores)
      .map(([p, s]) => `${p}: ${s} pt${s !== 1 ? "s" : ""}`)
      .join("\n") || "No one scored.";
    await say(`Correct! ${winner} got it. Answer: *${current.a}*\n\n*Game over!* Final scores:\n${board}`);
  }
});

// Reset trivia command
app.command("/cosmic-reset", async ({ ack }) => {
  trivia = {active:false,index:0,scores:{}};
  await ack({ response_type:"in_channel", text:"Trivia has been reset. Start a new game with `/cosmic-trivia`." });
});

// Help command
app.command("/cosmic-help", async ({ ack, command, client }) => {
  await ack();
  await client.chat.postEphemeral({
    channel: command.channel_id,
    user: command.user_id,
    text: "CosmicBot commands",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            "*CosmicBot Commands*",
            "`/cosmic-mine` — spawn an asteroid mining game",
            "`/cosmic-bomb` — start a game of hot potato",
            "`/cosmic-trivia` — start a space trivia round",
            "`/cosmic-poll <question>` — post a live yes/no poll",
            "`/cosmic-duel @user` — challenge someone to a word race",
            "`/cosmic-ping` — check bot latency",
            "`/cosmic-catfact` — get a random cat fact",
            "`/cosmic-joke` — get a random joke",
            "`/cosmic-reset` — reset an active trivia game",
          ].join("\n"),
        },
      },
    ],
  });
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
        await respond({ text: `*Cat Fact:*\n> ${response.data.fact}` });
    } catch (err) {
        await respond({ text: "Failed to fetch a cat fact. Please try again later." });
    }
});

//joke commmand
app.command("/cosmic-joke", async ({ ack, respond }) => {
    await ack();
    try {
        const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
        await respond({ text: `*Joke:*\n_${response.data.setup}_\n\n*${response.data.punchline}*` });
    } catch (err) {
        await respond({ text: "Failed to fetch a joke. Please try again later." });
    }
});


// cosmic hot potato memory
let bomb = { active: false, holder: null, timeLeft: 30, timer: null, channel: null, ts: null };
// Spawn bomb command
app.command("/cosmic-bomb", async ({ ack, command, client }) => {
  await ack();
 
  if (bomb.active) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "A bomb is already ticking in this channel.",
    });
    return;
  }
    bomb = { active: true, holder: command.user_id, timeLeft: 30, channel: command.channel_id, timer: null, ts: null };


  const result = await client.chat.postMessage({
    channel: bomb.channel,
    blocks: bombBlocks(bomb.holder, bomb.timeLeft),
    text: "A plasma bomb has been spawned!",
  });
 
  bomb.ts = result.ts;
 
  bomb.timer = setInterval(async () => {
    bomb.timeLeft -= 2;
 
    if (bomb.timeLeft <= 0) {
      clearInterval(bomb.timer);
      bomb.active = false;
      await client.chat.update({
        channel: bomb.channel,
        ts: bomb.ts,
        text: "BOOM!",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*BOOM!* <@${bomb.holder}> was holding the bomb when it went off. Vaporized into stardust.`,
            },
          },
        ],
      });
    } else {
      await client.chat.update({
        channel: bomb.channel,
        ts: bomb.ts,
        blocks: bombBlocks(bomb.holder, bomb.timeLeft),
        text: "Bomb ticking...",
      });
    }
  }, 2000);
});
 
function bombBlocks(holder, timeLeft) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<@${holder}> is holding an unstable plasma bomb. Time left: \`${timeLeft}s\``,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Pass the Bomb", emoji: false },
          action_id: "pass_the_bomb",
        },
      ],
    },
  ];
}
 
//Button for bomb
app.action("pass_the_bomb", async ({ ack, body, client }) => {
  await ack();
  const clicker = body.user.id;
  const channel = body.channel.id;
 
  if (clicker !== bomb.holder) {
    await client.chat.postEphemeral({ channel, user: clicker, text: "You don't have the bomb." });
    return;
  }
 
  const memberList = await client.conversations.members({ channel });
  let candidates = [];
 
  for (const id of memberList.members) {
    if (id === clicker) continue;
    try {
      const p = await client.users.getPresence({ user: id });
      if (p.presence === "active") candidates.push(id);
    } catch (_) {}
  }
 
  if (candidates.length === 0) {
    candidates = memberList.members.filter((id) => id !== clicker);
  }
  if (candidates.length === 0) candidates = [clicker];
 
  bomb.holder = candidates[Math.floor(Math.random() * candidates.length)];
 
  await client.chat.update({
    channel: bomb.channel,
    ts: bomb.ts,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${clicker}> passed the bomb to <@${bomb.holder}>! Time left: \`${bomb.timeLeft}s\``,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Pass the Bomb", emoji: false },
            action_id: "pass_the_bomb",
          },
        ],
      },
    ],
    text: "Bomb passed!",
  });
});

//poll command
let polls={};
app.command("/cosmic-poll", async ({ ack, command, client }) => {
  await ack();
  const question = command.text.trim();
  if (!question) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "Include a question after the command. Example: `/cosmic-poll Is Pluto a planet?`",
    });
    return;
  }
  const result = await client.chat.postMessage({
    channel: command.channel_id,
    blocks: pollBlocks(question, {}, {}),
    text: question,
  });
  polls[result.ts] = { question, yes: {}, no: {}, channel: command.channel_id };
});
function pollBlocks(question, yes, no) {
  const yesCount = Object.keys(yes).length;
  const noCount = Object.keys(no).length;
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Poll:* ${question}` },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: `Yes  (${yesCount})`, emoji: false },
          action_id: "poll_yes",
        },
        {
          type: "button",
          text: { type: "plain_text", text: `No  (${noCount})`, emoji: false },
          action_id: "poll_no",
        },
      ],
    },
  ];
}
async function handlePollVote(ack, body, client, vote) {
  await ack();
  const ts = body.message.ts;
  const poll = polls[ts];
  if (!poll) return;
  const user = body.user.id;
  if (vote === "yes") {
    poll.yes[user] = true;
    delete poll.no[user];
  } else {
    poll.no[user] = true;
    delete poll.yes[user];
  }
  await client.chat.update({
    channel: poll.channel,
    ts,
    blocks: pollBlocks(poll.question,poll.yes,poll.no),
    text: poll.question,
  });
}
app.action("poll_yes", async (args) => handlePollVote(args.ack, args.body, args.client, "yes"));
app.action("poll_no", async (args) => handlePollVote(args.ack, args.body, args.client, "no"));
// Starts the bot
(async () => {
  await app.start();
  console.log("Cosmic bot is running!");
})();