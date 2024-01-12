import express, { json } from 'express' // require -> commonJS
import { createMovieRouter } from './routes/movies.js'
import { corsMiddleware } from './middlewares/cors.js'
import 'dotenv/config'

export const createApp = ({ movieModel }) => {
    const app = express()

    app.use(json())
    app.use(corsMiddleware())
    app.disable('x-powered-by') // deshabilitar el header X-Powered-By: Express 

    // Todos los recursos que sean MOVIES se identifica con /movies
    app.use('/movies', createMovieRouter({ movieModel }))

    const PORT = process.env.PORT ?? 1234
    app.listen(PORT, () => {
        console.log(`Server listening on port http://localhost:${PORT}`)
    })
}

