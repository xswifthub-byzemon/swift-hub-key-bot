// ==================================
// Swift Hub Key Bot + API + Dashboard
// DEVKEY FINAL
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
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const express = require("express");
const path = require("path");

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
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

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ================= UTILS ================= */

function randomString(len = 10) {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let out = "";

  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

function genDevKey(name, num) {

  return `${name}-${num}-${randomString(8)}`;

}

function parseTime(val, unit) {

  if (val === "inf" || unit === "inf") {
    return null;
  }

  let n = Number(val);

  if (isNaN(n) || n <= 0) return null;

  switch (unit) {

    case "s": return n * 1000;
    case "m": return n * 60000;
    case "h": return n * 3600000;
    case "d": return n * 86400000;

    default: return null;
  }
}

/* ================= COMMANDS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open Swift Hub Panel"),

  new SlashCommandBuilder()
    .setName("devkey")
    .setDescription("Create Dev Keys (Owner Only)")

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

  /* ===== SLASH ===== */

  if (interaction.isChatInputCommand()) {

    /* PANEL */

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()

        .setTitle("🚀 Swift Hub | Panel")

        .setDescription(`
1. Get Key
2. Redeem
3. Use Script

📌 วิธีใช้
1. รับคีย์
2. Redeem
3. ใช้งาน
`)

        .setColor(0xff66cc);

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    /* DEVKEY */

    if (interaction.commandName === "devkey") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });

      const modal = new ModalBuilder()
        .setCustomId("devkey_modal")
        .setTitle("Create DevKey");

      const name = new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Name (DEV / TEST / VIP)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const num = new TextInputBuilder()
        .setCustomId("num")
        .setLabel("Number (1-99999+)")
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

        new ActionRowBuilder().addComponents(name),
        new ActionRowBuilder().addComponents(num),
        new ActionRowBuilder().addComponents(amount),
        new ActionRowBuilder().addComponents(time),
        new ActionRowBuilder().addComponents(unit)

      );

      return interaction.showModal(modal);
    }
  }

  /* ===== MODAL ===== */

  if (interaction.isModalSubmit()) {

    if (interaction.customId !== "devkey_modal") return;

    if (interaction.user.id !== OWNER_ID)
      return interaction.reply({
        content: "❌ Owner Only",
        ephemeral: true
      });

    const name = interaction.fields.getTextInputValue("name").toUpperCase();
    const num = interaction.fields.getTextInputValue("num");
    const amount = Number(interaction.fields.getTextInputValue("amount"));
    const time = interaction.fields.getTextInputValue("time").toLowerCase();
    const unit = interaction.fields.getTextInputValue("unit").toLowerCase();

    if (amount < 1 || amount > 10) {
      return interaction.reply({
        content: "❌ Amount ต้อง 1-10 เท่านั้น",
        ephemeral: true
      });
    }

    let ms = parseTime(time, unit);

    let db = loadDB();
    let now = Date.now();

    let keys = [];

    for (let i = 0; i < amount; i++) {

      let k = genDevKey(name, num);

      let expire = null;

      if (ms !== null) {
        expire = now + ms;
      }

      db.push({

        key: k,

        type: "dev",

        redeemed: false,

        user: null,
        username: null,

        start: null,
        expire: expire,

        ip: null,
        hwid: null

      });

      keys.push(k);
    }

    saveDB(db);

    /* MESSAGE */

    let msg = `
💎 DEV KEYS GENERATED 💎

📛 Name: ${name}
🔢 Number: ${num}
📦 Amount: ${amount}

⏳ Duration: ${
      ms === null ? "∞ Unlimited" :
      `${time}${unit}`
    }

━━━━━━━━━━━━━━

🔑 Keys:

${keys.map(k => `\`${k}\``).join("\n")}

━━━━━━━━━━━━━━

💖 Keep it safe!
`;

    /* DM */

    try {

      await interaction.user.send(msg);

    } catch {

      console.log("DM Failed");

    }

    /* EPHEMERAL */

    await interaction.reply({
      content: "✅ DevKey Created! 📩 Sent to DM\n⏳ Will disappear in 5 min",
      ephemeral: true
    });

    /* AUTO DELETE */

    setTimeout(async () => {

      try {
        await interaction.deleteReply();
      } catch {}

    }, 300000); // 5 min
  }
});

/* ================= API ================= */

app.get("/verify", (req, res) => {

  const { key, ip, hwid } = req.query;

  const db = loadDB();

  const d = db.find(k => k.key === key);

  if (!d) return res.json({ status: "invalid" });

  if (d.expire && d.expire < Date.now())
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
      ? Math.floor((d.expire - Date.now()) / 1000)
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

    user: k.username,
    uid: k.user,

    ip: k.ip,
    hwid: k.hwid,

    used: k.redeemed,

    left: k.expire
      ? Math.max(0, k.expire - now)
      : null

  })));
});

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "public/dashboard.html")
  );

});

app.listen(PORT, () => {

  console.log("🌐 Dashboard Online");

});

client.login(TOKEN);
