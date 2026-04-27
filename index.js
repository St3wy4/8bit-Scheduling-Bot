require("dotenv").config();
const {
Client,
GatewayIntentBits,
SlashCommandBuilder,
REST,
Routes
} = require("discord.js");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1498417294705950882";

let matches = [];

// 🧠 parse time like "8:00 PM"
function parseTime(timeStr) {
const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
if (!match) return null;

let [_, h, m, period] = match;
let hours = parseInt(h);
const minutes = parseInt(m);

if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

return { hours, minutes };
}

// 🔥 FIXED overlap check (date + time)
function isTooClose(newDate, newTime) {
const newDateTime = new Date(newDate);
newDateTime.setHours(newTime.hours, newTime.minutes, 0, 0);

return matches.some(match => {
const matchDateTime = new Date(match.day);
matchDateTime.setHours(match.time.hours, match.time.minutes, 0, 0);

const diff = Math.abs(matchDateTime - newDateTime);
return diff < 60 * 60 * 1000; // 1 hour
});
}

// 🔁 weekly reset (Sunday EST 9am example)
const RESET_HOUR = 9;
function startWeeklyReset() {
setInterval(() => {
const now = new Date();
const est = new Date(
now.toLocaleString("en-US", { timeZone: "America/New_York" })
);

if (est.getDay() === 0 && est.getHours() === RESET_HOUR) {
matches = [];
console.log("✅ Weekly reset done");
}
}, 60000);
}

// 📜 commands
const commands = [
new SlashCommandBuilder()
.setName("setmatchup")
.setDescription("Schedule a match")
.addStringOption(o =>
o.setName("day")
.setDescription("Date like 5/1")
.setRequired(true)
)
.addStringOption(o =>
o.setName("time")
.setDescription("Time like 8:00 PM")
.setRequired(true)
)
.addUserOption(o =>
o.setName("opponent")
.setDescription("Opponent manager")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("confirm")
.setDescription("Confirm a match"),

new SlashCommandBuilder()
.setName("viewtimes")
.setDescription("View all matches")
];

// 📡 register commands
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
try {
await rest.put(
Routes.applicationCommands(CLIENT_ID),
{ body: commands }
);
console.log("✅ Commands registered");
} catch (err) {
console.error(err);
}
})();

// ✅ ready
client.once("ready", () => {
console.log(`Logged in as ${client.user.tag}`);
startWeeklyReset();
});

// 🎮 command handler
client.on("interactionCreate", async interaction => {
if (!interaction.isChatInputCommand()) return;

// 🔹 SET MATCH
if (interaction.commandName === "setmatchup") {
await interaction.deferReply();

const day = interaction.options.getString("day");
const timeStr = interaction.options.getString("time");
const opponent = interaction.options.getUser("opponent");

// 🔥 FIXED DATE
const [month, dateNum] = day.split("/").map(Number);
const now = new Date();

const parsedDate = new Date(
now.getFullYear(),
month - 1,
dateNum
);

const parsedTime = parseTime(timeStr);

if (!parsedTime) {
return interaction.editReply("❌ Use time like: 8:00 PM");
}

if (isTooClose(parsedDate, parsedTime)) {
return interaction.editReply(
"❌ Matches must be at least 1 hour apart."
);
}

matches.push({
day: parsedDate,
time: parsedTime,
timeStr,
opponentId: opponent.id,
creatorId: interaction.user.id,
confirmed: false
});

await interaction.editReply(
`📅 ${opponent}, match scheduled!\n📆 ${parsedDate.toLocaleDateString("en-US")}\n🕒 ${timeStr} EST\nUse /confirm to approve.`
);
}

// 🔹 CONFIRM
if (interaction.commandName === "confirm") {
const match = matches.find(
m =>
m.opponentId === interaction.user.id &&
!m.confirmed
);

if (!match) {
return interaction.reply("❌ No match to confirm.");
}

match.confirmed = true;

return interaction.reply(
`✅ Match confirmed!\n📆 ${match.day.toLocaleDateString("en-US")}\n🕒 ${match.timeStr}`
);
}

// 🔹 VIEW TIMES
if (interaction.commandName === "viewtimes") {
if (matches.length === 0) {
return interaction.reply("No matches scheduled.");
}

let msg = "📅 **Schedule:**\n";

matches.forEach(m => {
msg += `📆 ${m.day.toLocaleDateString("en-US")} - 🕒 ${m.timeStr}\n`;
});

return interaction.reply(msg);
}
});

client.login(TOKEN);