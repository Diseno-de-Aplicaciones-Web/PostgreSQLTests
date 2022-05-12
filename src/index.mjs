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
    INSERT INTO authors(name) VALUES ($1) RETURNING *
`
const addQuote = `
    INSERT INTO quotes(quote, author_id) VALUES ($1, $2) RETURNING *
`
/**
 * ILIKE is a case insensitive LIKE format provided by Postgre
 * % = group of whatever characters
 * _ = one character wathever
 * El módulo pg de node requiere que concatenemos los comodines
 * en el valor de los parámetros cuando contruimos la consulta
 * en JavaScript
 */
const findAuthorsThatContais = `
    SELECT id, name FROM authors WHERE name ILIKE $1
`
const searchInAuthorQuotes = `
    SELECT quotes.quote
    FROM authors, quotes
    WHERE
        authors.id=$1
    AND
        authors.id=quotes.author_id
    AND
        quotes.quote LIKE $2
`

/**
 * Initialize DB
 */
export const db = new pg.Client(process.env.PGURL)
db.connect()

/**
 * Table creation
 */
 try {
    db.query(createAuthorsTableSQL);
    db.query(createQuotesTableSQL);
} catch (error) {
    console.error("Error trying to create tables")
    throw error
}

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
app.get("/findautor/:searchString", async (req, res)=>{
    try {
        const data = await db.query(
            // Añadimos comodines SQL % para buscar 
            findAuthorsThatContais, [`%${req.params.searchString}%`]
        )
        if (data.rowCount === 0) {
            res.sendStatus(404)
        } else {
            res.json(data.rows)
        }
    } catch (error) {
        console.error(error);
        res.sendStatus(500)
    }
});

/**
 * Create quote AND author
 * Parameters - body:
 *  quote string
 *  author string
 */
app.post("/quoteauthor/", async (req, res)=>{
    try {
        // Create new author
        const newAuthorResponse = await db.query(
            addAuthor,
            [req.body.author]
        );
        // Create new quote for the new author
        const newQuoteResponse = await db.query(
            addQuote,
            [
                req.body.quote,
                newAuthorResponse.rows[0].id
            ]
        );
        res.json({
            author: newAuthorResponse.rows[0],
            quote: newQuoteResponse.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
})

app.get("/search-in-author-quotes/:authorId/:searchString", async (req, res)=>{
    try {
        const { rows } = await db.query(
            searchInAuthorQuotes,
            [
                req.params.authorId,
                `%${req.params.searchString}%`
            ]
        )
        res.json(rows)
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
})

app.listen(process.env.PORT, ()=>console.log("Listening..."));

/**
 * 
 *      EJEMPLOS MANEJO node pg QUERIES
 *      Si no proporcionamos el tercer argumento
 *      con un callback, el método query nos
 *      entrega una promesa.
 * 
 */

/**
 * Usando callbacks
 */
app.post("/newAuthorCallback/", (req, res)=>{
    db.query(
        addAuthor, [req.body.name],
        (err, data)=>{
            if (err) {
                res.sendStatus(500)
                console.error(err);
            }
            else res.json(data.rows[0])
        }
    )
})

/**
 * Usando then/catch
 */
app.post("/newAuthorThenCatch/", (req, res)=>{
    db.query(addAuthor, [req.body.name])
    .then( data => res.json(data.rows[0]))
    .catch( err => {
        res.sendStatus(500)
        console.error(err);
    })
})

/**
 * Usando async/await
 */
app.post("/newAuthorAsyncAwait/", async (req, res)=>{
    try {
        const data = await db.query(addAuthor, [req.body.name])
        res.json(data.rows[0]);
    } catch (error) {
        res.sendStatus(500)
        console.error(error);
    }
})