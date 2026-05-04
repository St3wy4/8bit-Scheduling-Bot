const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../matches.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confirm')
    .setDescription('Confirm a scheduled match'),

  async execute(interaction) {

    const memberRoles = interaction.member.roles.cache.map(r => r.name);

    const matchIndex = global.pendingMatches.findIndex(m =>
      memberRoles.includes(m.teamB)
    );

    if (matchIndex === -1) {
      return interaction.reply({
        content: "❌ No match to confirm.",
        ephemeral: true
      });
    }

    const match = global.pendingMatches.splice(matchIndex, 1)[0];

    global.confirmedMatches.push(match);

    // SAVE TO FILE
    fs.writeFileSync(DATA_FILE, JSON.stringify(global.confirmedMatches, null, 2));

    await interaction.reply({
      content: `✅ Match confirmed: ${match.teamA} vs ${match.teamB} — ${match.time}`
    });
  }
};