'use strict'

const path = require('path')
const express = require('express')
const cors = require('cors')
const nunjucks = require('nunjucks')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const flash = require('connect-flash')
const ua = require('universal-analytics')

const config = require('./config')
const routes = require('./routes')

module.exports.makeApp = function () {
  const app = express()
  const visitor = ua('UA-80458846-4')
  app.set('config', config)
  app.set('port', config.get('app:port'))
  app.set('views', path.join(__dirname, '/views'))

  // Middlewares
  app.use('/static', express.static(path.join(__dirname, '/public')))
  app.use(
    bodyParser.urlencoded({
      extended: true
    })
  )
  app.use(cors())
  app.use(cookieParser())
  app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))
  app.use(flash())
  // Check if looged in and set locals for nunjucks
  app.use((req, res, next) => {
    // Track requested page path as event so we can know how many users are using adblockers:
    visitor.event('Pageviews server-side tracking', req.originalUrl).send()
    // Check if credentials are passed in query params:
    if (req.query.jwt) {
      res.cookie('jwt', req.query.jwt)
      res.cookie('email', req.query.email)
      res.cookie('id', req.query.id)
      res.cookie('username', req.query.username)
      res.locals.login = true
    } else if (req.cookies.jwt) { // Else check if jwt in cookies
      res.locals.login = true
    } else { // Otherwise user is not logged in
      res.locals.login = false
    }
    res.locals.message = req.flash('message')
    next()
  })

  // Redirect x/y/ to x/y
  app.use((req, res, next) => {
    if(req.url.substr(-1) === '/' && req.url.length > 1) {
      res.redirect(301, req.url.slice(0, req.url.length-1))
    }
    else {
      next()
    }
  })

  // Controllers
  app.use([
    routes()
  ])

  app.use((err, req, res, next) => {
    if (err.status === 404 || err.name === 'Forbidden') {
      res.status(404).render('404.html', {
        message: 'Sorry, this page was not found',
        comment: 'You might need to Login to access more datasets'
      })
      return
    } else {
      console.error(err)
      res.status(500).send( 'Something failed. Please, try again later.')
    }
  })

	// eslint-disable-next-line no-unused-vars
  const env = nunjucks.configure(app.get('views'), {
    autoescape: true,
    express: app
  })

  return app
}

module.exports.start = function () {
	// eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    const app = module.exports.makeApp()

    let server = app.listen(app.get('port'), () => {
      console.log('Listening on :' + app.get('port'))
      resolve(server)
    })
    app.shutdown = function () {
      server.close()
      server = null
    }
  })
}

module.exports.start()
