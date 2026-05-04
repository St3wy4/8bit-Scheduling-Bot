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
const path = require('path');

const DATA_FILE = path.join(__dirname, 'matches.json');

// LOAD SAVED MATCHES
let confirmedMatches = [];

if (fs.existsSync(DATA_FILE)) {
confirmedMatches = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const pendingMatches = [];

global.pendingMatches = pendingMatches;
global.confirmedMatches = confirmedMatches;

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

// ready
client.once('ready', () => {
console.log(`Logged in as ${client.user.tag}`);
});

// interactions
client.on('interactionCreate', async interaction => {

// slash commands
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

// dropdown
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

// modal submit
if (interaction.isModalSubmit()) {
if (interaction.customId.startsWith('schedule_modal_')) {

const opponent = interaction.customId.replace('schedule_modal_', '');
const time = interaction.fields.getTextInputValue('time_input');

const teamRole = interaction.member.roles.cache.find(r =>
r.name !== "@everyone"
);

const teamA = teamRole ? teamRole.name : "Unknown Team";

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