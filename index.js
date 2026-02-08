// ==================================
// Swift Hub Full System ULTIMATE
// FREE / PREMIUM / REDEEM / PANEL / API
// By Pai 💖 For ซีม่อน
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
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const express = require("express");
const path = require("path");
const crypto = require("crypto");

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: ["CHANNEL"]
});

/* ================= EXPRESS ================= */

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */

const DB_FILE = "./keys.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(d) {
  fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));
}

/* ================= UTILS ================= */

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789฿&@!?";

function randSpecial(len = 10) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

function genFreeKey() {
  return `FREEKEY-SWIFTHUB-${Date.now()}-${randSpecial()}`;
}

function genKey(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`.toUpperCase();
}

function parseTime(v, u) {
  if (v === "inf" || u === "inf") return null;

  const n = Number(v);
  if (isNaN(n) || n <= 0) return null;

  if (u === "s") return n * 1000;
  if (u === "m") return n * 60000;
  if (u === "h") return n * 3600000;
  if (u === "d") return n * 86400000;

  return null;
}

function hasActive(db, uid) {
  const now = Date.now();

  return db.find(
    k =>
      k.user === uid &&
      k.redeemed &&
      k.start &&
      (!k.expire || k.expire > now)
  );
}

/* ================= COMMANDS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open Swift Hub Panel"),

  new SlashCommandBuilder()
    .setName("freekey")
    .setDescription("Generate Free Keys (Owner)"),

  new SlashCommandBuilder()
    .setName("premiumkey")
    .setDescription("Create Premium Key (Owner)")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Commands Loaded");

})();

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`🤖 Online: ${client.user.tag}`);
});

/* ================= DISCORD ================= */

client.on(Events.InteractionCreate, async interaction => {

  /* ================= SLASH ================= */

  if (interaction.isChatInputCommand()) {

    /* PANEL */

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("🚀 Swift Hub Panel")
        .setColor(0xff66cc)
        .setDescription(`
1️⃣ Get Key
2️⃣ Redeem
3️⃣ Use Script
`);

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

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }

    /* FREEKEY */

    if (interaction.commandName === "freekey") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: "❌ Owner Only", ephemeral: true });

      const menu = new StringSelectMenuBuilder()
        .setCustomId("free_select")
        .setPlaceholder("Select Duration")
        .addOptions([
          { label: "6 Hours", value: "6" },
          { label: "12 Hours", value: "12" },
          { label: "24 Hours", value: "24" },
          { label: "Random", value: "random" }
        ]);

      return interaction.reply({
        content: "🎁 Select Duration",
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

    /* PREMIUM */

    if (interaction.commandName === "premiumkey") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: "❌ Owner Only", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId("premium_modal")
        .setTitle("Create Premium Key");

      const prefix = new TextInputBuilder()
        .setCustomId("prefix")
        .setLabel("Prefix (VIP / PRO / PREMIUM)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const amount = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Amount (1-10)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const time = new TextInputBuilder()
        .setCustomId("time")
        .setLabel("Time (number / inf)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const unit = new TextInputBuilder()
        .setCustomId("unit")
        .setLabel("Unit (s/m/h/d/inf)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(prefix),
        new ActionRowBuilder().addComponents(amount),
        new ActionRowBuilder().addComponents(time),
        new ActionRowBuilder().addComponents(unit)
      );

      return interaction.showModal(modal);
    }
  }

  /* ================= MODAL ================= */

  if (interaction.isModalSubmit()) {

    let db = loadDB();

    /* REDEEM */

    if (interaction.customId === "redeem_modal") {

      let token = interaction.fields.getTextInputValue("token");

      let t = db.find(k => k.key === token && k.type === "token");

      if (!t)
        return interaction.reply({ content: "❌ Invalid Token", ephemeral: true });

      let free = db.find(k => k.type === "free" && k.temp);

      if (!free)
        return interaction.reply({ content: "❌ No Free Key", ephemeral: true });

      free.temp = false;
      free.redeemed = true;

      free.user = interaction.user.id;
      free.username = interaction.user.username;

      // ❌ ยังไม่เริ่มเวลา
      free.start = null;
      free.expire = null;

      db.splice(db.indexOf(t), 1);

      saveDB(db);

      return interaction.reply({
        content: "✅ Redeem สำเร็จ (จะเริ่มนับตอนใช้งานครั้งแรก)",
        ephemeral: true
      });
    }

    /* PREMIUM */

    if (interaction.customId === "premium_modal") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: "❌ Owner Only", ephemeral: true });

      const prefix =
        interaction.fields.getTextInputValue("prefix").toUpperCase();

      const amount =
        Number(interaction.fields.getTextInputValue("amount"));

      const time =
        interaction.fields.getTextInputValue("time");

      const unit =
        interaction.fields.getTextInputValue("unit");

      if (amount < 1 || amount > 10)
        return interaction.reply({ content: "❌ Amount 1-10 only", ephemeral: true });

      let ms = parseTime(time, unit);

      let keys = [];

      for (let i = 0; i < amount; i++) {

        let k = genKey(prefix);

        db.push({
          key: k,
          type: "premium",

          redeemed: true,

          user: null,
          username: null,

          // ❌ ยังไม่เริ่มเวลา
          start: null,
          expire: null,

          duration: ms,

          ip: null,
          hwid: null
        });

        keys.push(k);
      }

      saveDB(db);

      const msg = `
💎 PREMIUM KEYS

${keys.map(k=>`\`${k}\``).join("\n")}

⏳ เริ่มนับตอนใช้งานครั้งแรก
`;

      await interaction.reply({
        content: msg,
        ephemeral: true
      });
    }
  }
});

/* ================= API ================= */

app.get("/verify", (req, res) => {

  const { key, ip, hwid } = req.query;

  const db = loadDB();

  const d = db.find(k => k.key === key);

  if (!d) return res.json({ status: "invalid" });

  const now = Date.now();

  /* ✅ Activate ครั้งแรก */
  if (!d.start) {

    d.start = now;

    if (d.type === "free") {
      d.expire = now + d.hours * 3600000;
    }

    if (d.type === "premium" && d.duration) {
      d.expire = now + d.duration;
    }

    saveDB(db);
  }

  if (d.expire && d.expire < now)
    return res.json({ status: "expired" });

  if (!d.ip && !d.hwid) {

    d.ip = ip;
    d.hwid = hwid;

    saveDB(db);
  }

  if (d.ip !== ip || d.hwid !== hwid)
    return res.json({ status: "blocked" });

  return res.json({
    status: "valid",
    left: d.expire
      ? Math.floor((d.expire - now) / 1000)
      : null
  });
});

/* ================= DASHBOARD ================= */

app.get("/api/dashboard", (req, res) => {

  const db = loadDB();
  const now = Date.now();

  res.json(db.map(k => ({

    key: k.key,
    type: k.type,

    user: k.user,
    username: k.username,

    used: k.redeemed,

    left: k.expire
      ? Math.max(0, k.expire - now)
      : null

  })));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

app.listen(PORT, () => {
  console.log("🌐 Dashboard Online");
});

client.login(TOKEN);
