// ==================================
// Swift Hub v3.1 FINAL FULL
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
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const express = require("express");
const path = require("path");

// ================= ENV =================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// ================= CLIENT =================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= EXPRESS =================

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ================= DB =================

const DB_FILE = "./keys.json";

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");

const loadDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = d => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

// ================= UTILS =================

function rand(len = 10) {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&!*฿";
  let o = "";
  for (let i = 0; i < len; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
}

function genKey() {
  return `SwiftHub-${rand(8)}-${rand(8)}-${rand(6)}`;
}

function genDevKey(name) {
  return `${name}-${rand(10)}@฿${rand(6)}`;
}

function genTemp(uid) {
  return `${uid}-swifthub-${rand(12)}`;
}

function parseTime(t, u) {
  if (u === "inf") return null;

  const map = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    y: 31536000000
  };

  return t * map[u];
}

function hasActiveKey(db, uid) {
  const now = Date.now();

  return db.find(k =>
    k.user === uid &&
    k.redeemed &&
    (k.expire === null || k.expire > now)
  );
}

// ================= COMMANDS =================

const commands = [

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open Swift Hub Panel"),

  new SlashCommandBuilder()
    .setName("createkeybulk")
    .setDescription("Create 50 Keys (Owner)"),

  new SlashCommandBuilder()
    .setName("devkey")
    .setDescription("Create Dev/Test Key")
    .addStringOption(o =>
      o.setName("name").setDescription("Key Prefix").setRequired(true))
    .addIntegerOption(o =>
      o.setName("time").setDescription("Time").setRequired(true))
    .addStringOption(o =>
      o.setName("unit")
        .setDescription("s/m/h/d/y/inf")
        .setRequired(true)
        .addChoices(
          { name: "Second", value: "s" },
          { name: "Minute", value: "m" },
          { name: "Hour", value: "h" },
          { name: "Day", value: "d" },
          { name: "Year", value: "y" },
          { name: "Infinite", value: "inf" }
        ))
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Amount")
        .setRequired(true))

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Commands Loaded");
})();

// ================= READY =================

client.once("ready", () => {
  console.log("🤖 Swift Hub Online");
});

// ================= DISCORD =================

