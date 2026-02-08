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
    GatewayIntentBits.DirectMessages
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

function randSpecial(len = 12) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

function genFreeKey() {
  return `FREEKEY-SWIFTHUB-${Date.now()}-${randSpecial(10)}`;
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
    .setDescription("Generate 50 Free Keys (Owner)"),

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

    /* ===== PANEL ===== */

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("🚀 Swift Hub | Panel")
        .setColor(0xff66cc)
        .setDescription(`
1️⃣ Get Key
2️⃣ Redeem
3️⃣ Use Script

📌 วิธีใช้
1. กด Get Key
2. Redeem
3. ใช้งาน
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

    /* ===== FREEKEY ===== */

    if (interaction.commandName === "freekey") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });

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
        content: "🎁 Select Free Key Duration",
        components: [
          new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
      });
    }

    /* ===== PREMIUM ===== */

    if (interaction.commandName === "premiumkey") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });

      const modal = new ModalBuilder()
        .setCustomId("premium_modal")
        .setTitle("Create Premium Key");

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
        new ActionRowBuilder().addComponents(amount),
        new ActionRowBuilder().addComponents(time),
        new ActionRowBuilder().addComponents(unit)
      );

      return interaction.showModal(modal);
    }
  }

  /* ================= SELECT ================= */

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "free_select") {

      let db = loadDB();
      let list = [];

      let val = interaction.values[0];

      let pool = [];

      if (val === "6") pool = [6];
      else if (val === "12") pool = [12];
      else if (val === "24") pool = [24];
      else pool = [6, 12, 24];

      for (let i = 0; i < 50; i++) {

        let h = pool[Math.floor(Math.random() * pool.length)];

        let key = genFreeKey();

        db.push({
          key,
          type: "free",

          temp: true,
          redeemed: false,

          user: null,

          start: null,
          expire: null,

          hours: h,

          ip: null,
          hwid: null
        });

        list.push(`${key} (${h}h)`);
      }

      saveDB(db);

      await interaction.update({
        content: "✅ Free Keys Created",
        components: []
      });

      await interaction.followUp({
        content: "```" + list.join("\n") + "```",
        ephemeral: true
      });
    }
  }

  /* ================= BUTTON ================= */

  if (interaction.isButton()) {

    let db = loadDB();
    let uid = interaction.user.id;

    /* ===== GETKEY ===== */

    if (interaction.customId === "getkey") {

      if (hasActive(db, uid))
        return interaction.reply({
          content: "❌ You still have active key",
          ephemeral: true
        });

      let token = genKey("TOKEN");

      db.push({
        key: token,
        type: "token",

        user: uid,
        redeemed: false,

        start: null,
        expire: null,

        ip: null,
        hwid: null
      });

      saveDB(db);

      return interaction.reply({
        content: `
\`\`\`
🔐 TEMP TOKEN

🇬🇧 Copy this token and redeem to get your real key
🇹🇭 ให้นำ Token นี้ไป Redeem เพื่อรับคีย์จริง

━━━━━━━━━━━━━━
📌 TOKEN:
${token}
━━━━━━━━━━━━━━
\`\`\`
`,
        ephemeral: true
      });
    }

    /* ===== INFO ===== */

    if (interaction.customId === "info") {

      let d = hasActive(db, uid);

      if (!d)
        return interaction.reply({
          content: "❌ No Active Key",
          ephemeral: true
        });

      let left = d.expire
        ? Math.floor((d.expire - Date.now()) / 1000)
        : null;

      return interaction.reply({
        content: `
\`\`\`
📊 KEY INFO

Key: ${d.key}
Time: ${left ? left + "s" : "∞"}
\`\`\`
`,
        ephemeral: true
      });
    }

    /* ===== REDEEM ===== */

    if (interaction.customId === "redeem") {

      if (hasActive(db, uid))
        return interaction.reply({
          content: "❌ Wait until expired",
          ephemeral: true
        });

      const modal = new ModalBuilder()
        .setCustomId("redeem_modal")
        .setTitle("Redeem Token");

      const input = new TextInputBuilder()
        .setCustomId("token")
        .setLabel("Enter TOKEN")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }
  }

  /* ================= MODAL ================= */

  if (interaction.isModalSubmit()) {

    let db = loadDB();

    /* ===== REDEEM ===== */

    if (interaction.customId === "redeem_modal") {

      let token =
        interaction.fields.getTextInputValue("token");

      let t = db.find(
        k => k.key === token && k.type === "token"
      );

      if (!t)
        return interaction.reply({
          content: "❌ Invalid Token",
          ephemeral: true
        });

      let free = db.find(
        k => k.type === "free" && k.temp
      );

      if (!free)
        return interaction.reply({
          content: "❌ No Free Key",
          ephemeral: true
        });

      let now = Date.now();

      free.temp = false;
      free.redeemed = true;

      free.user = interaction.user.id;
      free.start = now;
      free.expire =
        now + free.hours * 3600000;

      db.splice(db.indexOf(t), 1);

      saveDB(db);

      const msg = `
\`\`\`
🎉 FREE KEY

User: ${interaction.user.username}
Key : ${free.key}
Time: ${free.hours} Hours

🇬🇧 You can use it now!
🇹🇭 ใช้งานได้ทันทีนะคะ 💖
\`\`\`
`;

      /* DM */
      try {
        await interaction.user.send(msg);
      } catch {}

      /* CHANNEL (PRIVATE) */
      await interaction.reply({
        content: msg,
        ephemeral: true
      });
    }

    /* ===== PREMIUM ===== */

    if (interaction.customId === "premium_modal") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({
          content: "❌ Owner Only",
          ephemeral: true
        });

      const amount = Number(
        interaction.fields.getTextInputValue("amount")
      );

      const time =
        interaction.fields.getTextInputValue("time");

      const unit =
        interaction.fields.getTextInputValue("unit");

      if (amount < 1 || amount > 10)
        return interaction.reply({
          content: "❌ Amount 1-10 only",
          ephemeral: true
        });

      let ms = parseTime(time, unit);
      let now = Date.now();

      let keys = [];

      for (let i = 0; i < amount; i++) {

        let k = genKey("PREMIUM");

        db.push({
          key: k,
          type: "premium",

          redeemed: true,

          user: null,

          start: now,
          expire: ms ? now + ms : null,

          ip: null,
          hwid: null
        });

        keys.push(k);
      }

      saveDB(db);

      const msg = `
\`\`\`
💎 PREMIUM KEYS

${keys.join("\n")}

Keep it safe 💖
\`\`\`
`;

      try {
        await interaction.user.send(msg);
      } catch {}

      await interaction.reply({
        content: "✅ Sent to DM (5 min)",
        ephemeral: true
      });

      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 300000);
    }
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

    user: k.user,

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
