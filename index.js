const { TwitchChannel } = require("twitch-channel");
const express = require("express");
const app = express();
const channel = "viitoo_0"

const client = new TwitchChannel({
  clientId: "36u4cul3ap893ue26utsafm70fy1f2",
  clientSecret: "100qnv01t9bj1tfhzqyeqe5uw7tqw9",
  channel,
  callbackUrl: "http://localhost:3000",
});

client.applyEventSubMiddleware(app);

client.on("chat", (event) => {
  console.log(`[${event.viewerName}] - ${event.message}`)
});

client.on("sub", (event) => {
  console.log(`[${event.viewerName}] Deu sub tier ${event.tier} com ${event.months} meses com a seguinte mensagem ${event.message}`)
});

client.on("stream-begin", (event) => {
  console.log(`[${channel}] Online - ${event.title}`);
});

client.on("stream-end", () => {
  console.log(`[${channel}] Offline`);
});

client.on("log", (event) => {
  if (event.message.includes("not authorize the client")) return;
  console.log(`[${event.level}] ${event.message}`, event.error);
})

app.listen(3000, () => console.log("Express iniciado"));

client.connect().then(() => console.log("Client conectado"));