// start server
require("dotenv/config");
const crypto = require("crypto");
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const { default: axios } = require("axios");

// Notification request headers
const TWITCH_MESSAGE_ID = "Twitch-Eventsub-Message-Id".toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = "Twitch-Eventsub-Message-Timestamp".toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = "Twitch-Eventsub-Message-Signature".toLowerCase();
const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type".toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = "sha256=";

app.use(
	express.raw({
		// Need raw message body for signature verification
		type: "application/json",
	})
);

app.post("/eventsub", async (req, res) => {
	let secret = getSecret();
	let message = getHmacMessage(req);
	let hmac = HMAC_PREFIX + getHmac(secret, message); // Signature to compare

	if (req.headers.host.includes("localhost") || verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
		console.log("signatures match");

		// Get JSON object from body, so you can process the message.
		const notification = JSON.parse(req.body);

		if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {

			const eventType = notification.subscription.type;
			console.log(`Event type: ${eventType}`);
			console.log(JSON.stringify(notification.event, null, 4));

			if (eventType === "stream.online") {
				const streamerNick = notification.event.broadcaster_user_name;
        const startedAt = new Date(notification.event.started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

				await axios
					.post("https://discord.com/api/webhooks/1006028733662117909/effsJFCqhxqRhNWqHk_ZpUEkQPf8znDFg_tRfnmwTsxPret_PPzxsH3oXwHio9kA1Uqo", {
						content: `<@504717946124369937> \`${startedAt}\` \`${now}\`\n**${streamerNick}** está online ! \nhttps://twitch.tv/${streamerNick}`,
					})
					.catch((err) => console.log(err));
			}

			res.sendStatus(204);
		} else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
			res.status(200).send(notification.challenge);
		} else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
			res.sendStatus(204);

			console.log(`${notification.subscription.type} notifications revoked!`);
			console.log(`reason: ${notification.subscription.status}`);
			console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
		} else {
			res.sendStatus(204);
			console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
		}
	} else {
		console.log("403"); // Signatures didn't match.
		res.sendStatus(403);
	}
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

function getSecret() {
	// TODO: Get secret from secure storage. This is the secret you pass
	// when you subscribed to the event.
	return "testeteste";
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
	return request.headers[TWITCH_MESSAGE_ID] + request.headers[TWITCH_MESSAGE_TIMESTAMP] + request.body;
}

// Get the HMAC.
function getHmac(secret, message) {
	return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
	try {
		const verif = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
		return verif;
	} catch (err) {
		console.log(err);
		return false;
	}
}
