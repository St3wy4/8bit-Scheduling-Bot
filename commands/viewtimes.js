const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewtimes')
    .setDescription('View all confirmed match times'),

  async execute(interaction) {

    const matches = global.confirmedMatches;

    if (!matches.length) {
      return interaction.reply({
        content: "❌ No confirmed matches yet.",
        ephemeral: true
      });
    }

    const formatted = matches.map(m =>
      `🏆 ${m.teamA} vs ${m.teamB} — ${m.time}`
    ).join('\n');

    await interaction.reply({
      content: `📅 **Match Schedule:**\n\n${formatted}`
    });
  }
};