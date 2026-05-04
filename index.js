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

// MATCH STORAGE
const pendingMatches = [];
const confirmedMatches = [];

global.pendingMatches = pendingMatches;
global.confirmedMatches = confirmedMatches;

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

const teamRole = interaction.member.roles.cache.find(r =>
r.name !== "@everyone"
);

const teamA = teamRole ? teamRole.name : "Unknown Team";

// SAVE AS PENDING
pendingMatches.push({
teamA,
teamB: opponent,
time,
scheduledBy: interaction.user.id
});

await interaction.reply({
content: `✅ Match request sent to ${opponent}`,
ephemeral: true
});

// PING OPPONENT TEAM
const role = interaction.guild.roles.cache.find(r => r.name === opponent);

if (role) {
await interaction.channel.send({
content: `${role} **${teamA} vs ${opponent} — ${time}**\nUse /confirm to approve`
});
}
}
}

});

client.login(process.env.TOKEN);