// ==================================
// Swift Hub Key Bot
// By Pai 💖
// ==================================

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");

const fs = require("fs");

// ================================
// ENV
// ================================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// ================================
// Client
// ================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================================
// Database
// ================================

const DB_FILE = "./keys.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ================================
// Utils
// ================================

function randomString(len = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";

  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

function generateKey() {
  return `Swift-Hub-zhsyrk&฿7()&9th-${randomString()}`;
}

// ================================
// Slash Commands
// ================================

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open Swift Hub Key Panel"),

  new SlashCommandBuilder()
    .setName("createkey")
    .setDescription("Create Key (Owner Only)")
    .addIntegerOption(opt =>
      opt.setName("hours")
        .setDescription("6 / 12 / 24")
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Slash Commands Registered");

})();

// ================================
// Ready
// ================================

client.once("ready", () => {
  console.log(`🤖 Online: ${client.user.tag}`);
});

// ================================
// Interaction
// ================================

client.on(Events.InteractionCreate, async (interaction) => {

  // ============================
  // Slash Commands
  // ============================

  if (interaction.isChatInputCommand()) {

    // PANEL
    if (interaction.commandName === "panel") {

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("getkey")
          .setLabel("🔑 Get Key")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("redeem")
          .setLabel("✅ Redeem")
          .setStyle(ButtonStyle.Success)

      );

      await interaction.reply({
        content: "📌 **Swift Hub | Key Panel**",
        components: [row],
        ephemeral: true
      });
    }

    // CREATE KEY
    if (interaction.commandName === "createkey") {

      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });
      }

      const hours = interaction.options.getInteger("hours");

      if (![6,12,24].includes(hours)) {
        return interaction.reply({
          content: "❌ Use: 6 / 12 / 24",
          ephemeral: true
        });
      }

      const db = loadDB();

      const key = generateKey();

      db.push({
        key,
        user: null,
        redeemed: false,
        start: null,
        expire: null,
        hours
      });

      saveDB(db);

      await interaction.reply({
        content: `✅ Key Created:\n\`${key}\`\n⏱ ${hours} Hours`,
        ephemeral: true
      });
    }
  }

  // ============================
  // Buttons
  // ============================

  if (interaction.isButton()) {

    // GET KEY
    if (interaction.customId === "getkey") {

      const db = loadDB();

      const freeKey = db.find(k => !k.redeemed);

      if (!freeKey) {
        return interaction.reply({
          content: "❌ No Free Key Now",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: `🔑 Your Key:\n\`${freeKey.key}\`\nUse Redeem Button`,
        ephemeral: true
      });
    }

    // REDEEM
    if (interaction.customId === "redeem") {

      const modal = new ModalBuilder()
        .setCustomId("redeem_modal")
        .setTitle("Redeem Swift Key");

      const input = new TextInputBuilder()
        .setCustomId("keyinput")
        .setLabel("Enter Your Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      await interaction.showModal(modal);
    }
  }

  // ============================
  // Modal
  // ============================

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "redeem_modal") {

      const keyInput =
        interaction.fields.getTextInputValue("keyinput");

      const db = loadDB();

      const data = db.find(k => k.key === keyInput);

      if (!data) {
        return interaction.reply({
          content: "❌ Invalid Key",
          ephemeral: true
        });
      }

      if (data.redeemed) {
        return interaction.reply({
          content: "❌ Already Used",
          ephemeral: true
        });
      }

      const now = Date.now();
      const expire =
        now + (data.hours * 60 * 60 * 1000);

      data.redeemed = true;
      data.user = interaction.user.id;
      data.start = now;
      data.expire = expire;

      saveDB(db);

      await interaction.reply({
        content:
          `✅ Redeemed Success!\n⏱ Expires in ${data.hours}h`,
        ephemeral: true
      });
    }
  }

});

// ================================
// Auto Clear Expired Keys
// ================================

setInterval(() => {

  let db = loadDB();

  const now = Date.now();

  db = db.filter(k => !k.expire || k.expire > now);

  saveDB(db);

}, 60000);

// ================================

client.login(TOKEN);
