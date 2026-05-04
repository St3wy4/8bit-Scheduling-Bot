require('dotenv').config();

const {
Client,
GatewayIntentBits,
Collection,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
ActionRowBuilder
} = require('discord.js');

const fs = require('fs');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

// command system
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
const command = require(`./commands/${file}`);
client.commands.set(command.data.name, command);
}

// TEMP match storage
const scheduledMatches = [];

// ready
client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
});

// interaction handler
client.on('interactionCreate', async interaction => {

// SLASH COMMANDS
if (interaction.isChatInputCommand()) {
const command = client.commands.get(interaction.commandName);
if (!command) return;

try {
await command.execute(interaction);
} catch (error) {
console.error(error);
await interaction.reply({ content: 'Error executing command.', ephemeral: true });
}
}

// DROPDOWN SELECT
if (interaction.isStringSelectMenu() && interaction.customId === 'select_opponent') {
const opponent = interaction.values[0];

const modal = new ModalBuilder()
.setCustomId(`schedule_modal_${opponent}`)
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
if (interaction.customId.startsWith('schedule_modal_')) {
const opponent = interaction.customId.replace('schedule_modal_', '');
const time = interaction.fields.getTextInputValue('time_input');

scheduledMatches.push({
teamA: interaction.member.displayName,
teamB: opponent,
time
});

await interaction.reply({
content: `✅ Match scheduled: ${interaction.member.displayName} vs ${opponent} at ${time}`,
ephemeral: true
});

console.log(scheduledMatches); // debug
}
}

});

client.login(process.env.TOKEN);