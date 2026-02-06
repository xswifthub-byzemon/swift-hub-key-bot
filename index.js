// ==================================
// Swift Hub Key Bot + API + Dashboard
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
  Events,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const express = require("express");
const path = require("path");

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
// Express
// ================================

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

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
    .setName("createkeybulk")
    .setDescription("Create 50 Keys (Owner Only)")
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

  console.log("✅ Commands Loaded");

})();

// ================================
// Ready
// ================================

client.once("ready", () => {
  console.log(`🤖 Online: ${client.user.tag}`);
});

// ================================
// Discord
// ================================

client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()) {

    // PANEL
    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()

        .setTitle("🚀 Swift Hub | Key System")

        .setDescription(
          "🔑 Get your free key\n" +
          "✅ Redeem to activate\n" +
          "⏱ Limited time access\n\n" +
          "⚠️ Do not share your key!"
        )

        .setColor(0x9b59ff)

        .setImage(
          "https://cdn.discordapp.com/attachments/1469089205840904427/1469146767705767949/9792cd65875edf6333f3a32eb216040b.jpg"
        )

        .setFooter({
          text: "Swift Hub • Secure System 🔒"
        });

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
        embeds: [embed],
        components: [row],
        ephemeral: false
      });
    }

    // CREATE 50 KEYS
    if (interaction.commandName === "createkeybulk") {

      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });
      }

      const hours = interaction.options.getInteger("hours");

      const db = loadDB();

      let list = [];

      for (let i = 0; i < 50; i++) {

        const key = generateKey();

        db.push({
          key,
          user: null,
          username: null,
          redeemed: false,
          start: null,
          expire: null,
          hours
        });

        list.push(key);
      }

      saveDB(db);

      await interaction.reply({
        content:
          `✅ Created 50 Keys (${hours}h)\n\n` +
          "```\n" + list.join("\n") + "\n```",
        ephemeral: true
      });
    }
  }

  // Buttons
  if (interaction.isButton()) {

    // GET KEY
    if (interaction.customId === "getkey") {

      const db = loadDB();

      const free = db.find(k => !k.redeemed);

      if (!free) {
        return interaction.reply({
          content: "❌ No free keys.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: `🔑 Your Key:\n\`${free.key}\``,
        ephemeral: true
      });
    }

    // REDEEM
    if (interaction.customId === "redeem") {

      const modal = new ModalBuilder()
        .setCustomId("redeem_modal")
        .setTitle("Redeem Key");

      const input = new TextInputBuilder()
        .setCustomId("keyinput")
        .setLabel("Enter Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      await interaction.showModal(modal);
    }
  }

  // Modal
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "redeem_modal") {

      const key = interaction.fields.getTextInputValue("keyinput");

      const db = loadDB();

      const data = db.find(k => k.key === key);

      if (!data) {
        return interaction.reply({
          content: "❌ Invalid key",
          ephemeral: true
        });
      }

      if (data.redeemed) {
        return interaction.reply({
          content: "❌ Used key",
          ephemeral: true
        });
      }

      const now = Date.now();

      data.redeemed = true;
      data.user = interaction.user.id;
      data.username = interaction.user.tag;
      data.start = now;
      data.expire = now + (data.hours * 3600000);

      saveDB(db);

      await interaction.reply({
        content: "✅ Redeem Success!",
        ephemeral: true
      });
    }
  }

});

// ================================
// API
// ================================

// Verify
app.get("/verify", (req, res) => {

  const key = req.query.key;

  const db = loadDB();

  const data = db.find(k => k.key === key);

  if (!data) return res.json({ status: "invalid" });

  if (!data.redeemed) return res.json({ status: "not_redeemed" });

  const now = Date.now();

  if (data.expire < now) return res.json({ status: "expired" });

  return res.json({
    status: "valid",
    time_left: Math.floor((data.expire - now) / 1000)
  });

});

// Dashboard Data
app.get("/api/dashboard", (req, res) => {

  const db = loadDB();

  const now = Date.now();

  const result = db.map(k => ({

    key: k.key,
    used: k.redeemed,
    user: k.username,
    expire: k.expire,
    left: k.expire ? Math.max(0, k.expire - now) : null

  }));

  res.json(result);
});

// Dashboard Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
  console.log("🌐 Web Dashboard Online");
});

// ================================

client.login(TOKEN);
