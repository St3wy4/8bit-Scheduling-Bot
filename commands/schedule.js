const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Schedule a match'),

  async execute(interaction) {

    const leagueMenu = new StringSelectMenuBuilder()
      .setCustomId('select_league')
      .setPlaceholder('Select your league')
      .addOptions([
        { label: 'Pixel', value: 'Pixel' },
        { label: 'Prism', value: 'Prism' }
      ]);

    await interaction.reply({
      content: "Select your league:",
      components: [new ActionRowBuilder().addComponents(leagueMenu)],
      ephemeral: true
    });
  }
};