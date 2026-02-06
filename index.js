// ==================================
// Swift Hub Key Bot + Dashboard + Excel Export
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
const express = require("express");
const XLSX = require("xlsx");

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
// Web Server
// ================================

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

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
    .setDescription("Create 50 Keys (Owner)")
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
// Discord Interaction
// ================================

client.on(Events.InteractionCreate, async (interaction) => {

  // ============================
  // Slash
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
        content: "📌 **Swift Hub Key Panel**",
        components: [row]
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

      const hours = interaction.options.getInteger("hours");

      if (![6,12,24].includes(hours)) {
        return interaction.reply({
          content: "❌ Use: 6 / 12 / 24",
          ephemeral: true
        });
      }

      const db = loadDB();
      const keys = [];

      for(let i=0;i<50;i++){

        const key = generateKey();

        db.push({
          key,
          user: null,
          redeemed: false,
          start: null,
          expire: null,
          hours
        });

        keys.push(key);
      }

      saveDB(db);

      await interaction.reply({
        content: `✅ Created 50 Keys (${hours}h)`,
        ephemeral: true
      });
    }
  }

  // ============================
  // Buttons
  // ============================

  if (interaction.isButton()) {

    // GET
    if (interaction.customId === "getkey") {

      const db = loadDB();
      const freeKey = db.find(k => !k.redeemed);

      if (!freeKey) {
        return interaction.reply({
          content: "❌ No Free Key",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: `🔑 Your Key:\n\`${freeKey.key}\``,
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
          content: "❌ Used Already",
          ephemeral: true
        });
      }

      const now = Date.now();
      const expire =
        now + (data.hours * 3600000);

      data.redeemed = true;
      data.user = interaction.user.tag;
      data.start = now;
      data.expire = expire;

      saveDB(db);

      await interaction.reply({
        content: `✅ Redeemed (${data.hours}h)`,
        ephemeral: true
      });
    }
  }

});

// ================================
// Dashboard API
// ================================

app.get("/api/dashboard", (req,res)=>{

  const db = loadDB();
  const now = Date.now();

  const data = db.map(k=>{

    let left = 0;

    if(k.expire){
      left = Math.max(0, k.expire - now);
    }

    return {
      key: k.key,
      user: k.user,
      used: k.redeemed,
      left
    };
  });

  res.json(data);
});

// ================================
// ✅ EXPORT EXCEL API
// ================================

app.get("/api/export",(req,res)=>{

  const db = loadDB();

  const rows = db.map((k,i)=>{

    let status = "FREE";

    if(k.redeemed && k.expire){
      status = k.expire > Date.now() ? "USING" : "EXPIRED";
    }

    return {
      No: i+1,
      Key: k.key,
      User: k.user || "-",
      Status: status,
      Hours: k.hours,
      Start: k.start ? new Date(k.start).toLocaleString() : "-",
      Expire: k.expire ? new Date(k.expire).toLocaleString() : "-"
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(wb, ws, "SwiftKeys");

  const buffer = XLSX.write(wb,{ type:"buffer", bookType:"xlsx" });

  res.setHeader("Content-Disposition","attachment; filename=swift-keys.xlsx");
  res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  res.send(buffer);

});

// ================================
// Auto Clear Expired
// ================================

setInterval(()=>{

  let db = loadDB();
  const now = Date.now();

  db = db.filter(k => !k.expire || k.expire > now);

  saveDB(db);

},60000);

// ================================
// Start Server
// ================================

app.listen(PORT,()=>{
  console.log("🌐 Web Running:",PORT);
});

client.login(TOKEN);
