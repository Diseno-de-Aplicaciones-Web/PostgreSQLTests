import express from "express";
import pg from "pg";
import { config } from "dotenv";

/**
 * Initilize environment
 */
// Uses .env file environment if service not in production environment
if (process.env.NODE_ENV !== 'production') config();

/**
 * SQL quieries strings
 */
const createQuotesTableSQL = `
    CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        quote TEXT,
        author_id INTEGER,
        FOREIGN KEY (author_id)
            REFERENCES authors(id)
    )
`
const createAuthorsTableSQL = `
    CREATE TABLE IF NOT EXISTS authors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50)
    )
`
const addAuthor = `
    INSERT INTO authors(name) VALUES ($1)
`
const addQuote = `
    INSERT INTO quotes(quote, author_id) VALUES ($1, $2)
`
const getLastId = `
    SELECT lastval()
`
const findAuthorById = `
    SELECT id FROM author WHERE name = $1
`
const findAuthorsThatContais = `
    SELECT id, name FROM authors WHERE name LIKE $1
`

/**
 * Default handler
 */
function defaultHandler (error, data) {
    if (error) throw error;
    console.log(error, data);
}

/**
 * Initialize DB
 */
export const db = new pg.Client(process.env.PGURL)
db.connect()

/**
 * Table creation
 */
db.query(createAuthorsTableSQL, defaultHandler);
db.query(createQuotesTableSQL, defaultHandler);

/**
 * Initialize Express
 */
const app = express();
app.use(express.json());

/**
 * 
 *      ENDPOINTS DEFINITIONS
 * 
 */

/**
 * Get authors containing string
 */
app.get("/findautor/:str", (req, res)=>{
    db.query()
});

/**
 * Create quote AND author
 * Parameters - body:
 *  quote string
 *  author string
 */
app.post("/quoteauthor/",(req, res)=>{
    try {
        db.query(addAuthor, [req.body.author], defaultHandler); // Create new author
        db.query(getLastId,(err, data)=>{ // Request new author id.
            if (err) throw err
            const author_id = parseInt(data.rows[0].lastval); // lastval() provides a string
            db.query(
                addQuote,
                [req.body.quote, author_id],
                defaultHandler
            ); // Create new quote for the new author
        })
        res.sendStatus(201);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
})

app.listen(process.env.PORT);