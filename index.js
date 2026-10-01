/**
   DEV BY @Varnox_Or_novark
   MY OPTIMUS SHALL COME BACK
*/
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const { startupPassword } = require('./token');

const AUTH_FILE = './richstore/auth.json';
const startpairing = require('./pair');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initializeBot = async () => {
  // In Railway/CI environment, skip password prompt
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' || process.env.SKIP_PASSWORD === 'true') {
    console.log(chalk.green('✅ Production environment detected. Launching bot directly...'));
    setAuthenticated(true);
    launchBot();
    return;
  }

  if (isAuthenticated()) {
    console.log(chalk.green('✅ Welcome back! Skipping password...'));
    launchBot();
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.stdoutMuted = true;
    console.log(chalk.bold.yellow('┌─────────────────────────────────┐'));
    console.log(chalk.bold.yellow('│   𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 v2.0.5       │'));
    console.log(chalk.bold.yellow('│   Enter password to start bot │'));
    console.log(chalk.bold.yellow('└─────────────────────────────────┘'));

    rl.question(chalk.green('🔑 Password: '), function (input) {
      if (input !== startupPassword) {
        console.log(chalk.red('\n❌ Incorrect password. Exiting...'));
        process.exit(1);
      }
      console.log(chalk.green('\n✅ Password correct. Booting 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔...'));
      setAuthenticated(true);
      rl.close();
      launchBot();
    });

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write('*');
      else rl.output.write(stringToWrite);
    };
  }
};

function isAuthenticated() {
  try {
    return fs.existsSync(AUTH_FILE) && JSON.parse(fs.readFileSync(AUTH_FILE)).authenticated;
  } catch {
    return false;
  }
}

function setAuthenticated(value) {
  const dir = './richstore';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ authenticated: value }));
}

function launchBot() {
  console.clear();
  console.log(chalk.bold.cyan('╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 ɪs ʟᴀᴜɴᴄʜɪɴɢ...   ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════╝'));

  require('./bot');
  require('./server');

  console.log(chalk.bold.green('✅ 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 ɪs ᴄᴏɴɴᴇᴄᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ!'));

  const ignoredErrors = [
    'Socket connection timeout',
    'EKEYTYPE',
    'item-not-found',
    'rate-overlimit',
    'Connection Closed',
    'Timed Out',
    'Value not found',
  ];

  process.on('unhandledRejection', (reason) => {
    if (ignoredErrors.some((e) => String(reason).includes(e))) return;
    console.log('Unhandled Rejection: ', reason);
  });

  const originalConsoleError = console.error;
  console.error = function (message, ...optionalParams) {
    if (typeof message === 'string' && ignoredErrors.some((e) => message.includes(e))) return;
    originalConsoleError.apply(console, [message, ...optionalParams]);
  };

  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function (message, encoding, fd) {
    if (typeof message === 'string' && ignoredErrors.some((e) => message.includes(e))) return;
    originalStderrWrite.apply(process.stderr, arguments);
  };
}

initializeBot().catch(console.error);
