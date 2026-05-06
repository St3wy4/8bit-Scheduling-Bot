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

global.pendingMatches = [];
global.confirmedMatches = [];

if (fs.existsSync(DATA_FILE)) {
global.confirmedMatches = JSON.parse(
fs.readFileSync(DATA_FILE, 'utf8')
);
}

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

const client = new Client({
intents: [
GatewayIntentBits.Guilds
]
});

client.commands = new Collection();

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

client.on('interactionCreate', async interaction => {

if (interaction.isChatInputCommand()) {

const command = client.commands.get(
interaction.commandName
);

if (!command) return;

return command.execute(interaction);
}

// LEAGUE DROPDOWN
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

return interaction.update({
content: 'Select your team:',
components: [
new ActionRowBuilder().addComponents(menu)
]
});
}

// TEAM DROPDOWN
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

return interaction.update({
content: 'Select opponent:',
components: [
new ActionRowBuilder().addComponents(menu)
]
});
}

// OPPONENT DROPDOWN
if (
interaction.isStringSelectMenu() &&
interaction.customId === 'select_opponent'
) {

const [league, teamA, opponent] =
interaction.values[0].split('|');

const modal = new ModalBuilder()
.setCustomId(
`schedule_modal_${teamA}|${opponent}`
)
.setTitle('Enter Match Time');

const input = new TextInputBuilder()
.setCustomId('time_input')
.setLabel('Example: Friday 8:15PM')
.setStyle(TextInputStyle.Short);

modal.addComponents(
new ActionRowBuilder().addComponents(input)
);

return interaction.showModal(modal);
}

// TIME MODAL
if (
interaction.isModalSubmit() &&
interaction.customId.startsWith('schedule_modal_')
) {

const [teamA, opponent] =
interaction.customId
.replace('schedule_modal_', '')
.split('|');

const time =
interaction.fields.getTextInputValue(
'time_input'
);

const newMatch = parseMatchTime(time);

if (!newMatch) {
return interaction.reply({
content:
'❌ Invalid format. Example: Friday 8:15PM',
ephemeral: true
});
}

const conflict =
global.confirmedMatches.find(existing => {

const existingMatch =
parseMatchTime(existing.time);

if (!existingMatch) return false;

if (
existingMatch.day !== newMatch.day
) {
return false;
}

const difference = Math.abs(
existingMatch.totalMinutes -
newMatch.totalMinutes
);

return difference < 60;
});

if (conflict) {
return interaction.reply({
content:
'❌ Another match is within 1 hour on that day.',
ephemeral: true
});
}

global.pendingMatches.push({
teamA,
teamB: opponent,
time
});

const role =
interaction.guild.roles.cache.find(
r => r.name === opponent
);

if (role) {
interaction.channel.send({
content:
`${role} Match request:\n🏆 ${teamA} vs ${opponent}\n🕒 ${time}\nUse /confirm`
});
}

return interaction.reply({
content:
`✅ Match request sent:\n🏆 ${teamA} vs ${opponent}\n🕒 ${time}`,
ephemeral: true
});
}
});

// SUNDAY RESET
cron.schedule('0 6 * * 0', () => {

global.confirmedMatches = [];

fs.writeFileSync(
DATA_FILE,
JSON.stringify([], null, 2)
);

console.log('Weekly reset complete');

}, {
timezone: 'America/New_York'
});

client.login(process.env.TOKEN);