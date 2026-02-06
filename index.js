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

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

  let out = "";

  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

function generateRealKey() {
  return `SwiftHub-${randomString(5)}-${randomString(5)}`;
}

function generateTempKey(uid) {
  return `${uid.slice(0,8)}-swifthub-${randomString(8)}`;
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
// Helper
// ================================

function userHasActiveKey(db, uid){

  const now = Date.now();

  return db.find(k =>
    k.user === uid &&
    k.redeemed &&
    k.expire > now
  );
}

// ================================
// Discord
// ================================

client.on(Events.InteractionCreate, async (interaction) => {

  // ================= SLASH =================

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()

        .setTitle("🚀 Swift Hub | Key System")

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

        .setColor(0xff3333);

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
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("reset")
          .setLabel("♻ Reset HWID")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        embeds:[embed],
        components:[row]
      });
    }

    // CREATE KEY
    if (interaction.commandName === "createkeybulk") {

      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({content:"❌ Owner Only",ephemeral:true});

      const mode = interaction.options.getString("mode");

      let list = [];
      let db = loadDB();

      let arr = [];

      if(mode==="6") arr=[6];
      else if(mode==="12") arr=[12];
      else if(mode==="24") arr=[24];
      else if(mode==="mix") arr=[6,12,24];
      else return interaction.reply({content:"❌ Invalid",ephemeral:true});

      for(let i=0;i<50;i++){

        let h = arr[Math.floor(Math.random()*arr.length)];

        let k = generateRealKey();

        db.push({

          key:k,
          tempKey:null,

          user:null,
          username:null,

          redeemed:false,

          start:null,
          expire:null,

          hours:h,

          ip:null,
          hwid:null
        });

        list.push(`${k} (${h}h)`);
      }

      saveDB(db);

      interaction.reply({
        content:"```\n"+list.join("\n")+"```",
        ephemeral:true
      });
    }
  }

  // ================= BUTTON =================

  if (interaction.isButton()) {

    let db = loadDB();
    let uid = interaction.user.id;

    // GET KEY
    if (interaction.customId==="getkey") {

      if(userHasActiveKey(db,uid)){
        return interaction.reply({
          content:"❌ You still have active key",
          ephemeral:true
        });
      }

      let temp = generateTempKey(uid);

      db.push({

        key:null,
        tempKey:temp,

        user:uid,
        username:interaction.user.tag,

        redeemed:false,

        start:null,
        expire:null,

        hours:null,

        ip:null,
        hwid:null
      });

      saveDB(db);

      return interaction.reply({
        content:`🔑 Temp Key:\n\`${temp}\``,
        ephemeral:true
      });
    }

    // INFO
    if(interaction.customId==="info"){

      let d = userHasActiveKey(db,uid);

      if(!d) return interaction.reply({content:"❌ No active key",ephemeral:true});

      let left = Math.floor((d.expire-Date.now())/1000);

      let h=Math.floor(left/3600);
      let m=Math.floor(left%3600/60);
      let s=left%60;

      return interaction.reply({
        content:`⏳ ${h}h ${m}m ${s}s`,
        ephemeral:true
      });
    }

    // RESET
    if(interaction.customId==="reset"){

      const modal = new ModalBuilder()
        .setCustomId("reset_modal")
        .setTitle("Reset HWID");

      const input = new TextInputBuilder()
        .setCustomId("rkey")
        .setLabel("Enter Real Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    // REDEEM
    if(interaction.customId==="redeem"){

      if(userHasActiveKey(db,uid)){
        return interaction.reply({
          content:"❌ Wait until key expires",
          ephemeral:true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("redeem_modal")
        .setTitle("Redeem Key");

      const input = new TextInputBuilder()
        .setCustomId("keyinput")
        .setLabel("Temp Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }
  }

  // ================= MODAL =================

  if(interaction.isModalSubmit()){

    let db = loadDB();

    // REDEEM
    if(interaction.customId==="redeem_modal"){

      let temp = interaction.fields.getTextInputValue("keyinput");

      let tempData = db.find(k=>k.tempKey===temp);

      if(!tempData)
        return interaction.reply({content:"❌ Invalid",ephemeral:true});

      let real = db.find(k=>k.key && !k.redeemed);

      if(!real)
        return interaction.reply({content:"❌ No Key",ephemeral:true});

      let now = Date.now();

      real.redeemed=true;
      real.user=interaction.user.id;
      real.username=interaction.user.tag;

      real.start=now;
      real.expire=now+(real.hours*3600000);

      db.splice(db.indexOf(tempData),1);

      saveDB(db);

      return interaction.reply({
        content:`✅ Success\n\`${real.key}\``,
        ephemeral:true
      });
    }

    // RESET
    if(interaction.customId==="reset_modal"){

      let key = interaction.fields.getTextInputValue("rkey");

      let data = db.find(k=>k.key===key && k.user===interaction.user.id);

      if(!data)
        return interaction.reply({content:"❌ Invalid Key",ephemeral:true});

      data.ip=null;
      data.hwid=null;

      saveDB(db);

      return interaction.reply({
        content:"✅ HWID Reset Success",
        ephemeral:true
      });
    }
  }
});

// ================================
// API
// ================================

app.get("/verify",(req,res)=>{

  const {key,ip,hwid}=req.query;

  const db=loadDB();

  const d=db.find(k=>k.key===key);

  if(!d) return res.json({status:"invalid"});
  if(!d.redeemed) return res.json({status:"inactive"});
  if(d.expire<Date.now()) return res.json({status:"expired"});

  // Bind HWID/IP
  if(!d.ip && !d.hwid){
    d.ip=ip;
    d.hwid=hwid;
    saveDB(db);
  }

  if(d.ip!==ip || d.hwid!==hwid)
    return res.json({status:"blocked"});

  return res.json({
    status:"valid",
    left:Math.floor((d.expire-Date.now())/1000)
  });
});

// Dashboard
app.get("/api/dashboard",(req,res)=>{

  const db=loadDB();
  const now=Date.now();

  res.json(db.map(k=>({

    key:k.key,
    user:k.username,
    uid:k.user,

    ip:k.ip,
    hwid:k.hwid,

    used:k.redeemed,

    left:k.expire?Math.max(0,k.expire-now):null

  })));
});

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/dashboard.html"));
});

app.listen(PORT,()=>console.log("🌐 Dashboard Online"));

client.login(TOKEN);
