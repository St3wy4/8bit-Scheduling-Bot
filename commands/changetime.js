const {
SlashCommandBuilder,
PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../matches.json');

module.exports = {
data: new SlashCommandBuilder()
.setName('changetime')
.setDescription('Change a scheduled match time')

.addIntegerOption(option =>
option
.setName('match')
.setDescription('Match number from /viewtimes')
.setRequired(true)
)

.addStringOption(option =>
option
.setName('time')
.setDescription('New time (ex: Thursday 9PM)')
.setRequired(true)
),

async execute(interaction) {

// 🔒 ADMIN ONLY
if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
return interaction.reply({
content: "❌ Admin only.",
ephemeral: true
});
}

const matchNumber = interaction.options.getInteger('match');
const newTime = interaction.options.getString('time');

const matchIndex = matchNumber - 1;

if (!global.confirmedMatches[matchIndex]) {
return interaction.reply({
content: "❌ Invalid match number.",
ephemeral: true
});
}

global.confirmedMatches[matchIndex].time = newTime;

// 💾 SAVE FILE
fs.writeFileSync(
DATA_FILE,
JSON.stringify(global.confirmedMatches, null, 2)
);

await interaction.reply({
content: `✅ Match time changed to ${newTime}`
});
}
};