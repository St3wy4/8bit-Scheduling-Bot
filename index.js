require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

let matches = [];

// 🔹 Parse time like "8:00 PM"
function parseTime(timeStr) {
const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
if (!match) return null;

let [_, h, m, period] = match;
let hours = parseInt(h);
const minutes = parseInt(m);

if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

return { hours, minutes };
}

// 🔥 FIXED overlap check (uses FULL date + time)
function isTooClose(newDate, newTime) {
const newDateTime = new Date(newDate);
newDateTime.setHours(newTime.hours, newTime.minutes, 0, 0);

return matches.some(match => {
const matchDateTime = new Date(match.day);
matchDateTime.setHours(match.time.hours, match.time.minutes, 0, 0);

const diff = Math.abs(matchDateTime - newDateTime);
return diff < 60 * 60 * 1000; // 1 hour
});
}

// 🔹 Commands
const commands = [
new SlashCommandBuilder()
.setName('setmatchup')
.setDescription('Schedule a match')
.addStringOption(o =>
o.setName('day')
.setDescription('Date (MM/DD)')
.setRequired(true))
.addStringOption(o =>
o.setName('time')
.setDescription('Time (ex: 8:00 PM)')
.setRequired(true))
.addUserOption(o =>
o.setName('opponent')
.setDescription('Opponent')
.setRequired(true)),

new SlashCommandBuilder()
.setName('confirm')
.setDescription('Confirm a match'),

new SlashCommandBuilder()
.setName('viewtimes')
.setDescription('View scheduled matches')
];

// 🔹 Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
try {
await rest.put(
Routes.applicationCommands(CLIENT_ID),
{ body: commands }
);
console.log("Commands registered");
} catch (err) {
console.error(err);
}
})();

// 🔹 Ready
client.once('ready', () => {
matches = []; // 🔥 clears old broken data
console.log(`Logged in as ${client.user.tag}`);
});

// 🔹 Command handler
client.on('interactionCreate', async interaction => {
if (!interaction.isChatInputCommand()) return;

// /setmatchup
if (interaction.commandName === 'setmatchup') {
await interaction.deferReply();

const day = interaction.options.getString('day'); // MM/DD
const timeStr = interaction.options.getString('time');
const opponent = interaction.options.getUser('opponent');

const [month, dateNum] = day.split("/").map(Number);
const now = new Date();

const parsedDate = new Date(
now.getFullYear(),
month - 1,
dateNum
);

const parsedTime = parseTime(timeStr);

if (!parsedTime) {
return interaction.editReply("❌ Use time like: 8:00 PM");
}

if (isTooClose(parsedDate, parsedTime)) {
return interaction.editReply("❌ Matches must be at least 1 hour apart.");
}

matches.push({
day: parsedDate,
time: parsedTime,
timeStr,
opponentId: opponent.id,
creatorId: interaction.user.id,
confirmed: false
});

await interaction.editReply(
`📅 Match scheduled!\n🗓 ${parsedDate.toLocaleDateString("en-US")}\n🕒 ${timeStr} EST\nUse /confirm to approve.`
);
}

// /confirm
if (interaction.commandName === 'confirm') {
const match = matches.find(m =>
m.opponentId === interaction.user.id && !m.confirmed
);

if (!match) {
return interaction.reply("❌ No match to confirm.");
}

match.confirmed = true;

return interaction.reply("✅ Match confirmed!");
}

// /viewtimes
if (interaction.commandName === 'viewtimes') {
if (matches.length === 0) {
return interaction.reply("No matches scheduled.");
}

const formatted = matches.map(m =>
`${m.confirmed ? "✅" : "❌"} ${m.day.toLocaleDateString("en-US")} - ${m.timeStr} EST`
).join("\n");

return interaction.reply(`📅 Schedule:\n${formatted}`);
}
});

client.login(TOKEN);