client.on(Events.InteractionCreate, async i => {

  let db = loadDB();

  // ========== SLASH ==========

  if (i.isChatInputCommand()) {

    // PANEL
    if (i.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setTitle("🚀 Swift Hub Key System")
        .setDescription(`
🔹 HOW TO USE
1. Get Key
2. Redeem
3. Use Script

📌 วิธีใช้งาน
1. กด Get Key
2. Redeem
3. ใช้งาน

⚠️ 1 คนใช้ได้ 1 คีย์ ต่อรอบ
        `)
        .setImage("https://i.imgur.com/4M7IWwP.png")
        .setColor(0xff3366);

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

      return i.reply({
        embeds: [embed],
        components: [row]
      });
    }

    // BULK
    if (i.commandName === "createkeybulk") {

      if (i.user.id !== OWNER_ID)
        return i.reply({ content: "❌ Owner Only", ephemeral: true });

      const menu = new StringSelectMenuBuilder()
        .setCustomId("bulk_time")
        .setPlaceholder("Select Duration")
        .addOptions(
          { label: "6 Hours", value: "6" },
          { label: "12 Hours", value: "12" },
          { label: "24 Hours", value: "24" },
          { label: "Random", value: "random" }
        );

      return i.reply({
        content: "⏱ Select Time",
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

    // DEVKEY
    if (i.commandName === "devkey") {

      if (i.user.id !== OWNER_ID)
        return i.reply({ content: "❌ Admin Only", ephemeral: true });

      const name = i.options.getString("name");
      const time = i.options.getInteger("time");
      const unit = i.options.getString("unit");
      const amount = i.options.getInteger("amount");

      let ms = parseTime(time, unit);

      let list = [];

      for (let x = 0; x < amount; x++) {

        let k = genDevKey(name);

        db.push({

          key: k,
          type: "test",
          name,

          user: i.user.id,
          username: i.user.tag,

          redeemed: true,

          start: Date.now(),
          expire: ms ? Date.now() + ms : null,

          ip: null,
          hwid: null
        });

        list.push(k);
      }

      saveDB(db);

      let text =
`🧪 DEV KEY CREATED

📛 Name: ${name}
📦 Amount: ${amount}

🔐 Keys:
${list.map(k=>"• "+k).join("\n")}

━━━━━━━━━━━━━━

🧪 สร้างคีย์เทสแล้ว
ใช้ได้ทันที 💖`;

      await i.reply({ content: text, ephemeral: true });

      try { await i.user.send(text); } catch {}
    }
  }

  // ========== SELECT ==========

  if (i.isStringSelectMenu()) {

    if (i.customId === "bulk_time") {

      await i.deferUpdate();

      let arr = [];

      if (i.values[0] === "6") arr = [6];
      else if (i.values[0] === "12") arr = [12];
      else if (i.values[0] === "24") arr = [24];
      else arr = [6,12,24];

      let list = [];

      for (let x = 0; x < 50; x++) {

        let h = arr[Math.floor(Math.random()*arr.length)];
        let k = genKey();

        db.push({

          key: k,
          type: "normal",

          user: null,
          username: null,

          redeemed: false,

          start: null,
          expire: null,

          hours: h,

          ip: null,
          hwid: null
        });

        list.push(`${k} (${h}h)`);
      }

      saveDB(db);

      await i.editReply({
        content: "✅ Keys Generated",
        components: []
      });

      await i.followUp({
        content: "```"+list.join("\n")+"```",
        ephemeral: true
      });
    }
  }

  // ========== BUTTON ==========

  if (i.isButton()) {

    let uid = i.user.id;

    // GETKEY
    if (i.customId === "getkey") {

      if (hasActiveKey(db, uid))
        return i.reply({ content: "❌ Active Key Found", ephemeral: true });

      let t = genTemp(uid);

      db.push({

        key: null,
        tempKey: t,

        user: uid,
        username: i.user.tag,

        redeemed: false,

        start: null,
        expire: null
      });

      saveDB(db);

      return i.reply({
        content: `
👤 UID
────────────
\`${uid}\`

🔑 TEMP KEY
────────────
\`${t}\`

➡️ Redeem before use

━━━━━━━━━━━━━━

ให้นำไป Redeem ก่อนนะ 💖
`,
        ephemeral: true
      });
    }

    // INFO
    if (i.customId === "info") {

      let d = hasActiveKey(db, uid);

      if (!d)
        return i.reply({ content: "❌ No Key", ephemeral: true });

      let left = d.expire
        ? Math.floor((d.expire-Date.now())/1000)+"s"
        : "∞";

      return i.reply({
        content: `
📊 KEY INFO

🔑 ${d.key}
⏱ ${left}

━━━━━━━━━━━━━━

สถานะปกติ 💚
`,
        ephemeral: true
      });
    }

    // REDEEM
    if (i.customId === "redeem") {

      const modal = new ModalBuilder()
        .setCustomId("redeem_m")
        .setTitle("Redeem Key");

      const input = new TextInputBuilder()
        .setCustomId("k")
        .setLabel("Temp Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return i.showModal(modal);
    }
  }

  // ========== MODAL ==========

  if (i.isModalSubmit()) {

    if (i.customId === "redeem_m") {

      let temp = i.fields.getTextInputValue("k");

      let t = db.find(k => k.tempKey === temp);

      if (!t)
        return i.reply({ content: "❌ Invalid", ephemeral: true });

      let real = db.find(k =>
        k.key && !k.redeemed && k.type === "normal"
      );

      if (!real)
        return i.reply({ content: "❌ No Key", ephemeral: true });

      real.redeemed = true;
      real.user = i.user.id;
      real.username = i.user.tag;

      let now = Date.now();

      real.start = now;
      real.expire = now + real.hours*3600000;

      db.splice(db.indexOf(t),1);

      saveDB(db);

      return i.reply({
        content: `
🎉 SUCCESS

🔑 KEY
────────────
\`${real.key}\`

⏱ ${real.hours} Hours

━━━━━━━━━━━━━━

ใช้งานได้เลย 💖
`,
        ephemeral: true
      });
    }
  }

});

// ================= API =================

app.get("/api/dashboard",(req,res)=>{

  const db=loadDB();
  const now=Date.now();

  res.json(db.map(k=>({

    key:k.key,
    type:k.type,
    name:k.name||null,

    user:k.username,
    uid:k.user,

    used:k.redeemed,

    left:k.expire===null
      ? null
      : Math.max(0,k.expire-now)

  })));
});

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/dashboard.html"));
});

app.listen(PORT,()=>console.log("🌐 Web Online"));

client.login(TOKEN);
