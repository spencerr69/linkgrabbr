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

const FREQ_CUTOFF = 0.5;

const app = new Hono();

app.get('/test', (c) => {
	return c.text("g'day!");
});

app.post('/linkgrabbr', async (c) => {
	let { id, upc } = await c.req.json();
	if (id == 'links.spotify') {
		const token = await getSpotifyAccessToken(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_SECRET);
		const link = await getSpotifyLink(token, upc);
		return c.json({ link: link });
	} else if (id == 'links.tidal') {
		const token = await getTidalAccessToken(c.env.TIDAL_CLIENT_ID, c.env.TIDAL_SECRET);
		const link = await getTidalLink(token, upc);
		return c.json({ link });
	} else if (id == 'links.appleMusic') {
		// const token = await getTidalAccessToken();
		const link = await getAppleMusicLink(upc);
		return c.json({ link });
	}
	// return c.text(`id: ${id}, upc: ${upc}`);
});

//API Authorisation calls

const getSpotifyAccessToken = async (clientId, secret) => {
	return await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${secret}`,
	})
		.then((res) => res.json())
		.then((data) => {
			console.log('ST', data);
			return `${data.token_type} ${data.access_token}`;
		});
};

const getTidalAccessToken = async (clientId, secret) => {
	return await fetch('https://auth.tidal.com/v1/oauth2/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
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

//RHYMR

app.post('/rhymr', async (c) => {
	let { word } = await c.req.json();
	console.log(word);
	const rhymes = await fetch(`https://api.datamuse.com/words?sl=${word}&md=f&max=700`);
	/*
		rhymes type
		[{word, score, numSyllables, tags: ["f:1"]}]
	*/
	const rawRhymes = await rhymes.json();

	const processedRhymes = rawRhymes
		.slice(1)
		.map((rhyme) => {
			return { word: rhyme.word, score: rhyme.score, syl: rhyme.numSyllables, freq: rhyme.tags[0].split(':')[1] };
		})
		.filter((rhyme) => rhyme.freq > FREQ_CUTOFF);

	processedRhymes.sort((a, b) => a.word.localeCompare(b.word));

	processedRhymes.sort((a, b) => b.score - a.score);
	// processedRhymes.sort((a, b) => b.freq - a.freq);
	processedRhymes.sort((a, b) => a.syl - b.syl);

	return c.json(processedRhymes);
});

export default app;
