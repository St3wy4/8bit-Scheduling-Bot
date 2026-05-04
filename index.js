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

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'matches.json');

let confirmedMatches = [];
if (fs.existsSync(DATA_FILE)) {
confirmedMatches = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const pendingMatches = [];

global.pendingMatches = pendingMatches;
global.confirmedMatches = confirmedMatches;

// 🔥 TIME PARSER
function parseTime(input) {
const match = input.match(/(\w+)\s(\d{1,2})(?::(\d{2}))?\s?(AM|PM)/i);
if (!match) return null;

let [, day, hour, minute = "00", period] = match;

hour = parseInt(hour);
minute = parseInt(minute);

if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

return hour * 60 + minute;
}

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
const command = require(`./commands/${file}`);
client.commands.set(command.data.name, command);
}

client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {

// SLASH COMMANDS
if (interaction.isChatInputCommand()) {
const command = client.commands.get(interaction.commandName);
if (!command) return;
await command.execute(interaction);
}

// SELECT LEAGUE
if (interaction.isStringSelectMenu() && interaction.customId === 'select_league') {

const league = interaction.values[0];

const TEAMS = {
Pixel: [
"Bedford Bulldogs","Boston Peregrine Falcons","Buffalo Lake Effect",
"Daytona Coastline Control","Denver Apex","Incheon Illusion",
"Kc Foxtrotters","Louden Lynx","Madison Monarchs","Vancouver Void"
],
Prism: [
"Arcadia Mages","Calgary Chugs","Chicago Inferno",
"Hanoi Hydras","Havana Highflyers","Lincoln Sentinels",
"Miami Nocturnal Hurricanes","New York Nightmare",
"Santa Carla Freakz","Steinhatchee Scallops"
]
};

const options = TEAMS[league].map(team => ({
label: team,
value: `${league}|${team}`
}));

const menu = new StringSelectMenuBuilder()
.setCustomId('select_opponent')
.setPlaceholder('Select opponent')
.addOptions(options);

await interaction.update({
content: `League: **${league}**\nSelect opponent:`,
components: [new ActionRowBuilder().addComponents(menu)]
});
}

// SELECT OPPONENT
if (interaction.isStringSelectMenu() && interaction.customId === 'select_opponent') {

const [league, opponent] = interaction.values[0].split('|');

const modal = new ModalBuilder()
.setCustomId(`schedule_modal_${league}|${opponent}`)
.setTitle('Enter Match Time');

const input = new TextInputBuilder()
.setCustomId('time_input')
.setLabel('Match Time (ex: Tuesday 8PM EST)')
.setStyle(TextInputStyle.Short);

modal.addComponents(new ActionRowBuilder().addComponents(input));

await interaction.showModal(modal);
}

// MODAL SUBMIT
if (interaction.isModalSubmit()) {

const [league, opponent] = interaction.customId.replace('schedule_modal_', '').split('|');
const time = interaction.fields.getTextInputValue('time_input');

const newTime = parseTime(time);

if (!newTime) {
return interaction.reply({
content: "❌ Invalid time format. Use like: Tuesday 8PM",
ephemeral: true
});
}

// 🔥 1-HOUR CHECK
for (const match of global.confirmedMatches) {
const existingTime = parseTime(match.time);
if (existingTime !== null) {
const diff = Math.abs(existingTime - newTime);
if (diff < 60) {
return interaction.reply({
content: "❌ Another match is within 1 hour.",
ephemeral: true
});
}
}
}

const teamRole = interaction.member.roles.cache.find(r => r.name !== "@everyone");
const teamA = teamRole ? teamRole.name : "Unknown Team";

pendingMatches.push({ teamA, teamB: opponent, time });

await interaction.reply({
content: `✅ Match request sent`,
ephemeral: true
});

const role = interaction.guild.roles.cache.find(r => r.name === opponent);

if (role) {
interaction.channel.send({
content: `${role} **${teamA} vs ${opponent} — ${time}**\nUse /confirm`
});
}
}

});

client.login(process.env.TOKEN);