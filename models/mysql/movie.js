import mysql from 'mysql2/promise'

const DEFAULT_CONFIG = {
    host: 'localhost',
    user: 'root',
    port: 3306,
    password: 'Ultron021122*',
    database: 'moviesdb',
}

const connectionString = process.env.DATABASE_URL ?? DEFAULT_CONFIG
const connection = await mysql.createConnection(connectionString)

export class MovieModel {
    static async getAll({ genre }) {
        if (genre) {
            const [genres] = await connection.query(
                "SELECT id, name FROM genre WHERE name = ?;", [genre]
            )

            if (genres.length === 0) return [];

            const [{ id }] = genres;
            const [moviesByGenre] = await connection.query(
                "SELECT BIN_TO_UUID(m.id) AS id, m.title, m.year, m.director, m.duration, m.poster, m.rate FROM movies AS m INNER JOIN movie_genre AS mg ON m.id = mg.movie_id WHERE mg.genre_id = ?;",
                [id]
            );
            return moviesByGenre;
        }
        const [allMovies] = await connection.query(
            'SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movies;'
        );
        return allMovies;
    }

    static async getById({ id }) {
        const [movies] = await connection.query(
            'SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movies WHERE BIN_TO_UUID(id) = ?;',
            [id]
        );
        if (movies.length === 0) return null
        return movies[0];
    }

    static async create({ input }) {
        try {
            const {
                genre: genreInput,
                title,
                year,
                duration,
                director,
                rate,
                poster
            } = input

            const [result] = await connection.query(
                'SELECT id FROM genre WHERE name IN (?);',
                [genreInput]
            )

            const [uuidResult] = await connection.query('SELECT UUID() uuid;')
            const [{ uuid }] = uuidResult

            await connection.query(
                'INSERT INTO movies (id, title, year, director, duration, poster, rate) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?);',
                [uuid, title, year, director, duration, poster, rate]
            )

            for (const genre_id of result) {
                await connection.query(
                    'INSERT INTO movie_genre (movie_id, genre_id) VALUES (UUID_TO_BIN(?), ?);',
                    [uuid, genre_id.id]
                )
            }
            // Retornamos el elemento al controller
            return { id: uuid, title, year, director, duration, poster, rate };
        } catch (error) {
            throw new Error(`Error creating movie: ${error.message}`)
        }
    }

    static async delete({ id }) {
        try {
            const [movie] = await connection.query(
                'DELETE FROM movies WHERE BIN_TO_UUID(id) = ?;',
                [id]
            )

            if (movie.affectedRows > 0) {
                await connection.query(
                    'DELETE FROM movie_genre WHERE BIN_TO_UUID(movie_id) = ?;',
                    [id]
                )
                return true
            }
            return false

        } catch (error) {
            throw new Error(`Error deleting movie: ${error.message}`);
        }
    }

    static async update({ id, input }) {
        try {
            const {
                genre: genreInput,
                title,
                year,
                duration,
                director,
                rate,
                poster
            } = input;

            const [movie] = await connection.query(
                'SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movies WHERE BIN_TO_UUID(id) = ?;',
                [id]
            );

            if (movie.length === 0) return false;

            const updateColumns = Object.entries({
                title,
                year,
                duration,
                director,
                rate,
                poster
            })
                .filter(([key, value]) => value !== undefined)
                .map(([key, value]) => `${key} = ?`)
                .join(', ');

            const updateValues = Object.values({
                title,
                year,
                duration,
                director,
                rate,
                poster
            })
                .filter(value => value !== undefined);

            await connection.query(
                `UPDATE movies SET ${updateColumns} WHERE BIN_TO_UUID(id) = ?;`,
                [...updateValues, id]
            );

            // Actualizar la tabla de géneros
            if (genreInput) {
                await connection.query(
                    'DELETE FROM movie_genre WHERE BIN_TO_UUID(movie_id) = ?;',
                    [id]
                )
                const [result] = await connection.query(
                    'SELECT id FROM genre WHERE name IN (?);',
                    [genreInput]
                )
                for (const genre_id of result) {
                    await connection.query(
                        'INSERT INTO movie_genre (movie_id, genre_id) VALUES (UUID_TO_BIN(?), ?);',
                        [id, genre_id.id]
                    )
                }
            }

            return this.getById({id});
        } catch (error) {
            throw new Error(`Error updating movie: ${error.message}`);
        }
    }

}