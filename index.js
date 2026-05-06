require('dotenv').config();

const {
Client,
GatewayIntentBits,
Collection,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
ActionRowBuilder,
StringSelectMenuBuilder
} = require('discord.js');

const cron = require('node-cron');

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'matches.json');

let confirmedMatches = [];

if (fs.existsSync(DATA_FILE)) {
confirmedMatches = JSON.parse(
fs.readFileSync(DATA_FILE, 'utf8')
);
}

const pendingMatches = [];

global.pendingMatches = pendingMatches;
global.confirmedMatches = confirmedMatches;

// 🧠 TEAMS
const TEAMS = {
Pixel: [
"Bedford Bulldogs",
"Boston Peregrine Falcons",
"Buffalo Lake Effect",
"Daytona Coastline Control",
"Denver Apex",
"Incheon Illusion",
"Kc Foxtrotters",
"Louden Lynx",
"Madison Monarchs",
"Vancouver Void"
],

Prism: [
"Arcadia Mages",
"Calgary Chugs",
"Chicago Inferno",
"Hanoi Hydras",
"Havana Highflyers",
"Lincoln Sentinels",
"Miami Nocturnal Hurricanes",
"New York Nightmare",
"Santa Carla Freakz",
"Steinhatchee Scallops"
]
};

// 🕒 TIME PARSER
function parseMatchTime(input) {

const match = input.match(
/(\w+)\s(\d+)(?::(\d+))?\s?(AM|PM)/i
);

if (!match) return null;

const day = match[1].toLowerCase();

let hour = parseInt(match[2]);
let minutes = parseInt(match[3] || "0");

const period = match[4].toUpperCase();

if (period === "PM" && hour !== 12) hour += 12;
if (period === "AM" && hour === 12) hour = 0;

return {
day,
totalMinutes: hour * 60 + minutes
};
}

// 🤖 CLIENT
const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

client.commands = new Collection();

// 📂 LOAD COMMANDS
const commandFiles = fs
.readdirSync('./commands')
.filter(file => file.endsWith('.js'));

for (const file of commandFiles) {

const command = require(`./commands/${file}`);

client.commands.set(command.data.name, command);
}

client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
});

// 🔁 INTERACTIONS
client.on('interactionCreate', async interaction => {

// SLASH COMMANDS
if (interaction.isChatInputCommand()) {

const command = client.commands.get(
interaction.commandName
);

if (!command) return;

await command.execute(interaction);
}

// SELECT LEAGUE
if (
interaction.isStringSelectMenu() &&
interaction.customId === 'select_league'
) {

const league = interaction.values[0];

const options = TEAMS[league].map(team => ({
label: team,
value: `${league}|${team}`
}));

const menu = new StringSelectMenuBuilder()
.setCustomId('select_team')
.setPlaceholder('Select YOUR team')
.addOptions(options);

await interaction.update({
content:
`League: **${league}**\nSelect YOUR team:`,
components: [
new ActionRowBuilder().addComponents(menu)
]
});
}

// SELECT TEAM
if (
interaction.isStringSelectMenu() &&
interaction.customId === 'select_team'
) {

const [league, team] =
interaction.values[0].split('|');

const options = TEAMS[league]
.filter(t => t !== team)
.map(t => ({
label: t,
value: `${league}|${team}|${t}`
}));

const menu = new StringSelectMenuBuilder()
.setCustomId('select_opponent')
.setPlaceholder('Select opponent')
.addOptions(options);

await interaction.update({
content:
`Your Team: **${team}**\nSelect opponent:`,
components: [
new ActionRowBuilder().addComponents(menu)
]
});
}

// SELECT OPPONENT
if (
interaction.isStringSelectMenu() &&
interaction.customId === 'select_opponent'
) {

const [league, teamA, opponent] =
interaction.values[0].split('|');

const modal = new ModalBuilder()
.setCustomId(
`schedule_modal_${league}|${teamA}|${opponent}`
)
.setTitle('Enter Match Time');

const input = new TextInputBuilder()
.setCustomId('time_input')
.setLabel(
'Example: Friday 8:15PM'
)
.setStyle(TextInputStyle.Short);

modal.addComponents(
new ActionRowBuilder().addComponents(input)
);

await interaction.showModal(modal);
}

// MODAL SUBMIT
if (interaction.isModalSubmit()) {

const [league, teamA, opponent] =
interaction.customId
.replace('schedule_modal_', '')
.split('|');

const time =
interaction.fields.getTextInputValue(
'time_input'
);

// 🕒 PARSE TIME
const newMatch = parseMatchTime(time);

if (!newMatch) {
return interaction.reply({
content:
"❌ Invalid format. Example: Friday 8:15PM",
ephemeral: true
});
}

// 🚫 SAME DAY CONFLICTS ONLY
const conflict =
global.confirmedMatches.find(existing => {

const existingMatch =
parseMatchTime(existing.time);

if (!existingMatch) return false;

// ONLY compare SAME DAY
if (
existingMatch.day !== newMatch.day
) {
return false;
}

const difference = Math.abs(
existingMatch.totalMinutes -
newMatch.totalMinutes
);

// MUST be at least 60 mins apart
return difference < 60;
});

if (conflict) {
return interaction.reply({
content:
"❌ Another match is within 1 hour on that day.",
ephemeral: true
});
}

// SAVE PENDING
pendingMatches.push({
teamA,
teamB: opponent,
time
});

await interaction.reply({
content: `✅ Match request sent`,
ephemeral: true
});

// PING OPPONENT
const role =
interaction.guild.roles.cache.find(
r => r.name === opponent
);

if (role) {
interaction.channel.send({
content:
`${role} **${teamA} vs ${opponent} — ${time}**\nUse /confirm`
});
}
}
});

// 🔁 SUNDAY RESET
cron.schedule('0 6 * * 0', () => {

console.log("🔄 Weekly reset ran");

global.confirmedMatches.length = 0;

fs.writeFileSync(
DATA_FILE,
JSON.stringify([], null, 2)
);

}, {
timezone: "America/New_York"
});

client.login(process.env.TOKEN);
