/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// export default {
// 	async fetch(request, env, ctx) {
// 		return new Response('Hello World!');
// 	},
// };
import { Hono } from 'hono'
import { cors } from 'hono/cors'
const app = new Hono()
app.use('*', cors()) // Allow all origins

app.get('/', (c) => c.text('Hello Cloudflare Workers!'))


app.get('/getUser', async (c) => {
	const { DB } = c.env;
	
	if (!DB) {
		return c.text('Database not configured', 500)
	}
  
	try {
		const result = await DB.prepare('SELECT * FROM users').all();
		return c.json(JSON.stringify(result));
	} catch (error) {
		return c.text(error.message, 500)
	}
});

app.post('/register', async (c) => {
	const { DB } = c.env;
	const { username, email, password } = await c.req.json();

	if (!DB) {
		return c.text('Database not configured', 500);
	}

	if (!username || !email || !password) {
		return c.text('All fields (username, email, password) are required', 400);
	}

	try {
		// Check if username or email already exists
		const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
		const existingUser = await DB.prepare(checkQuery).bind(username, email).first();

		if (existingUser) {
			return c.text('Username or email already taken', 400);
		}

		// Insert new user
		const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
		await DB.prepare(insertQuery).bind(username, email, password).run();

		return c.text('Account created successfully', 201);
	} catch (error) {
		return c.text(error.message, 500);
	}
});



app.post('/login', async (c) => {
	const { DB } = c.env;
	const username = c.req.query('username');
	const password = c.req.query('password');

	if (!DB) {
		return c.text('Database not configured', 500);
	}

	if (!username || !password) {
		return c.text('Username and password are required', 400);
	}

	try {
		const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
		const user = await DB.prepare(query).bind(username, password).first();

		if (!user) {
			return c.text('Invalid credentials', 401);
		}

		return c.text(`Login successful. Welcome ${user.username}`);
	} catch (error) {
		return c.text(error.message, 500);
	}
});

app.post('/syncGameState', async (c) => {
  const { DB } = c.env;
  const { userId, gameState } = await c.req.json();

  if (!DB) {
    return c.text('Database not configured', 500);
  }

  if (!userId || !gameState) {
    return c.text('User ID and game state are required', 400);
  }

  try {
    const query = 'UPDATE users SET gameState = ? WHERE id = ?';
    await DB.prepare(query).bind(JSON.stringify(gameState), userId).run();

    return c.text('Game state synced successfully', 200);
  } catch (error) {
    return c.text(error.message, 500);
  }
});

export default app