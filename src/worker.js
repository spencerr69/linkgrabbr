/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono';

const ARTIST = 'Spencer Raymond';

// let process = {};

// process.env = {
// 	SPOTIFY_CLIENT_ID: '05d7147e20004ce082233ebb9f2597d6',
// 	SPOTIFY_SECRET: 'da65aa850d5b4fd8a7f39b6cbb99fc37',
// 	TIDAL_CLIENT_ID: '9qkNDbW9CQhJcVvI',
// 	TIDAL_SECRET: 'SJyoqEY1Gl0ZjXDLkvGPFafJRztdIcIfTropsUdrSlQ=',
// 	YOUTUBE_API_KEY: 'AIzaSyC9VD_CtVMvarOVJU66nrChMT_ogo0WHjM',
// };

const app = new Hono();

app.get('/test', (c) => {
	return c.text("g'day!");
});

app.post('/linkgrabbr', async (c) => {
	let { id, upc } = await c.req.json();
	if (id == 'links.spotify') {
		const token = await getSpotifyAccessToken();
		const link = await getSpotifyLink(token, upc);
		return c.json({ link: link });
		// await getSpotifyAccessToken()
		// 	.then((token) => {
		// 		console.log(token);
		// 		getSpotifyLink(token, upc).then((link) => {
		// 			return c.json({ link: link });
		// 		});
		// 	})
		// 	.catch((error) => console.error(error));
	} else if (id == 'links.tidal') {
		const token = await getTidalAccessToken();
		const link = await getTidalLink(token, upc);
		return c.json({ link });
		// await getTidalAccessToken()
		// 	.then((token) =>
		// 		getTidalLink(token, upc).then((link) => {
		// 			return c.json({ link });
		// 		})
		// 	)
		// 	.catch((error) => console.error(error));
	} else if (id == 'links.appleMusic') {
		// const token = await getTidalAccessToken();
		const link = await getAppleMusicLink(upc);
		return c.json({ link });
	}
	// return c.text(`id: ${id}, upc: ${upc}`);
});

//API Authorisation calls

const getSpotifyAccessToken = async () => {
	return await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `grant_type=client_credentials&client_id=${env.SPOTIFY_CLIENT_ID}&client_secret=${env.SPOTIFY_SECRET}`,
	})
		.then((res) => res.json())
		.then((data) => {
			console.log('ST', data);
			return `${data.token_type} ${data.access_token}`;
		});
};

const getTidalAccessToken = async () => {
	return await fetch('https://auth.tidal.com/v1/oauth2/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${btoa(`${env.TIDAL_CLIENT_ID}:${env.TIDAL_SECRET}`)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `grant_type=client_credentials`,
	})
		.then((res) => res.json())
		.then((data) => {
			console.log('TT', data);
			return `${data.token_type} ${data.access_token}`;
		});
};

//API URL fetch calls

const getSpotifyLink = async (token, upc) => {
	// console.log('getSpotifyLinkcalled');
	return await fetch(`https://api.spotify.com/v1/search?q=upc%3A${upc}&type=album&limit=1`, {
		headers: { Authorization: token },
	})
		.then((res) => {
			console.log('RESPONSE:', res);
			return res.json();
		})
		.then((data) => {
			console.log(data);
			return data.albums.items[0].external_urls.spotify;
		})
		.catch((err) => console.log('failed on fetch: ', err));
};

const getAppleMusicLink = async (upc) => {
	return await fetch(`https://itunes.apple.com/lookup?upc=${upc}`)
		.then((res) => res.json())
		.then((data) => {
			// console.log(data);
			return data.results[0].collectionViewUrl;
		});
};

const getTidalLink = async (token, upc) => {
	return await fetch(`https://openapi.tidal.com/v2/albums?countryCode=US&filter%5BbarcodeId%5D=${upc}`, {
		headers: { Authorization: token, accept: 'application/vnd.api+json' },
	})
		.then((res) => {
			// console.log(res);
			return res.json();
		})
		.then((data) => {
			// console.log(data);
			return data.data[0].attributes.externalLinks[0].href;
		})
		.catch((err) => console.log('failed on fetch: ', err));
};

export default app;
