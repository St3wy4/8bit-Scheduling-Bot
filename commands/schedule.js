const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Test command'),

  async execute(interaction) {
    await interaction.reply('Schedule command is working!');
  }
};