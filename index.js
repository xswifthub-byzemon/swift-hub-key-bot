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

function randomString(len = 6) {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

  let out = "";

  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

// คีย์จริง
function generateRealKey() {

  return `SwiftHub-${randomString(5)}-${randomString(5)}`;
}

// คีย์ชั่วคราว (Get Key)
function generateTempKey(userId) {

  return `${userId.slice(0,8)}-swifthub-${randomString(8)}`;
}

// ================================
// Slash Commands
// ================================

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open Swift Hub Panel"),

  new SlashCommandBuilder()
    .setName("createkeybulk")
    .setDescription("Create 50 Keys (Owner)")
    .addStringOption(opt =>
      opt.setName("mode")
        .setDescription("6 / 12 / 24 / mix")
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

  // ================================
  // Slash
  // ================================

  if (interaction.isChatInputCommand()) {

    // PANEL
    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()

        .setTitle("🚀 Swift Hub | Key System")

        .setDescription(
`
🔹 How To Use
1️⃣ Press Get Key
2️⃣ Copy Temporary Key
3️⃣ Redeem to Activate
4️⃣ Receive Real Key

📌 วิธีใช้งาน
1. กด Get Key
2. เอาคีย์ไป Redeem
3. รับคีย์จริง
4. ใช้งานได้ทันที

⚠️ Do not share your key!
`
        )

        .setColor(0xff3333)

        .setFooter({
          text: "Swift Hub • Secure System"
        });

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId("getkey")
          .setLabel("🔑 Get Key")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("redeem")
          .setLabel("✅ Redeem")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("info")
          .setLabel("ℹ️ Info")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: false
      });
    }

    // CREATE BULK
    if (interaction.commandName === "createkeybulk") {

      if (interaction.user.id !== OWNER_ID) {

        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });
      }

      const mode = interaction.options.getString("mode");

      const db = loadDB();

      let hoursList = [];

      if (mode === "6") hoursList = [6];
      else if (mode === "12") hoursList = [12];
      else if (mode === "24") hoursList = [24];
      else if (mode === "mix") hoursList = [6,12,24];
      else {

        return interaction.reply({
          content: "❌ Use: 6 / 12 / 24 / mix",
          ephemeral: true
        });
      }

      let list = [];

      for (let i = 0; i < 50; i++) {

        const hours =
          hoursList[Math.floor(Math.random()*hoursList.length)];

        const key = generateRealKey();

        db.push({

          key,
          tempKey: null,

          user: null,
          username: null,

          redeemed: false,

          start: null,
          expire: null,

          hours,
          paused: 0

        });

        list.push(`${key} (${hours}h)`);
      }

      saveDB(db);

      await interaction.reply({
        content:
          `✅ Created 50 Keys (${mode})\n\n` +
          "```\n" + list.join("\n") + "\n```",
        ephemeral: true
      });
    }
  }

  // ================================
  // Buttons
  // ================================

  if (interaction.isButton()) {

    const db = loadDB();

    // GET KEY
    if (interaction.customId === "getkey") {

      const userId = interaction.user.id;

      let temp = generateTempKey(userId);

      db.push({

        key: null,
        tempKey: temp,

        user: userId,
        username: interaction.user.tag,

        redeemed: false,

        start: null,
        expire: null,

        hours: null,
        paused: 0

      });

      saveDB(db);

      return interaction.reply({

        content:
`🔑 Temporary Key:

\`${temp}\`

➡️ Use this to Redeem`,
        ephemeral: true
      });
    }

    // INFO
    if (interaction.customId === "info") {

      const userId = interaction.user.id;

      const data = db.find(
        k => k.user === userId && k.redeemed
      );

      if (!data) {

        return interaction.reply({
          content: "❌ No active key",
          ephemeral: true
        });
      }

      const now = Date.now();

      const left = Math.max(
        0,
        Math.floor((data.expire-now)/1000)
      );

      let h = Math.floor(left/3600);
      let m = Math.floor((left%3600)/60);
      let s = left%60;

      return interaction.reply({

        content:
`💎 Your Key Status

⏳ Time Left:
${h}h ${m}m ${s}s

✨ Enjoy Swift Hub!`,
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
        .setLabel("Enter Temporary Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      await interaction.showModal(modal);
    }
  }

  // ================================
  // Modal
  // ================================

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "redeem_modal") {

      const tempKey =
        interaction.fields.getTextInputValue("keyinput");

      const db = loadDB();

      const tempData = db.find(
        k => k.tempKey === tempKey && !k.redeemed
      );

      if (!tempData) {

        return interaction.reply({
          content: "❌ Invalid Key",
          ephemeral: true
        });
      }

      // หา real key ว่าง
      const real = db.find(
        k => k.key && !k.redeemed
      );

      if (!real) {

        return interaction.reply({
          content: "❌ No real key available",
          ephemeral: true
        });
      }

      const now = Date.now();

      real.redeemed = true;
      real.user = interaction.user.id;
      real.username = interaction.user.tag;

      real.start = now;
      real.expire = now + (real.hours*3600000);

      // ลบ temp key
      db.splice(db.indexOf(tempData),1);

      saveDB(db);

      await interaction.reply({

        content:
`✅ Redeem Success!

🎫 Your Real Key:
\`${real.key}\`

⏱ Time: ${real.hours}h`,
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

  if (!data) return res.json({ status:"invalid" });

  if (!data.redeemed) return res.json({ status:"inactive" });

  const now = Date.now();

  if (data.expire < now)
    return res.json({ status:"expired" });

  return res.json({

    status:"valid",

    time_left:
      Math.floor((data.expire-now)/1000)
  });

});

// Dashboard
app.get("/api/dashboard", (req,res)=>{

  const db = loadDB();

  const now = Date.now();

  const result = db.map(k=>({

    key: k.key,
    used: k.redeemed,
    user: k.username,

    expire: k.expire,

    left:
      k.expire
        ? Math.max(0,k.expire-now)
        : null
  }));

  res.json(result);
});

// Page
app.get("/", (req,res)=>{

  res.sendFile(
    path.join(__dirname,"public/dashboard.html")
  );
});

// ================================
// Start
// ================================

app.listen(PORT,()=>{

  console.log("🌐 Dashboard Online");
});

client.login(TOKEN);
