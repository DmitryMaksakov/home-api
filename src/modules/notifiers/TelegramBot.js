// @flow

import type {INotifier} from "../../interfaces/INotifier";
import type {IObserver} from "../../interfaces/observers/IObserver";

const
  TelegramBotApi = require('node-telegram-bot-api'),
  escape = require('sql-escape'),
  db = require('../db/db');

// Telegram bot intended to unteract with user
class TelegramBot implements INotifier, IObserver {

  // Bot object
  bot;

  // List of subscribers
  subscribers: Array<Function>;

  // Class constructor
  constructor () {
    this.bot = new TelegramBotApi(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

    this.init();
  }

  // Authenticates the user
  static async authUser(id: number): Promise<boolean> {
    try {
      let users = await db.query(`select username from users where telegram_id=${escape(id.toString())}`);

      return users.length > 0;
    } catch (e) {
      return false;
    }
  }

  // Wrapper factory that adds authentication check
  authUserWrapperFactory(func: Function): Function {
    return async msg => {
      if (await TelegramBot.authUser(msg.from.id)) {
        await func(msg);
      } else {
        await this.bot.sendMessage(msg.chat.id, 'Sorry, you are not in access list. Please, contact with your system administrator.');
      }
    }
  }

  // Initialization method
  init(): void {
    const self = this;

    self.subscribers = [];

    // Subscribing on Start text message from user
    self.bot.onText(/\/start/, this.authUserWrapperFactory(async msg => {
      try {
        await db.query(`update users set telegram_chat_id=${escape(msg.chat.id.toString())} where telegram_id=${escape(msg.from.id.toString())}`);
        await this.bot.sendMessage(msg.chat.id, 'Welcome!');
      } catch (e) {
        await this.bot.sendMessage(msg.chat.id, 'Sorry, something went wrong.');
      }
    }));

    // Subscribing on text messages from user
    self.bot.on('message', this.authUserWrapperFactory(async msg => {
      self.subscribers.forEach(s => s(msg));
    }));
  }

  // Sends message to all users
  async sendBroadcast(message: string): Promise<void> {
    try {
      let users = await db.query(`select username, telegram_chat_id from users`);

      users.forEach(async user => await this.bot.sendMessage(user.telegram_chat_id, message));
    } catch (e) {
      console.log(e);
    }
  }

  // Notify subscribers
  onData(func: Function): void {
    this.subscribers.push(func);
  }
}

module.exports = TelegramBot;