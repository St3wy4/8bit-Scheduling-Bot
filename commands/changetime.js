const {
SlashCommandBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(
__dirname,
'..',
'matches.json'
);

function parseMatchTime(input) {

const valid =
/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s\d{1,2}:\d{2}(AM|PM)$/i;

if (!valid.test(input)) return null;

const match = input.match(
/(\w+)\s(\d+):(\d+)(AM|PM)/i
);

const days = {
sunday: 0,
monday: 1,
tuesday: 2,
wednesday: 3,
thursday: 4,
friday: 5,
saturday: 6
};

const day =
days[match[1].toLowerCase()];

let hour = parseInt(match[2]);

let minutes = parseInt(match[3]);

const period =
match[4].toUpperCase();

if (period === "PM" && hour !== 12)
hour += 12;

if (period === "AM" && hour === 12)
hour = 0;

return (
day * 1440 +
hour * 60 +
minutes
);
}

module.exports = {

data: new SlashCommandBuilder()

.setName('changetime')

.setDescription('Change a match time')

.addIntegerOption(option =>
option
.setName('match')
.setDescription('Match number')
.setRequired(true)
)

.addStringOption(option =>
option
.setName('time')
.setDescription(
'Example: Thursday 7:30PM'
)
.setRequired(true)
),

async execute(interaction) {

const matchNumber =
interaction.options.getInteger(
'match'
);

const newTime =
interaction.options.getString(
'time'
);

const parsedNew =
parseMatchTime(newTime);

if (!parsedNew) {
return interaction.reply({
content:
'❌ Invalid format. Use: Thursday 7:30PM',
ephemeral: true
});
}

const match =
global.confirmedMatches[
matchNumber - 1
];

if (!match) {
return interaction.reply({
content:
'❌ Match not found.',
ephemeral: true
});
}

// CHECK CONFLICTS
const conflict =
global.confirmedMatches.find((m, i) => {

if (i === matchNumber - 1)
return false;

const parsedExisting =
parseMatchTime(m.time);

if (!parsedExisting)
return false;

const difference = Math.abs(
parsedExisting - parsedNew
);

return difference < 60;
});

if (conflict) {
return interaction.reply({
content:
'❌ Another match is within 1 hour.',
ephemeral: true
});
}

match.time = newTime;

fs.writeFileSync(
DATA_FILE,
JSON.stringify(
global.confirmedMatches,
null,
2
)
);

await interaction.reply({
content:
`✅ Match time changed to ${newTime}`
});
}
};
