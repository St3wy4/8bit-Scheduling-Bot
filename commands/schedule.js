const {
SlashCommandBuilder,
ActionRowBuilder,
StringSelectMenuBuilder,
ButtonBuilder,
ButtonStyle
} = require('discord.js');

const TEAMS = {
Pixel: [
"Bedford Bulldogs",
"Boston Peregrine Falcons",
"Buffalo Lake Effect",
"Daytona Coastline Control",
"Denver Apex",
"Incheon Illusion",
"Kc Foxtrotters",
"Louden Lynx",
"Madison Monarchs",
"Vancouver Void"
],
Prism: [
"Arcadia Mages",
"Calgary Chugs",
"Chicago Inferno",
"Hanoi Hydras",
"Havana Highflyers",
"Lincoln Sentinels",
"Miami Nocturnal Hurricanes",
"Nee York Nightmare",
"Santa Carla Freakz",
"Steinhatchee Scallops"
]
};

function getUserTeam(member) {
return member.roles.cache.find(role =>
TEAMS.Pixel.includes(role.name) ||
TEAMS.Prism.includes(role.name)
);
}

module.exports = {
data: new SlashCommandBuilder()
.setName('schedule')
.setDescription('Schedule a match'),

async execute(interaction) {
const member = interaction.member;

const teamRole = getUserTeam(member);

if (!teamRole) {
return interaction.reply({ content: "You don’t have a team role.", ephemeral: true });
}

const league = TEAMS.Pixel.includes(teamRole.name) ? "Pixel" : "Prism";

const opponents = TEAMS[league]
.filter(t => t !== teamRole.name)
.map(t => ({ label: t, value: t }));

const menu = new StringSelectMenuBuilder()
.setCustomId('opponent_select')
.setPlaceholder('Select opponent team')
.addOptions(opponents);

await interaction.reply({
content: `Your team: **${teamRole.name}**`,
components: [new ActionRowBuilder().addComponents(menu)],
ephemeral: true
});

const filter = i => i.user.id === interaction.user.id;

const collector = interaction.channel.createMessageComponentCollector({
filter,
time: 60000
});

collector.on('collect', async i => {
if (i.customId === 'opponent_select') {
const opponent = i.values[0];

await i.reply({ content: "Type match time (example: Tuesday 8PM)", ephemeral: true });

const msg = await interaction.channel.awaitMessages({
filter: m => m.author.id === interaction.user.id,
max: 1,
time: 60000
});

if (!msg.size) return;

const time = msg.first().content;

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId('confirm_match')
.setLabel('✅ Confirm')
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId('deny_match')
.setLabel('❌ Deny')
.setStyle(ButtonStyle.Danger)
);

const role = interaction.guild.roles.cache.find(r => r.name === opponent);

await interaction.channel.send({
content: `${role} **${teamRole.name} vs ${opponent} — ${time}**\nConfirm match?`,
components: [row]
});
}

if (i.customId === 'confirm_match') {
await i.update({
content: "✅ Match confirmed!",
components: []
});
}

if (i.customId === 'deny_match') {
await i.update({
content: "❌ Match denied",
components: []
});
}
});
}
};