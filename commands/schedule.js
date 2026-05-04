const {
SlashCommandBuilder,
ActionRowBuilder,
StringSelectMenuBuilder
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
const teamRole = getUserTeam(interaction.member);

if (!teamRole) {
return interaction.reply({
content: "No team role found.",
ephemeral: true
});
}

const league = TEAMS.Pixel.includes(teamRole.name) ? "Pixel" : "Prism";

const options = TEAMS[league]
.filter(t => t !== teamRole.name)
.map(t => ({ label: t, value: t }));

const menu = new StringSelectMenuBuilder()
.setCustomId('select_opponent')
.setPlaceholder('Select opponent')
.addOptions(options);

await interaction.reply({
content: `Your team: **${teamRole.name}**`,
components: [new ActionRowBuilder().addComponents(menu)],
ephemeral: true
});
}
};