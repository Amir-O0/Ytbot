const express = require("express");
const port = 3948;

const app = express();

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const TelegramBot = require("node-telegram-bot-api");
const ytdl = require("ytdl-core");
const fs = require("fs");

require("dotenv").config();

// Replace YOUR_BOT_TOKEN with your actual bot token
const token = "6029156425:AAF17qBdzWbrgFiC_9VCZH7XPC8CX-TOJlM";

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Function to download a YouTube video and send it as a video file
async function downloadVideo(chatId, url) {
  try {
    // Get video information and thumbnail URL
    const videoInfo = await ytdl.getInfo(url);
    const title = videoInfo.player_response.videoDetails.title;
    const thumbnailUrl =
      videoInfo.videoDetails.thumbnails[
        videoInfo.videoDetails.thumbnails.length - 1
      ].url;
    // Send a message to show the download progress
    const message = await bot.sendMessage(
      chatId,
      `*Downloading video:* \n ${title}`
    );

    // Create a writable stream to store the video file
    const writeStream = fs.createWriteStream(`${title}-${chatId}.mp4`);

    // Start the download and pipe the video data to the writable stream
    ytdl(url, { filter: "audioandvideo" }).pipe(writeStream);

    // Set up an interval to update the message with the download progress every 5 seconds
    let progress = 0;
    const updateInterval = setInterval(() => {
      var currentdate = new Date();
      var datetime =
        currentdate.getFullYear() +
        "/" +
        currentdate.getMonth() +
        "/" +
        currentdate.getDay() +
        " \n " +
        currentdate.getHours() +
        ":" +
        currentdate.getMinutes() +
        ":" +
        currentdate.getSeconds();

      progress = writeStream.bytesWritten / (1024 * 1024);
      bot.editMessageText(
        ` ${datetime} \n *Downloading video:* \n ${title} \n (${progress.toFixed(
          2
        )} MB) \u{1F4E6}`,
        {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: "Markdown", // use Markdown formatting
        }
      );
    }, 500);

    // When the download is complete, send the video and delete the file
    writeStream.on("finish", () => {
      clearInterval(updateInterval); // stop updating the message
      bot
        .sendVideo(chatId, `${title}-${chatId}.mp4`, {
          caption: `*Video downloaded:* \n ${title}`,
          thumb: thumbnailUrl,
          duration: videoInfo.videoDetails.lengthSeconds,
          parse_mode: "Markdown",
        })

        .then(() => {
          fs.unlinkSync(`${title}-${chatId}.mp4`); // delete the file
        })
        .catch((error) => {
          bot.sendMessage(chatId, "Error sending video.");
          console.error(error);
        });
    });
  } catch (error) {
    bot.sendMessage(chatId, "Error downloading video.");
    console.error(error);
  }
}

// Listen for the /yt command
bot.onText(/\/yt/, (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text.split(" ")[1];

  if (ytdl.validateURL(url)) {
    downloadVideo(chatId, url);
  } else {
    bot.sendMessage(chatId, "Invalid YouTube URL.");
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Send a message with the introduction and instructions
  bot.sendMessage(
    chatId,
    `Hey, I am AmiroBot made by @Amiro_im . Use the following commands to use me!
    /yt - Give any youtube link and AmiroBot will download it for you.`
  );
});

