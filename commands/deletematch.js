const {
SlashCommandBuilder,
PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../matches.json');

module.exports = {
data: new SlashCommandBuilder()
.setName('deletematch')
.setDescription('Delete a scheduled match')

.addIntegerOption(option =>
option
.setName('match')
.setDescription('Match number from /viewtimes')
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

const matchIndex = matchNumber - 1;

if (!global.confirmedMatches[matchIndex]) {
return interaction.reply({
content: "❌ Invalid match number.",
ephemeral: true
});
}

// 🗑️ REMOVE MATCH
const deletedMatch = global.confirmedMatches.splice(matchIndex, 1)[0];

// 💾 SAVE FILE
fs.writeFileSync(
DATA_FILE,
JSON.stringify(global.confirmedMatches, null, 2)
);

await interaction.reply({
content: `✅ Deleted match: ${deletedMatch.teamA} vs ${deletedMatch.teamB}`
});
}
};