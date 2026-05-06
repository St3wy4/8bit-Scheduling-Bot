const {
SlashCommandBuilder,
EmbedBuilder
} = require('discord.js');

// 🕒 SORT TIME FUNCTION
function parseDateTime(input) {
const match = input.match(/(\w+)\s(\d{1,2})(?::(\d{2}))?\s?(AM|PM)/i);

if (!match) return 999999;

let [, day, hour, minute = "00", period] = match;

const days = {
sunday: 0,
monday: 1,
tuesday: 2,
wednesday: 3,
thursday: 4,
friday: 5,
saturday: 6
};

const dayIndex = days[day.toLowerCase()] ?? 999;

hour = parseInt(hour);
minute = parseInt(minute);

if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

return dayIndex * 1440 + (hour * 60 + minute);
}

module.exports = {
data: new SlashCommandBuilder()
.setName('viewtimes')
.setDescription('View all confirmed matches'),

async execute(interaction) {

const matches = [...global.confirmedMatches];

if (!matches.length) {
return interaction.reply({
content: "❌ No confirmed matches.",
ephemeral: true
});
}

// 🔥 SORT IN TIMELINE ORDER
matches.sort((a, b) =>
parseDateTime(a.time) - parseDateTime(b.time)
);

// 🔥 CLEAN EMBED
const embed = new EmbedBuilder()
.setTitle('📅 Weekly Match Schedule')
.setColor(0x5865F2);

matches.forEach((m, i) => {
embed.addFields({
name: `${i + 1}. 🏆 ${m.teamA} vs ${m.teamB}`,
value: `🕒 ${m.time}`,
inline: false
});
});

await interaction.reply({
embeds: [embed]
});
}
};