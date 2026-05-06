const {
SlashCommandBuilder
} = require('discord.js');

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

const match = input.match(/(\w+)\s(\d+)(?::(\d+))?(AM|PM)/i);

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

module.exports = {

data: new SlashCommandBuilder()

.setName('schedule')
.setDescription('Schedule a match')

.addStringOption(option =>
option
.setName('league')
.setDescription('Select league')
.setRequired(true)
.addChoices(
{ name: 'Pixel', value: 'Pixel' },
{ name: 'Prism', value: 'Prism' }
)
)

.addStringOption(option =>
option
.setName('team')
.setDescription('Your team')
.setRequired(true)
)

.addStringOption(option =>
option
.setName('opponent')
.setDescription('Opponent team')
.setRequired(true)
)

.addStringOption(option =>
option
.setName('time')
.setDescription('Example: Friday 8:15PM')
.setRequired(true)
),

async execute(interaction) {

const league = interaction.options.getString('league');
const teamA = interaction.options.getString('team');
const opponent = interaction.options.getString('opponent');
const selectedTime = interaction.options.getString('time');

// 🚫 SAME TEAM
if (teamA === opponent) {
return interaction.reply({
content: "❌ You can't play yourself.",
ephemeral: true
});
}

// 🚫 INVALID TEAM
if (!TEAMS[league].includes(teamA)) {
return interaction.reply({
content: "❌ Invalid team for that league.",
ephemeral: true
});
}

if (!TEAMS[league].includes(opponent)) {
return interaction.reply({
content: "❌ Invalid opponent for that league.",
ephemeral: true
});
}

// 🕒 PARSE NEW MATCH
const newMatch = parseMatchTime(selectedTime);

if (!newMatch) {
return interaction.reply({
content: "❌ Invalid time format. Example: Friday 8:15PM",
ephemeral: true
});
}

// 🚫 CHECK CONFLICTS
const conflict = global.confirmedMatches.find(existing => {

const existingMatch = parseMatchTime(existing.time);

if (!existingMatch) return false;

// ONLY compare SAME DAY
if (existingMatch.day !== newMatch.day) return false;

const difference = Math.abs(
existingMatch.totalMinutes - newMatch.totalMinutes
);

// must be at least 60 mins apart
return difference < 60;
});

if (conflict) {
return interaction.reply({
content: "❌ Another match is within 1 hour on that day.",
ephemeral: true
});
}

// ✅ SAVE PENDING MATCH
global.pendingMatches.push({
teamA,
teamB: opponent,
time: selectedTime
});

// 🔔 PING ROLE
const role = interaction.guild.roles.cache.find(
r => r.name === opponent
);

if (role) {
await interaction.channel.send({
content:
`${role} Match request:\n🏆 ${teamA} vs ${opponent}\n🕒 ${selectedTime}\nUse /confirm`
});
}

await interaction.reply({
content: `✅ Match request sent:\n🏆 ${teamA} vs ${opponent}\n🕒 ${selectedTime}`,
ephemeral: true
});
}
};