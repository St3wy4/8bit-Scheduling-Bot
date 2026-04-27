const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1498417294705950882";
const GUILD_ID = "1365933513337208922";

let matches = [];
const RESET_HOUR = 9; // 9 AM EST

// 🧠 Safe time parser
function parseTime(timeStr) {
if (!timeStr.includes(" ")) return null;

let [time, modifier] = timeStr.split(' ');
if (!modifier) return null;

let [hours, minutes] = time.split(':');
if (!minutes) return null;

modifier = modifier.toLowerCase();

if (modifier !== 'am' && modifier !== 'pm') return null;

hours = parseInt(hours);
minutes = parseInt(minutes);

if (isNaN(hours) || isNaN(minutes)) return null;

if (modifier === 'pm' && hours !== 12) hours += 12;
if (modifier === 'am' && hours === 12) hours = 0;

return hours * 60 + minutes;
}

// ⛔ spacing check
function isTooClose(newTime) {
return matches.some(match => Math.abs(match.time - newTime) < 60);
}

// 🧹 weekly reset
function startWeeklyReset() {
setInterval(() => {
const now = new Date();
const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

const day = est.getDay();
const hour = est.getHours();
const minute = est.getMinutes();

if (day === 0 && hour === RESET_HOUR && minute === 0) {
matches = [];
console.log("🧹 Weekly schedule reset!");
}
}, 60000);
}

// 📜 commands
const commands = [
new SlashCommandBuilder()
.setName('setmatchup')
.setDescription('Schedule a match')
.addStringOption(o => o.setName('day').setDescription('Day (ex: Sunday)').setRequired(true))
.addStringOption(o => o.setName('time').setDescription('Ex: 8:00 PM').setRequired(true))
.addUserOption(o => o.setName('opponent').setDescription('Opponent manager').setRequired(true)),

new SlashCommandBuilder()
.setName('confirm')
.setDescription('Confirm a match'),

new SlashCommandBuilder()
.setName('viewtimes')
.setDescription('View all scheduled matches')
];

// 📡 register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("Commands registered");
})();

// ✅ ready
client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
startWeeklyReset();
});

// 🎮 command handler
client.on('interactionCreate', async interaction => {
if (!interaction.isChatInputCommand()) return;

// /setmatchup
if (interaction.commandName === 'setmatchup') {
await interaction.deferReply();

const day = interaction.options.getString('day');
const timeStr = interaction.options.getString('time');
const opponent = interaction.options.getUser('opponent');

const parsedTime = parseTime(timeStr);

if (parsedTime === null) {
return interaction.editReply("❌ Use time like: 8:00 PM");
}

if (isTooClose(parsedTime)) {
return interaction.editReply("❌ Matches must be at least 1 hour apart.");
}

matches.push({
day,
time: parsedTime,
timeStr,
opponentId: opponent.id,
creatorId: interaction.user.id,
confirmed: false
});

await interaction.editReply(
`📢 ${opponent}, match scheduled!\n📅 ${day}\n🕒 ${timeStr} EST\nUse /confirm to approve.`
);
}

// /confirm
if (interaction.commandName === 'confirm') {
const match = matches.find(m =>
m.opponentId === interaction.user.id && !m.confirmed
);

if (!match) {
return interaction.reply("❌ No pending matches for you.");
}

match.confirmed = true;

await interaction.reply(
`✅ Match confirmed!\n📅 ${match.day}\n🕒 ${match.timeStr} EST`
);
}

// /viewtimes
if (interaction.commandName === 'viewtimes') {
if (matches.length === 0) {
return interaction.reply("No matches scheduled.");
}

const list = matches
.map(m => {
return `📅 ${m.day} - 🕒 ${m.timeStr} EST → <@${m.creatorId}> vs <@${m.opponentId}>`;
})
.join('\n');

await interaction.reply(`📜 Schedule:\n${list}`);
}
});

client.login(TOKEN);