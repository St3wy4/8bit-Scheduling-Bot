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

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_league')
      .setPlaceholder('Select league')
      .addOptions([
        {
          label: 'Pixel',
          value: 'Pixel'
        },
        {
          label: 'Prism',
          value: 'Prism'
        }
      ]);

    const row = new ActionRowBuilder()
      .addComponents(menu);

    await interaction.reply({
      content: 'Select a league:',
      components: [row],
      ephemeral: true
    });
  }
};