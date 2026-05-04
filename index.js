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

const cron = require('node-cron'); // ✅ reset system

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

// 🧠 TEAMS
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

// ⏱️ DAY + TIME PARSER
function parseDateTime(input) {
const match = input.match(/(\w+)\s(\d{1,2})(?::(\d{2}))?\s?(AM|PM)/i);
if (!match) return null;

let [, day, hour, minute = "00", period] = match;

const days = {
sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
thursday: 4, friday: 5, saturday: 6
};

const dayIndex = days[day.toLowerCase()];
if (dayIndex === undefined) return null;

hour = parseInt(hour);
minute = parseInt(minute);

if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

return dayIndex * 1440 + (hour * 60 + minute);
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

const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
const command = require(`./commands/${file}`);
client.commands.set(command.data.name, command);
}

client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
});

// 🔁 INTERACTIONS
client.on('interactionCreate', async interaction => {

// slash
if (interaction.isChatInputCommand()) {
const cmd = client.commands.get(interaction.commandName);
if (!cmd) return;
return cmd.execute(interaction);
}

// SELECT LEAGUE
if (interaction.isStringSelectMenu() && interaction.customId === 'select_league') {
const league = interaction.values[0];

const menu = new StringSelectMenuBuilder()
.setCustomId('select_team')
.setPlaceholder('Select YOUR team')
.addOptions(
TEAMS[league].map(team => ({
label: team,
value: `${league}|${team}`
}))
);

return interaction.update({
content: `League: **${league}**\nSelect YOUR team:`,
components: [new ActionRowBuilder().addComponents(menu)]
});
}

// SELECT YOUR TEAM
if (interaction.isStringSelectMenu() && interaction.customId === 'select_team') {
const [league, team] = interaction.values[0].split('|');

const menu = new StringSelectMenuBuilder()
.setCustomId('select_opponent')
.setPlaceholder('Select opponent')
.addOptions(
TEAMS[league]
.filter(t => t !== team)
.map(t => ({
label: t,
value: `${league}|${team}|${t}`
}))
);

return interaction.update({
content: `Your Team: **${team}**\nSelect opponent:`,
components: [new ActionRowBuilder().addComponents(menu)]
});
}

// SELECT OPPONENT
if (interaction.isStringSelectMenu() && interaction.customId === 'select_opponent') {
const [league, teamA, opponent] = interaction.values[0].split('|');

const modal = new ModalBuilder()
.setCustomId(`schedule_modal_${league}|${teamA}|${opponent}`)
.setTitle('Enter Match Time');

const input = new TextInputBuilder()
.setCustomId('time_input')
.setLabel('Match Time (ex: Tuesday 8PM)')
.setStyle(TextInputStyle.Short);

modal.addComponents(new ActionRowBuilder().addComponents(input));

return interaction.showModal(modal);
}

// MODAL SUBMIT
if (interaction.isModalSubmit()) {
const [league, teamA, opponent] =
interaction.customId.replace('schedule_modal_', '').split('|');

const time = interaction.fields.getTextInputValue('time_input');
const newTime = parseDateTime(time);

if (!newTime) {
return interaction.reply({
content: "❌ Use format: Tuesday 8PM",
ephemeral: true
});
}

// 🚫 1-hour rule WITH DAY
for (const m of global.confirmedMatches) {
const existing = parseDateTime(m.time);
if (existing !== null && Math.abs(existing - newTime) < 60) {
return interaction.reply({
content: "❌ Match within 1 hour already exists.",
ephemeral: true
});
}
}

pendingMatches.push({ teamA, teamB: opponent, time });

await interaction.reply({
content: "✅ Match request sent",
ephemeral: true
});

const role = interaction.guild.roles.cache.find(r => r.name === opponent);

if (role) {
interaction.channel.send(
`${role} **${teamA} vs ${opponent} — ${time}**\nUse /confirm`
);
}
}
});


// 🔁 🔥 SUNDAY RESET (6AM EST, SILENT)
cron.schedule('0 6 * * 0', () => {

console.log("🔄 Weekly reset ran");

global.confirmedMatches.length = 0;

fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));

}, {
timezone: "America/New_York"
});

client.login(process.env.TOKEN);